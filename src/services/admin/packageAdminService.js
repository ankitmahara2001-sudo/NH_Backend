import { Op } from 'sequelize';
import { AppError } from '../../lib/AppError.js';
import { destroyImages } from '../../lib/cloudinary.js';
import { sequelize } from '../../lib/db.js';
import {
  Booking,
  Destination,
  ItineraryDay,
  Package,
  PackageBlockedDate,
  PackageDeparture,
  PackageFaq,
  PackageHighlight,
  PackageHotel,
  PackageImage,
  PackageInclusion,
  PackagePrice,
} from '../../models/index.js';
import { pickDisplayPrice } from '../../serializers/packageSerializer.js';

// Admin-side package management. Each package-form tab saves through its own function,
// in one transaction (CLAUDE.md section 6).

const BOOKINGS_COUNT = [
  sequelize.literal(`(SELECT COUNT(*)::int FROM bookings b WHERE b.package_id = "Package"."id")`),
  'bookingsCount',
];

const CHILD_LISTS = [
  'prices',
  'departures',
  'blockedDates',
  'itineraryDays',
  'inclusions',
  'highlights',
  'hotels',
  'faqs',
  'images',
];

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder || a.id - b.id;
const toBoolean = (value) => (value === undefined ? undefined : value === 'true' || value === true);

// ---- Images ---------------------------------------------------------------------------

/**
 * Deletes Cloudinary images that no package cover, gallery photo or hotel uses any more.
 * (Duplicated packages share images, so a reference check is needed before deleting.)
 */
async function destroyUnreferencedImages(publicIds) {
  const candidates = [...new Set(publicIds.filter(Boolean))];
  if (!candidates.length) return;
  const where = { [Op.in]: candidates };
  const [covers, photos, hotels] = await Promise.all([
    Package.findAll({ where: { coverImagePublicId: where }, attributes: ['coverImagePublicId'] }),
    PackageImage.findAll({ where: { publicId: where }, attributes: ['publicId'] }),
    PackageHotel.findAll({ where: { imagePublicId: where }, attributes: ['imagePublicId'] }),
  ]);
  const stillUsed = new Set([
    ...covers.map((r) => r.coverImagePublicId),
    ...photos.map((r) => r.publicId),
    ...hotels.map((r) => r.imagePublicId),
  ]);
  await destroyImages(candidates.filter((id) => !stillUsed.has(id)));
}

// ---- Read -----------------------------------------------------------------------------

async function findPackageOrFail(id, options = {}) {
  const pkg = await Package.findByPk(id, options);
  if (!pkg) throw AppError.notFound('Package not found.');
  return pkg;
}

/** GET /admin/packages — every package (active or not) with filters, in display order. */
export async function listPackagesAdmin(query) {
  const where = {};
  if (query.search) where.title = { [Op.iLike]: `%${query.search}%` };
  if (query.destinationId) where.destinationId = query.destinationId;
  if (query.tripType) where.tripType = query.tripType;
  if (query.availabilityType) where.availabilityType = query.availabilityType;
  for (const flag of ['isActive', 'isFeatured', 'isPopular']) {
    const value = toBoolean(query[flag]);
    if (value !== undefined) where[flag] = value;
  }

  const rows = await Package.findAll({
    where,
    attributes: { include: [BOOKINGS_COUNT] },
    include: [
      { model: Destination, as: 'destination', attributes: ['id', 'name'] },
      { model: PackagePrice, as: 'prices', separate: true },
    ],
    order: [
      ['sortOrder', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  return rows.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    slug: pkg.slug,
    tripType: pkg.tripType,
    availabilityType: pkg.availabilityType,
    destination: pkg.destination,
    durationDays: pkg.durationDays,
    durationNights: pkg.durationNights,
    coverImageUrl: pkg.coverImageUrl,
    isActive: pkg.isActive,
    isFeatured: pkg.isFeatured,
    isPopular: pkg.isPopular,
    sortOrder: pkg.sortOrder,
    price: pickDisplayPrice(pkg.prices),
    bookingsCount: Number(pkg.get('bookingsCount')),
  }));
}

/** GET /admin/packages/:id — the package with every child list, for the package form. */
export async function getPackageAdmin(id) {
  const pkg = await findPackageOrFail(id, {
    attributes: { include: [BOOKINGS_COUNT] },
    include: CHILD_LISTS.map((as) => ({ association: as, separate: true })),
  });
  const plain = pkg.get({ plain: true });
  return {
    ...plain,
    bookingsCount: Number(plain.bookingsCount),
    prices: plain.prices.sort(bySortOrder),
    departures: plain.departures.sort((a, b) => a.startDate.localeCompare(b.startDate)),
    blockedDates: plain.blockedDates.sort((a, b) => a.startDate.localeCompare(b.startDate)),
    itineraryDays: plain.itineraryDays.sort((a, b) => a.dayNumber - b.dayNumber),
    inclusions: plain.inclusions.sort(bySortOrder),
    highlights: plain.highlights.sort(bySortOrder),
    hotels: plain.hotels.sort(bySortOrder),
    faqs: plain.faqs.sort(bySortOrder),
    images: plain.images.sort(bySortOrder),
  };
}

// ---- Details, flags, order -----------------------------------------------------------------

export async function createPackage(details) {
  const last = (await Package.max('sortOrder')) ?? 0;
  const pkg = await Package.create({ ...details, sortOrder: details.sortOrder || last + 1 });
  return getPackageAdmin(pkg.id);
}

export async function updatePackageDetails(id, details) {
  const pkg = await findPackageOrFail(id);
  const previousCover = pkg.coverImagePublicId;
  await pkg.update(details);
  if (previousCover && previousCover !== pkg.coverImagePublicId)
    await destroyUnreferencedImages([previousCover]);
  return getPackageAdmin(id);
}

export async function updatePackageFlags(id, flags) {
  const pkg = await findPackageOrFail(id);
  await pkg.update(flags);
  return { id: pkg.id, isActive: pkg.isActive, isFeatured: pkg.isFeatured, isPopular: pkg.isPopular };
}

export async function reorderPackages(ids) {
  await sequelize.transaction(async (transaction) => {
    for (const [index, id] of ids.entries()) {
      await Package.update({ sortOrder: index + 1 }, { where: { id }, transaction });
    }
  });
}

/** Packages with bookings are never deleted (CLAUDE.md): they must be deactivated instead. */
export async function deletePackage(id) {
  const pkg = await findPackageOrFail(id, {
    include: ['images', 'hotels'].map((as) => ({ association: as, separate: true })),
  });
  if (await Booking.count({ where: { packageId: id } })) {
    throw AppError.conflict('This package has bookings, so it cannot be deleted. Deactivate it instead.');
  }
  const images = [
    pkg.coverImagePublicId,
    ...pkg.images.map((i) => i.publicId),
    ...pkg.hotels.map((h) => h.imagePublicId),
  ];
  await pkg.destroy();
  await destroyUnreferencedImages(images);
}

async function uniqueSlug(base) {
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? `${base}-copy` : `${base}-copy-${n}`;
    if (!(await Package.count({ where: { slug } }))) return slug;
  }
}

const OMIT_ON_COPY = ['id', 'packageId', 'createdAt', 'updatedAt'];
const copyRow = (row, overrides = {}) => {
  const plain = row.get({ plain: true });
  for (const key of OMIT_ON_COPY) delete plain[key];
  return { ...plain, ...overrides };
};

/** Copies a package with every child list. The copy starts inactive with no booked seats. */
export async function duplicatePackage(id) {
  const source = await findPackageOrFail(id, {
    include: CHILD_LISTS.map((as) => ({ association: as, separate: true })),
  });
  const copyId = await sequelize.transaction(async (transaction) => {
    const options = { transaction };
    const last = (await Package.max('sortOrder', options)) ?? 0;
    const copy = await Package.create(
      copyRow(source, {
        title: `${source.title} (copy)`,
        slug: await uniqueSlug(source.slug),
        isActive: false,
        isFeatured: false,
        isPopular: false,
        sortOrder: last + 1,
      }),
      options,
    );
    const children = [
      [PackagePrice, source.prices],
      [PackageDeparture, source.departures.map((d) => Object.assign(d, { bookedSeats: 0 }))],
      [PackageBlockedDate, source.blockedDates],
      [ItineraryDay, source.itineraryDays],
      [PackageInclusion, source.inclusions],
      [PackageHighlight, source.highlights],
      [PackageHotel, source.hotels],
      [PackageFaq, source.faqs],
      [PackageImage, source.images],
    ];
    for (const [model, rows] of children) {
      await model.bulkCreate(
        rows.map((row) => copyRow(row, { packageId: copy.id })),
        options,
      );
    }
    return copy.id;
  });
  return getPackageAdmin(copyId);
}

// ---- Tabs that replace a whole list ------------------------------------------------------

async function replaceList(packageId, model, rows) {
  await findPackageOrFail(packageId);
  await sequelize.transaction(async (transaction) => {
    await model.destroy({ where: { packageId }, transaction });
    await model.bulkCreate(
      rows.map((row, index) => ({ ...row, packageId, sortOrder: index + 1 })),
      { transaction },
    );
  });
}

export async function replaceItinerary(packageId, { days }) {
  await findPackageOrFail(packageId);
  await sequelize.transaction(async (transaction) => {
    await ItineraryDay.destroy({ where: { packageId }, transaction });
    // Day numbers follow the order on screen, so drag-to-reorder renumbers the days.
    await ItineraryDay.bulkCreate(
      days.map((day, index) => ({ ...day, dayNumber: index + 1, packageId })),
      { transaction },
    );
  });
  return getPackageAdmin(packageId);
}

export async function replaceInclusions(packageId, { items }) {
  await replaceList(packageId, PackageInclusion, items);
  return getPackageAdmin(packageId);
}

export async function replaceHighlights(packageId, { items }) {
  await replaceList(packageId, PackageHighlight, items);
  return getPackageAdmin(packageId);
}

export async function replaceFaqs(packageId, { items }) {
  await replaceList(packageId, PackageFaq, items);
  return getPackageAdmin(packageId);
}

export async function replaceHotels(packageId, { items }) {
  const before = await PackageHotel.findAll({ where: { packageId }, attributes: ['imagePublicId'] });
  await replaceList(packageId, PackageHotel, items);
  await destroyUnreferencedImages(before.map((h) => h.imagePublicId));
  return getPackageAdmin(packageId);
}

export async function replaceBlockedDates(packageId, { blockedDates }) {
  await findPackageOrFail(packageId);
  await sequelize.transaction(async (transaction) => {
    await PackageBlockedDate.destroy({ where: { packageId }, transaction });
    await PackageBlockedDate.bulkCreate(
      blockedDates.map(({ startDate, endDate, reason }) => ({ packageId, startDate, endDate, reason })),
      { transaction },
    );
  });
  return getPackageAdmin(packageId);
}

// ---- Tabs that keep row ids (rows referenced by bookings) ----------------------------------

/** Prices: rows keep their id (bookings point at them). Exactly one option is the default. */
export async function replacePrices(packageId, { prices }) {
  await findPackageOrFail(packageId);
  const defaultIndex = Math.max(
    0,
    prices.findIndex((p) => p.isDefault),
  );
  await sequelize.transaction(async (transaction) => {
    const keepIds = prices.map((p) => p.id).filter(Boolean);
    await PackagePrice.destroy({
      where: { packageId, id: { [Op.notIn]: keepIds.length ? keepIds : [0] } },
      transaction,
    });
    for (const [index, { id, ...price }] of prices.entries()) {
      const values = { ...price, isDefault: index === defaultIndex, sortOrder: index + 1, packageId };
      if (id) {
        const [updated] = await PackagePrice.update(values, { where: { id, packageId }, transaction });
        if (!updated) throw AppError.badRequest('A price option does not belong to this package.');
      } else {
        await PackagePrice.create(values, { transaction });
      }
    }
  });
  return getPackageAdmin(packageId);
}

/**
 * Departures: rows keep their id and booked seats. A departure with booked seats cannot be removed,
 * and its total seats cannot go below the seats already booked.
 */
export async function replaceDepartures(packageId, { departures }) {
  await findPackageOrFail(packageId);
  await sequelize.transaction(async (transaction) => {
    const existing = await PackageDeparture.findAll({
      where: { packageId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const byId = new Map(existing.map((d) => [d.id, d]));
    const keepIds = new Set(departures.map((d) => d.id).filter(Boolean));

    for (const departure of existing) {
      if (keepIds.has(departure.id)) continue;
      if (
        departure.bookedSeats > 0 ||
        (await Booking.count({ where: { departureId: departure.id }, transaction }))
      ) {
        throw AppError.conflict(
          `The departure on ${departure.startDate} has bookings. Deactivate it instead of removing it.`,
        );
      }
      await departure.destroy({ transaction });
    }

    for (const [index, { id, startDate, totalSeats, isActive }] of departures.entries()) {
      const current = id ? byId.get(id) : null;
      if (id && !current) throw AppError.badRequest('A departure does not belong to this package.');
      const booked = current?.bookedSeats ?? 0;
      if (totalSeats != null && totalSeats < booked) {
        throw AppError.badRequest(`Total seats cannot be lower than the ${booked} seats already booked.`, {
          [`departures.${index}.totalSeats`]: `At least ${booked} (already booked).`,
        });
      }
      if (current) await current.update({ startDate, totalSeats, isActive }, { transaction });
      else await PackageDeparture.create({ packageId, startDate, totalSeats, isActive }, { transaction });
    }
  });
  return getPackageAdmin(packageId);
}

// ---- Gallery images --------------------------------------------------------------------------

export async function addPackageImages(packageId, { images }) {
  await findPackageOrFail(packageId);
  const last = (await PackageImage.max('sortOrder', { where: { packageId } })) ?? 0;
  await PackageImage.bulkCreate(images.map((image, i) => ({ ...image, packageId, sortOrder: last + i + 1 })));
  return getPackageAdmin(packageId);
}

export async function reorderPackageImages(packageId, ids) {
  await sequelize.transaction(async (transaction) => {
    for (const [index, id] of ids.entries()) {
      await PackageImage.update({ sortOrder: index + 1 }, { where: { id, packageId }, transaction });
    }
  });
  return getPackageAdmin(packageId);
}

async function findImageOrFail(packageId, imageId) {
  const image = await PackageImage.findOne({ where: { id: imageId, packageId } });
  if (!image) throw AppError.notFound('Photo not found.');
  return image;
}

export async function updatePackageImage(packageId, imageId, { altText }) {
  const image = await findImageOrFail(packageId, imageId);
  await image.update({ altText });
  return getPackageAdmin(packageId);
}

export async function deletePackageImage(packageId, imageId) {
  const image = await findImageOrFail(packageId, imageId);
  await image.destroy();
  await destroyUnreferencedImages([image.publicId]);
  return getPackageAdmin(packageId);
}
