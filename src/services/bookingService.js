import { env } from '../config/env.js';
import { PENDING_BOOKING_MINUTES } from '../domain/constants.js';
import { AppError } from '../lib/AppError.js';
import { todayIst } from '../lib/dates.js';
import { sequelize } from '../lib/db.js';
import { createOrder } from '../lib/razorpay.js';
import { Booking, BookingTraveller, Payment } from '../models/index.js';
import { buildQuote } from './quoteService.js';

// POST /bookings (CLAUDE.md "Booking and payment flow", step 4): re-validates the choice,
// recalculates the price and, in one transaction, reserves seats, stores the pending booking
// with its price snapshot and opens a Razorpay order for the booking amount.

const MINUTE_MS = 60 * 1000;
/** Razorpay does not accept orders below ₹1. */
const MIN_ORDER_PAISE = 100;
const BOOKING_SEQUENCE_DIGITS = 5;

const fieldError = (field, message) => AppError.badRequest(message, { [field]: message });

/** NH-<year>-<5-digit sequence>; the database sequence keeps it unique under concurrency. */
async function nextBookingNumber(transaction) {
  const [[{ value }]] = await sequelize.query("SELECT nextval('booking_number_seq') AS value", {
    transaction,
  });
  const year = todayIst().slice(0, 4);
  return `NH-${year}-${String(value).padStart(BOOKING_SEQUENCE_DIGITS, '0')}`;
}

/** Every person travelling (paying travellers + free infants) needs a name, age and gender. */
function assertTravellerCount(travellers, quantities) {
  const expected = quantities.seats + quantities.infants;
  if (travellers.length !== expected) {
    throw fieldError(
      'travellers',
      `Add details for all ${expected} traveller${expected === 1 ? '' : 's'}, including infants.`,
    );
  }
}

/** Snapshot of the price and choices, so later package or price edits never change a booking. */
function bookingValues({ quote, input, customer, bookingNumber, now }) {
  const { breakdown, quantities, dates } = quote;
  return {
    bookingNumber,
    customerId: customer.id,
    packageId: quote.package.id,
    packagePriceId: quote.price.id,
    departureId: dates.departure?.id ?? null,
    travelDate: dates.travelDate,
    endDate: dates.endDate,
    pickupPoint: input.pickupPoint,
    adults: quantities.adults,
    children: quantities.children,
    infants: quantities.infants,
    units: quantities.units,
    seats: quantities.seats,
    leadName: input.leadName,
    leadEmail: customer.email,
    leadPhone: input.leadPhone,
    specialRequests: input.specialRequests || null,
    packageTitle: quote.package.title,
    priceLabel: quote.price.label,
    priceType: quote.price.priceType,
    unitPrice: breakdown.unitPrice,
    quantity: breakdown.quantity,
    subtotal: breakdown.subtotal,
    couponCode: quote.coupon?.code ?? null,
    discountAmount: breakdown.discount,
    gstPercent: breakdown.gstPercent,
    gstAmount: breakdown.gstAmount,
    totalAmount: breakdown.total,
    bookingAmountPercent: breakdown.bookingAmountPercent,
    payNowAmount: breakdown.payNow,
    balanceDue: breakdown.balanceDue,
    expiresAt: new Date(now.getTime() + PENDING_BOOKING_MINUTES * MINUTE_MS),
  };
}

/**
 * @param {{ id: number, email: string }} customer
 * @param {object} input  createBookingSchema output
 * @returns {Promise<{ bookingNumber: string, expiresAt: Date, checkout: object }>}
 */
export async function createBooking(customer, input, { now = new Date() } = {}) {
  return sequelize.transaction(async (transaction) => {
    // Strict quote: an invalid coupon is an error, and the departure row stays locked until commit.
    const quote = await buildQuote(input, { customerId: customer.id, strict: true, transaction, now });
    assertTravellerCount(input.travellers, quote.quantities);
    if (quote.breakdown.payNow < MIN_ORDER_PAISE) {
      throw AppError.badRequest('This booking cannot be paid online. Please contact us to complete it.');
    }

    const departure = quote.dates.departure;
    if (departure) await departure.increment('bookedSeats', { by: quote.quantities.seats, transaction });

    const bookingNumber = await nextBookingNumber(transaction);
    const booking = await Booking.create(
      bookingValues({ quote, input, customer, bookingNumber, now }),
      { transaction },
    );
    await BookingTraveller.bulkCreate(
      input.travellers.map((traveller, index) => ({ ...traveller, bookingId: booking.id, isLead: index === 0 })),
      { transaction },
    );

    // Created last: if the gateway fails, the whole booking (and its seats) rolls back.
    const order = await createOrder({
      amount: booking.payNowAmount,
      receipt: bookingNumber,
      notes: { bookingNumber },
    });
    await Payment.create(
      {
        bookingId: booking.id,
        paymentType: 'advance',
        method: 'razorpay',
        amount: booking.payNowAmount,
        status: 'created',
        razorpayOrderId: order.id,
      },
      { transaction },
    );

    return {
      bookingNumber,
      expiresAt: booking.expiresAt,
      checkout: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: booking.payNowAmount,
        currency: order.currency,
        name: booking.leadName,
        email: booking.leadEmail,
        phone: booking.leadPhone,
        description: `${booking.packageTitle} · ${bookingNumber}`,
      },
    };
  });
}
