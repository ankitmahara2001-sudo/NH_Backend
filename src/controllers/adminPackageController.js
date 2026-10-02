import * as packages from '../services/admin/packageAdminService.js';

const ok = (res, data) => res.json({ data });

export const list = async (req, res) => ok(res, await packages.listPackagesAdmin(req.validated.query));
export const get = async (req, res) => ok(res, await packages.getPackageAdmin(req.validated.params.id));
export const create = async (req, res) =>
  res.status(201).json({ data: await packages.createPackage(req.validated.body) });
export const updateDetails = async (req, res) =>
  ok(res, await packages.updatePackageDetails(req.validated.params.id, req.validated.body));
export const updateFlags = async (req, res) =>
  ok(res, await packages.updatePackageFlags(req.validated.params.id, req.validated.body));
export const duplicate = async (req, res) =>
  res.status(201).json({ data: await packages.duplicatePackage(req.validated.params.id) });
export const reorder = async (req, res) => {
  await packages.reorderPackages(req.validated.body.ids);
  ok(res, { reordered: true });
};
export const remove = async (req, res) => {
  await packages.deletePackage(req.validated.params.id);
  ok(res, { deleted: true });
};

/** Each package-form tab saves through its own PUT. */
const TAB_SAVERS = {
  prices: packages.replacePrices,
  itinerary: packages.replaceItinerary,
  inclusions: packages.replaceInclusions,
  highlights: packages.replaceHighlights,
  hotels: packages.replaceHotels,
  faqs: packages.replaceFaqs,
  departures: packages.replaceDepartures,
  'blocked-dates': packages.replaceBlockedDates,
};
export const saveTab = (tab) => async (req, res) =>
  ok(res, await TAB_SAVERS[tab](req.validated.params.id, req.validated.body));

export const addImages = async (req, res) =>
  ok(res, await packages.addPackageImages(req.validated.params.id, req.validated.body));
export const reorderImages = async (req, res) =>
  ok(res, await packages.reorderPackageImages(req.validated.params.id, req.validated.body.ids));
export const updateImage = async (req, res) =>
  ok(
    res,
    await packages.updatePackageImage(
      req.validated.params.id,
      req.validated.params.imageId,
      req.validated.body,
    ),
  );
export const deleteImage = async (req, res) =>
  ok(res, await packages.deletePackageImage(req.validated.params.id, req.validated.params.imageId));
