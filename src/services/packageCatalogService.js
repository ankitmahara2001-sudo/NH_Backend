import { Op } from 'sequelize';
import { AppError } from '../lib/AppError.js';
import { addDays, maxDate, monthRange, todayIst } from '../lib/dates.js';
import { sequelize } from '../lib/db.js';
import { paginationMeta, toLimitOffset } from '../lib/pagination.js';
import {
  Destination,
  Package,
  PackageBlockedDate,
  PackageDeparture,
  PackageHighlight,
  PackagePrice,
  Review,
} from '../models/index.js';
import {
  serializeDeparture,
  serializePackageCard,
  serializePackageDetail,
} from '../serializers/packageSerializer.js';
import { serializeReview } from '../serializers/contentSerializer.js';
import { getPricingSettings } from './settingsService.js';

// Read-only package queries for the public website. Only active packages are ever returned.

/** Selling price of the option shown on cards (default option first, then sort order). */
const DISPLAY_PRICE_SQL = `(SELECT COALESCE(pp.discounted_price, pp.original_price) FROM package_prices pp
  WHERE pp.package_id = "Package"."id" ORDER BY pp.is_default DESC, pp.sort_order ASC, pp.id ASC LIMIT 1)`;

const RATING_ATTRIBUTES = [
  [
    sequelize.literal(
      `(SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.package_id = "Package"."id" AND r.is_published)`,
    ),
    'ratingAverage',
  ],
  [
    sequelize.literal(
      `(SELECT COUNT(*) FROM reviews r WHERE r.package_id = "Package"."id" AND r.is_published)`,
    ),
    'reviewCount',
  ],
];

const DURATION_RANGES = {
  short: { [Op.lte]: 3 },
  medium: { [Op.between]: [4, 6] },
  long: { [Op.gte]: 7 },
};

/** Includes needed to render a package card. hasMany lists load separately so pagination stays correct. */
function cardIncludes(destinationWhere) {
  return [
    {
      model: Destination,
      as: 'destination',
      attributes: ['id', 'name', 'slug', 'region', 'district'],
      ...(destinationWhere ? { where: destinationWhere, required: true } : {}),
    },
    { model: PackagePrice, as: 'prices', separate: true },
    { model: PackageHighlight, as: 'highlights', separate: true },
  ];
}

const RECOMMENDED_ORDER = [
  ['isFeatured', 'DESC'],
  ['sortOrder', 'ASC'],
  ['id', 'ASC'],
];

const SORT_ORDERS = {
  recommended: RECOMMENDED_ORDER,
  price_asc: [[sequelize.literal(DISPLAY_PRICE_SQL), 'ASC'], ...RECOMMENDED_ORDER],
  price_desc: [[sequelize.literal(DISPLAY_PRICE_SQL), 'DESC'], ...RECOMMENDED_ORDER],
  duration: [['durationDays', 'ASC'], ...RECOMMENDED_ORDER],
};

/** SQL condition: the package can be booked at some point in the given YYYY-MM month. */
function availableInMonthCondition(month) {
  const today = todayIst();
  const { start, end } = monthRange(month);
  const from = sequelize.escape(maxDate(start, today));
  const monthStart = sequelize.escape(start);
  const monthEnd = sequelize.escape(end);
  return sequelize.literal(`(
    ("Package"."availability_type" = 'all_season' AND ${monthEnd} >= ${sequelize.escape(today)}
      AND NOT EXISTS (SELECT 1 FROM package_blocked_dates b WHERE b.package_id = "Package"."id"
        AND b.start_date <= ${monthStart} AND b.end_date >= ${monthEnd}))
    OR ("Package"."availability_type" = 'fixed_date'
      AND EXISTS (SELECT 1 FROM package_departures d WHERE d.package_id = "Package"."id" AND d.is_active
        AND d.start_date BETWEEN ${from} AND ${monthEnd}
        AND (d.total_seats IS NULL OR d.booked_seats < d.total_seats)))
  )`);
}

/** GET /packages — filters, sort and pagination from packageListQuerySchema. */
export async function listPackages(query) {
  const conditions = [{ isActive: true }];

  if (query.tripType) conditions.push({ tripType: query.tripType });
  if (query.duration?.length) {
    conditions.push({ [Op.or]: query.duration.map((bucket) => ({ durationDays: DURATION_RANGES[bucket] })) });
  }
  if (query.minPrice != null) {
    conditions.push(sequelize.where(sequelize.literal(DISPLAY_PRICE_SQL), Op.gte, query.minPrice));
  }
  if (query.maxPrice != null) {
    conditions.push(sequelize.where(sequelize.literal(DISPLAY_PRICE_SQL), Op.lte, query.maxPrice));
  }
  if (query.priceType) {
    conditions.push(
      sequelize.literal(
        `EXISTS (SELECT 1 FROM package_prices p2 WHERE p2.package_id = "Package"."id" AND p2.price_type = ${sequelize.escape(query.priceType)})`,
      ),
    );
  }
  if (query.month) conditions.push(availableInMonthCondition(query.month));

  const { limit, offset } = toLimitOffset(query.page, query.pageSize);
  const { rows, count } = await Package.findAndCountAll({
    where: { [Op.and]: conditions },
    attributes: { include: RATING_ATTRIBUTES },
    include: cardIncludes(query.destination ? { slug: query.destination, isActive: true } : null),
    order: SORT_ORDERS[query.sort],
    limit,
    offset,
    distinct: true,
  });

  return { data: rows.map(serializePackageCard), meta: paginationMeta(query.page, query.pageSize, count) };
}

/** Cards for arbitrary active packages (home page, related package). */
export async function findPackageCards(where, { limit, order = RECOMMENDED_ORDER } = {}) {
  const rows = await Package.findAll({
    where: { ...where, isActive: true },
    attributes: { include: RATING_ATTRIBUTES },
    include: cardIncludes(null),
    order,
    limit,
  });
  return rows.map(serializePackageCard);
}

async function findActivePackageBySlug(slug, include = []) {
  const pkg = await Package.findOne({
    where: { slug, isActive: true },
    attributes: { include: RATING_ATTRIBUTES },
    include,
  });
  if (!pkg) throw AppError.notFound('This package does not exist or is no longer available.');
  return pkg;
}

/** Departures still open for booking (active, today or later), oldest first. */
async function findUpcomingDepartures(packageId, { from, to } = {}) {
  const today = todayIst();
  return PackageDeparture.findAll({
    where: {
      packageId,
      isActive: true,
      startDate: { [Op.gte]: from ? maxDate(from, today) : today, ...(to ? { [Op.lte]: to } : {}) },
    },
    order: [['startDate', 'ASC']],
  });
}

async function findBlockedDates(packageId, { from, to } = {}) {
  return PackageBlockedDate.findAll({
    where: {
      packageId,
      endDate: { [Op.gte]: from ?? todayIst() },
      ...(to ? { startDate: { [Op.lte]: to } } : {}),
    },
    order: [['startDate', 'ASC']],
    attributes: ['startDate', 'endDate', 'reason'],
  });
}

/** GET /packages/:slug */
export async function getPackageDetail(slug) {
  const pkg = await findActivePackageBySlug(slug, [
    { model: Destination, as: 'destination', attributes: ['id', 'name', 'slug', 'region', 'district'] },
    'prices',
    'itineraryDays',
    'inclusions',
    'highlights',
    'hotels',
    'faqs',
    'images',
  ]);

  const [departures, blockedDates, reviews, pricingSettings] = await Promise.all([
    pkg.availabilityType === 'fixed_date' ? findUpcomingDepartures(pkg.id) : [],
    pkg.availabilityType === 'all_season' ? findBlockedDates(pkg.id) : [],
    Review.findAll({
      where: { packageId: pkg.id, isPublished: true },
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'DESC'],
      ],
    }),
    getPricingSettings(),
  ]);

  return serializePackageDetail(pkg, {
    departures: departures.map((d) => serializeDeparture(d, pkg.durationNights)),
    blockedDates: blockedDates.map(({ startDate, endDate, reason }) => ({ startDate, endDate, reason })),
    reviews: reviews.map(serializeReview),
    pricing: {
      gstPercent: pricingSettings.gstPercent,
      bookingAmountPercent: pkg.bookingAmountPercent ?? pricingSettings.defaultBookingPercent,
      earliestTravelDate: addDays(todayIst(), pkg.minDaysBeforeBooking),
    },
  });
}

/** GET /packages/:slug/availability?month=YYYY-MM */
export async function getPackageAvailability(slug, month) {
  const pkg = await findActivePackageBySlug(slug);
  const range = month ? monthRange(month) : {};
  const earliestTravelDate = addDays(todayIst(), pkg.minDaysBeforeBooking);

  if (pkg.availabilityType === 'fixed_date') {
    const departures = await findUpcomingDepartures(pkg.id, { from: range.start, to: range.end });
    return {
      availabilityType: pkg.availabilityType,
      month: month ?? null,
      departures: departures.map((d) => serializeDeparture(d, pkg.durationNights)),
    };
  }

  const blockedDates = await findBlockedDates(pkg.id, { from: range.start, to: range.end });
  return {
    availabilityType: pkg.availabilityType,
    month: month ?? null,
    earliestTravelDate,
    blockedDates: blockedDates.map(({ startDate, endDate, reason }) => ({ startDate, endDate, reason })),
  };
}
