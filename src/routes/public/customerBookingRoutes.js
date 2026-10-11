import { Router } from 'express';
import { z } from 'zod';
import * as bookings from '../../controllers/customerBookingController.js';
import { createBookingSchema, paymentVerifySchema } from '../../domain/schemas/booking.js';
import { requireCustomer } from '../../middlewares/auth.js';
import { bookingLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';

const bookingNumberParams = z.object({
  bookingNumber: z.string().regex(/^NH-\d{4}-\d{5,}$/, 'Invalid booking number.'),
});

export const customerBookingRoutes = Router();

customerBookingRoutes.get('/me/bookings', requireCustomer, bookings.myBookings);
customerBookingRoutes.get(
  '/me/bookings/:bookingNumber',
  requireCustomer,
  validate({ params: bookingNumberParams }),
  bookings.myBooking,
);
customerBookingRoutes.post(
  '/bookings',
  bookingLimiter,
  requireCustomer,
  validate({ body: createBookingSchema }),
  bookings.create,
);
customerBookingRoutes.post(
  '/payments/verify',
  requireCustomer,
  validate({ body: paymentVerifySchema }),
  bookings.verify,
);
