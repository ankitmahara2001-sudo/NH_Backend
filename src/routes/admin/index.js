import { adminChangePasswordSchema, adminLoginSchema } from '@nh/shared';
import { Router } from 'express';
import * as auth from '../../controllers/authController.js';
import { requireAdmin } from '../../middlewares/auth.js';
import { adminLoginLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';

export const adminRoutes = Router();

// Login is the only admin route that works without a session.
adminRoutes.post('/auth/login', adminLoginLimiter, validate({ body: adminLoginSchema }), auth.adminLogin);
adminRoutes.post('/auth/logout', auth.adminLogout);

adminRoutes.use(requireAdmin);

adminRoutes.get('/auth/me', auth.adminMe);
adminRoutes.patch('/auth/password', validate({ body: adminChangePasswordSchema }), auth.adminChangePassword);
