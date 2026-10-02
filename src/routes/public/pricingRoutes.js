import { pricingQuoteSchema } from '@nh/shared';
import { Router } from 'express';
import { quote } from '../../controllers/pricingController.js';
import { loadOptionalCustomer } from '../../middlewares/auth.js';
import { quoteLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';

export const pricingRoutes = Router();

// Anyone can get a quote; a logged-in customer also gets the per-customer coupon limit checked.
pricingRoutes.post(
  '/pricing/quote',
  quoteLimiter,
  loadOptionalCustomer,
  validate({ body: pricingQuoteSchema }),
  quote,
);
