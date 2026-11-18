import { createUploadSignature, destroyImage, isOwnPublicId } from '../lib/cloudinary.js';
import { AppError } from '../lib/AppError.js';
import {
  cancelBooking,
  createAdminBooking,
  getBookingAdmin,
  listBookings,
  quoteAdminBooking,
  recordBalancePayment,
} from '../services/admin/bookingAdminService.js';
import { bulkCreateGalleryImages } from '../services/admin/contentAdminService.js';
import * as coupons from '../services/admin/couponAdminService.js';
import { getCustomer, listCustomers } from '../services/admin/customerAdminService.js';
import { getDashboard } from '../services/admin/dashboardService.js';
import { listEnquiries, updateEnquiryStatus } from '../services/admin/enquiryAdminService.js';
import { getSettings, updateSetting } from '../services/settingsService.js';

const ok = (res, data) => res.json({ data });

export const dashboard = async (req, res) => ok(res, await getDashboard(req.validated.query));

// ---- Uploads ------------------------------------------------------------------------------

export const uploadSignature = (req, res) => ok(res, createUploadSignature(req.validated.body.folder));

export const deleteUpload = async (req, res) => {
  const { publicId } = req.validated.body;
  if (!isOwnPublicId(publicId))
    throw AppError.badRequest('Only images uploaded from this admin panel can be deleted.');
  ok(res, { deleted: await destroyImage(publicId) });
};

// ---- Gallery bulk upload ----------------------------------------------------------------------

export const galleryBulkCreate = async (req, res) =>
  res.status(201).json({ data: await bulkCreateGalleryImages(req.validated.body.images) });

// ---- Coupons --------------------------------------------------------------------------------

export const couponList = async (_req, res) => ok(res, await coupons.listCoupons());
export const couponGet = async (req, res) => ok(res, await coupons.getCoupon(req.validated.params.id));
export const couponCreate = async (req, res) =>
  res.status(201).json({ data: await coupons.createCoupon(req.validated.body) });
export const couponUpdate = async (req, res) =>
  ok(res, await coupons.updateCoupon(req.validated.params.id, req.validated.body));
export const couponDelete = async (req, res) => {
  await coupons.deleteCoupon(req.validated.params.id);
  ok(res, { deleted: true });
};

// ---- Customers, bookings, enquiries -------------------------------------------------------------

export const customerList = async (req, res) => res.json(await listCustomers(req.validated.query));
export const customerGet = async (req, res) => ok(res, await getCustomer(req.validated.params.id));

export const bookingList = async (req, res) => res.json(await listBookings(req.validated.query));
export const bookingGet = async (req, res) => ok(res, await getBookingAdmin(req.validated.params.id));
export const bookingQuote = async (req, res) => ok(res, await quoteAdminBooking(req.validated.body));
// `meta.emailSent` tells the admin whether the receipt email went out.
export const bookingCreate = async (req, res) => {
  const { booking, emailSent } = await createAdminBooking(req.validated.body);
  res.status(201).json({ data: booking, meta: { emailSent } });
};
export const bookingCancel = async (req, res) => {
  const { booking, emailSent } = await cancelBooking(req.validated.params.id, req.validated.body);
  res.json({ data: booking, meta: { emailSent } });
};
export const bookingRecordPayment = async (req, res) => {
  const { booking, emailSent } = await recordBalancePayment(req.validated.params.id, req.validated.body);
  res.status(201).json({ data: booking, meta: { emailSent } });
};

export const enquiryList = async (req, res) => res.json(await listEnquiries(req.validated.query));
export const enquiryUpdate = async (req, res) =>
  ok(res, await updateEnquiryStatus(req.validated.params.id, req.validated.body.status));

// ---- Settings --------------------------------------------------------------------------------

export const settingsGet = async (_req, res) => ok(res, await getSettings());
export const settingsUpdate = async (req, res) =>
  ok(res, await updateSetting(req.validated.params.key, req.validated.body.value));
