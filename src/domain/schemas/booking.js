import { z } from 'zod';
import { MAX_TRAVELLER_COUNT } from '../constants.js';
import {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  GENDERS,
  OFFLINE_PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '../enums.js';
import {
  emailSchema,
  isoDateSchema,
  optionalText,
  paiseSchema,
  phoneSchema,
  positivePaiseSchema,
  requiredText,
} from './common.js';

const counter = (min) => z.int().min(min).max(MAX_TRAVELLER_COUNT);

/**
 * Traveller counts. For per_person prices use adults/children; for per_couple and
 * per_group prices use units. Infants always travel free.
 */
const travellerCountsSchema = z.object({
  adults: counter(0).default(0),
  children: counter(0).default(0),
  infants: counter(0).default(0),
  units: counter(0).default(0),
});

const tripChoiceShape = {
  packageId: z.int().positive(),
  priceId: z.int().positive(),
  counts: travellerCountsSchema,
  // all_season packages send travelDate; fixed_date packages send departureId.
  travelDate: isoDateSchema.optional(),
  departureId: z.int().positive().optional(),
  couponCode: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
};

export const pricingQuoteSchema = z.object(tripChoiceShape);

const travellerSchema = z.object({
  fullName: requiredText(120),
  age: z.int().min(0).max(120),
  gender: z.enum(GENDERS),
});

export const createBookingSchema = z.object({
  ...tripChoiceShape,
  pickupPoint: requiredText(160),
  leadName: requiredText(120),
  leadPhone: phoneSchema,
  specialRequests: optionalText(2000),
  // First traveller is the lead traveller.
  travellers: z.array(travellerSchema).min(1, 'Add traveller details.'),
  acceptTerms: z.literal(true, 'Please accept the booking terms.'),
});

export const paymentVerifySchema = z.object({
  razorpayOrderId: requiredText(64),
  razorpayPaymentId: requiredText(64),
  razorpaySignature: requiredText(256),
});

// ---- Admin booking actions ---------------------------------------------------------

/**
 * An offline payment the admin collected (cash, UPI, bank transfer). `collectedInFull` takes the
 * whole amount due, so the admin does not have to type it; otherwise `amount` is required.
 * `paidAt` defaults to today. `sendEmail` mails the customer a receipt.
 */
const offlinePaymentSchema = z
  .object({
    method: z.enum(OFFLINE_PAYMENT_METHODS),
    collectedInFull: z.boolean().default(false),
    amount: positivePaiseSchema.nullish(),
    reference: optionalText(120),
    paidAt: isoDateSchema.optional(),
    notes: optionalText(1000),
  })
  .refine((payment) => payment.collectedInFull || payment.amount, {
    message: 'Enter the amount collected.',
    path: ['amount'],
  });

const adminTripChoiceShape = {
  ...tripChoiceShape,
  // Extra discount in paise, after any coupon and before GST.
  manualDiscount: paiseSchema.default(0),
};

/** POST /admin/bookings/quote — live price for the admin booking form. */
export const adminBookingQuoteSchema = z.object(adminTripChoiceShape);

/** POST /admin/bookings — a booking paid offline, confirmed at once. */
export const adminCreateBookingSchema = z.object({
  ...adminTripChoiceShape,
  manualDiscountReason: optionalText(160),
  pickupPoint: optionalText(160),
  leadName: requiredText(120),
  leadEmail: emailSchema,
  leadPhone: phoneSchema,
  specialRequests: optionalText(2000),
  // First traveller is the lead traveller.
  travellers: z.array(travellerSchema).min(1, 'Add traveller details.'),
  payment: offlinePaymentSchema,
  sendEmail: z.boolean().default(true),
});

/** POST /admin/bookings/:id/payments — balance collected later on a confirmed booking. */
export const recordBalancePaymentSchema = offlinePaymentSchema.safeExtend({
  sendEmail: z.boolean().default(true),
});

/** POST /admin/bookings/:id/cancel — the reason is shown to the customer in the email and PDF. */
export const cancelBookingSchema = z.object({
  reason: requiredText(1000),
  sendEmail: z.boolean().default(true),
});

export const recordRefundSchema = z.object({
  amount: positivePaiseSchema,
  reference: optionalText(120),
  refundedAt: isoDateSchema,
  notes: optionalText(1000),
});

export const bookingStatusUpdateSchema = z.object({ status: z.literal('completed') });

export const adminBookingListQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  source: z.enum(BOOKING_SOURCES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  packageId: z.coerce.number().int().positive().optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /admin/dashboard — period (IST calendar dates, both inclusive; default: this month so far)
 * and optional package / source filters.
 */
export const adminDashboardQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    packageId: z.coerce.number().int().positive().optional(),
    source: z.enum(BOOKING_SOURCES).optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'The start date must be before the end date.',
    path: ['from'],
  });
