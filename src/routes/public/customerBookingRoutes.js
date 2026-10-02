import { Router } from 'express';
import { z } from 'zod';
import * as bookings from '../../controllers/customerBookingController.js';
import { requireCustomer } from '../../middlewares/auth.js';
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
