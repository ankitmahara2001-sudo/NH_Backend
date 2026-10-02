import {
  ENQUIRY_STATUSES,
  SITE_SETTING_KEYS,
  adminBookingListQuerySchema,
  adminChangePasswordSchema,
  adminLoginSchema,
  blogPostSchema,
  couponSchema,
  destinationSchema,
  enquiryStatusSchema,
  galleryBulkCreateSchema,
  galleryImageSchema,
  heroSlideSchema,
  idParamSchema,
  paginationQuerySchema,
  reviewSchema,
  uploadDeleteSchema,
  uploadSignatureSchema,
} from '@nh/shared';
import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../../controllers/adminController.js';
import * as auth from '../../controllers/authController.js';
import { requireAdmin } from '../../middlewares/auth.js';
import { adminLoginLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import {
  blogAdmin,
  destinationAdmin,
  galleryAdmin,
  heroSlideAdmin,
  reviewAdmin,
} from '../../services/admin/contentAdminService.js';
import { createCrudRoutes } from './crudRoutes.js';
import { packageRoutes } from './packageRoutes.js';

const byId = { params: idParamSchema };
const searchPageQuery = paginationQuerySchema.extend({ search: z.string().trim().max(120).optional() });
const enquiryQuery = paginationQuerySchema.extend({ status: z.enum(ENQUIRY_STATUSES).optional() });
const settingParams = z.object({ key: z.enum(SITE_SETTING_KEYS) });
const settingBody = z.object({ value: z.unknown() });

export const adminRoutes = Router();

// ---- Auth (login is the only route that works without a session) ----------------------------
adminRoutes.post('/auth/login', adminLoginLimiter, validate({ body: adminLoginSchema }), auth.adminLogin);
adminRoutes.post('/auth/logout', auth.adminLogout);

adminRoutes.use(requireAdmin);

adminRoutes.get('/auth/me', auth.adminMe);
adminRoutes.patch('/auth/password', validate({ body: adminChangePasswordSchema }), auth.adminChangePassword);

adminRoutes.get('/dashboard', admin.dashboard);

// ---- Packages and uploads ---------------------------------------------------------------------
adminRoutes.use('/packages', packageRoutes);
adminRoutes.post('/uploads/signature', validate({ body: uploadSignatureSchema }), admin.uploadSignature);
adminRoutes.delete('/uploads', validate({ body: uploadDeleteSchema }), admin.deleteUpload);

// ---- Content ------------------------------------------------------------------------------------
adminRoutes.use(
  '/destinations',
  createCrudRoutes(destinationAdmin, { schema: destinationSchema, reorderable: true }),
);
adminRoutes.use(
  '/hero-slides',
  createCrudRoutes(heroSlideAdmin, { schema: heroSlideSchema, reorderable: true }),
);
adminRoutes.post('/gallery/bulk', validate({ body: galleryBulkCreateSchema }), admin.galleryBulkCreate);
adminRoutes.use(
  '/gallery',
  createCrudRoutes(galleryAdmin, { schema: galleryImageSchema, reorderable: true }),
);
adminRoutes.use('/blog', createCrudRoutes(blogAdmin, { schema: blogPostSchema }));
adminRoutes.use('/reviews', createCrudRoutes(reviewAdmin, { schema: reviewSchema, reorderable: true }));

adminRoutes.get('/coupons', admin.couponList);
adminRoutes.post('/coupons', validate({ body: couponSchema }), admin.couponCreate);
adminRoutes.get('/coupons/:id', validate(byId), admin.couponGet);
adminRoutes.put('/coupons/:id', validate({ ...byId, body: couponSchema }), admin.couponUpdate);
adminRoutes.delete('/coupons/:id', validate(byId), admin.couponDelete);

// ---- Customers, bookings (read-only until Phase 5), enquiries --------------------------------
adminRoutes.get('/customers', validate({ query: searchPageQuery }), admin.customerList);
adminRoutes.get('/customers/:id', validate(byId), admin.customerGet);
adminRoutes.get('/bookings', validate({ query: adminBookingListQuerySchema }), admin.bookingList);
adminRoutes.get('/bookings/:id', validate(byId), admin.bookingGet);
adminRoutes.get('/enquiries', validate({ query: enquiryQuery }), admin.enquiryList);
adminRoutes.patch('/enquiries/:id', validate({ ...byId, body: enquiryStatusSchema }), admin.enquiryUpdate);

// ---- Settings -------------------------------------------------------------------------------------
adminRoutes.get('/settings', admin.settingsGet);
adminRoutes.put(
  '/settings/:key',
  validate({ params: settingParams, body: settingBody }),
  admin.settingsUpdate,
);
