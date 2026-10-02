import { customerProfileSchema, otpRequestSchema, otpVerifySchema } from '@nh/shared';
import { Router } from 'express';
import * as auth from '../../controllers/authController.js';
import { requireCustomer } from '../../middlewares/auth.js';
import { otpIpLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';

export const customerAuthRoutes = Router();

customerAuthRoutes.post(
  '/auth/otp/request',
  otpIpLimiter,
  validate({ body: otpRequestSchema }),
  auth.customerRequestOtp,
);
customerAuthRoutes.post(
  '/auth/otp/verify',
  otpIpLimiter,
  validate({ body: otpVerifySchema }),
  auth.customerVerifyOtp,
);
customerAuthRoutes.post('/auth/logout', auth.customerLogout);

customerAuthRoutes.get('/me', requireCustomer, auth.customerMe);
customerAuthRoutes.patch(
  '/me',
  requireCustomer,
  validate({ body: customerProfileSchema }),
  auth.customerUpdateMe,
);
