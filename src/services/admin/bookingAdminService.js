import { Op } from 'sequelize';
import { formatRupees } from '../../domain/format.js';
import { AppError } from '../../lib/AppError.js';
import { todayIst } from '../../lib/dates.js';
import { sequelize } from '../../lib/db.js';
import { paginationMeta, toLimitOffset } from '../../lib/pagination.js';
import {
  Booking,
  BookingTraveller,
  CouponRedemption,
  Customer,
  Package,
  PackageDeparture,
  Payment,
} from '../../models/index.js';
import { assertTravellerCount, bookingValues, nextBookingNumber } from '../bookingService.js';
import {
  sendBalanceReceivedEmail,
  sendBookingCancelledEmail,
  sendOfflineBookingReceiptEmail,
} from '../emailService.js';
import { redeemCoupon } from '../paymentService.js';
import { buildQuote, serializeQuote } from '../quoteService.js';

const fieldError = (field, message) => AppError.badRequest(message, { [field]: message });

/** Sequelize `where` for the admin booking filters (also used by the CSV export). */
function bookingFilters({ status, source, paymentStatus, packageId, from, to, search }) {
  const where = {};
  if (status) where.status = status;
  if (source) where.source = source;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (packageId) where.packageId = packageId;
  if (from || to) {
    where.travelDate = { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) };
  }
  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [{ bookingNumber: like }, { leadName: like }, { leadEmail: like }, { leadPhone: like }];
  }
  return where;
}

/** GET /admin/bookings */
export async function listBookings(query) {
  const { rows, count } = await Booking.findAndCountAll({
    where: bookingFilters(query),
    order: [['createdAt', 'DESC']],
    ...toLimitOffset(query.page, query.pageSize),
  });
  return {
    data: rows.map((row) => row.get({ plain: true })),
    meta: paginationMeta(query.page, query.pageSize, count),
  };
}

/** GET /admin/bookings/:id — with customer, travellers and the payments timeline. */
export async function getBookingAdmin(id) {
  const booking = await Booking.findByPk(id, {
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
      { model: Package, as: 'package', attributes: ['id', 'title', 'slug'] },
      { model: BookingTraveller, as: 'travellers', separate: true, order: [['id', 'ASC']] },
      { model: Payment, as: 'payments', separate: true, order: [['createdAt', 'ASC']] },
    ],
  });
  if (!booking) throw AppError.notFound('Booking not found.');
  return booking.get({ plain: true });
}

// ---- Offline (admin-panel) bookings and payments ---------------------------------------------
// The customer pays the admin directly (cash, UPI, bank transfer), so there is no Razorpay order:
// the booking is confirmed at once and the customer is mailed a receipt with the full price.

/**
 * The moment a payment was made: now when `paidAt` is today (or not given), otherwise midday IST
 * of that date. Future dates are refused.
 */
function paymentMoment(paidAt, now, field) {
  const today = todayIst(now);
  if (!paidAt || paidAt === today) return now;
  if (paidAt > today) throw fieldError(field, 'The payment date cannot be in the future.');
  return new Date(`${paidAt}T12:00:00+05:30`);
}

const paymentStatusFor = (balanceDue) => (balanceDue <= 0 ? 'fully_paid' : 'advance_paid');

/** The customer account for the lead email: created when new, missing name/phone filled in. */
async function findOrCreateCustomer({ leadEmail, leadName, leadPhone }, transaction) {
  const [customer] = await Customer.findOrCreate({
    where: { email: leadEmail },
    defaults: { email: leadEmail, name: leadName, phone: leadPhone },
    transaction,
  });
  if (!customer.name || !customer.phone) {
    await customer.update(
      { name: customer.name || leadName, phone: customer.phone || leadPhone },
      { transaction },
    );
  }
  return customer;
}

/** POST /admin/bookings/quote — the live price for the admin booking form. */
export async function quoteAdminBooking(input, { now = new Date() } = {}) {
  return serializeQuote(await buildQuote(input, { admin: true, now }));
}

/**
 * POST /admin/bookings — books a trip for a customer who paid offline. Reserves seats, stores the
 * price snapshot (with any manual discount), records the payment and confirms the booking.
 * @returns {Promise<{ booking: object, emailSent: boolean }>}
 */
export async function createAdminBooking(input, { now = new Date() } = {}) {
  const { bookingId, paymentId } = await sequelize.transaction(async (transaction) => {
    const customer = await findOrCreateCustomer(input, transaction);
    const quote = await buildQuote(input, {
      customerId: customer.id,
      strict: true,
      admin: true,
      transaction,
      now,
    });
    assertTravellerCount(input.travellers, quote.quantities);

    const total = quote.breakdown.total;
    const amount = input.payment.collectedInFull ? total : input.payment.amount;
    if (amount > total) {
      throw fieldError(
        'payment.amount',
        `The amount collected cannot be more than the total of ${formatRupees(total)}.`,
      );
    }
    const paidAt = paymentMoment(input.payment.paidAt, now, 'payment.paidAt');

    const departure = quote.dates.departure;
    if (departure) await departure.increment('bookedSeats', { by: quote.quantities.seats, transaction });

    const bookingNumber = await nextBookingNumber(transaction);
    const booking = await Booking.create(
      {
        ...bookingValues({ quote, input, customer, bookingNumber, now }),
        leadEmail: input.leadEmail,
        source: 'admin',
        status: 'confirmed',
        paymentStatus: paymentStatusFor(total - amount),
        manualDiscountReason: quote.breakdown.manualDiscount ? input.manualDiscountReason : null,
        amountPaid: amount,
        balanceDue: total - amount,
        expiresAt: null,
      },
      { transaction },
    );
    await BookingTraveller.bulkCreate(
      input.travellers.map((traveller, index) => ({
        ...traveller,
        bookingId: booking.id,
        isLead: index === 0,
      })),
      { transaction },
    );
    const payment = await Payment.create(
      {
        bookingId: booking.id,
        paymentType: 'advance',
        method: input.payment.method,
        amount,
        status: 'recorded',
        reference: input.payment.reference,
        notes: input.payment.notes,
        paidAt,
      },
      { transaction },
    );
    await redeemCoupon(booking, transaction);
    return { bookingId: booking.id, paymentId: payment.id };
  });

  // After commit: the booking is saved even if the email fails (sending never throws).
  const [booking, payment] = await Promise.all([Booking.findByPk(bookingId), Payment.findByPk(paymentId)]);
  const email = input.sendEmail ? await sendOfflineBookingReceiptEmail(booking, payment) : { sent: false };
  return { booking: await getBookingAdmin(bookingId), emailSent: email.sent };
}

/**
 * POST /admin/bookings/:id/payments — a balance payment collected offline on a confirmed booking.
 * `collectedInFull` takes the whole balance due.
 * @returns {Promise<{ booking: object, emailSent: boolean }>}
 */
export async function recordBalancePayment(id, input, { now = new Date() } = {}) {
  const { booking, payment } = await sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!booking) throw AppError.notFound('Booking not found.');
    if (!['confirmed', 'completed'].includes(booking.status)) {
      throw AppError.badRequest('Payments can only be recorded on confirmed or completed bookings.');
    }
    if (booking.balanceDue <= 0) throw AppError.badRequest('This booking is already fully paid.');

    const amount = input.collectedInFull ? booking.balanceDue : input.amount;
    if (amount > booking.balanceDue) {
      throw fieldError('amount', `The balance due is ${formatRupees(booking.balanceDue)}.`);
    }
    const paidAt = paymentMoment(input.paidAt, now, 'paidAt');

    const payment = await Payment.create(
      {
        bookingId: booking.id,
        paymentType: 'balance',
        method: input.method,
        amount,
        status: 'recorded',
        reference: input.reference,
        notes: input.notes,
        paidAt,
      },
      { transaction },
    );
    const balanceDue = booking.balanceDue - amount;
    await booking.update(
      { amountPaid: booking.amountPaid + amount, balanceDue, paymentStatus: paymentStatusFor(balanceDue) },
      { transaction },
    );
    return { booking, payment };
  });

  const email = input.sendEmail ? await sendBalanceReceivedEmail(booking, payment) : { sent: false };
  return { booking: await getBookingAdmin(id), emailSent: email.sent };
}

/**
 * POST /admin/bookings/:id/cancel — cancels a pending or confirmed booking: seats go back to the
 * departure, an open online payment is closed and the coupon use is released. Money already paid
 * stays on the booking (refunds are handled separately). The customer gets a cancellation email
 * with a PDF cancellation note.
 * @returns {Promise<{ booking: object, emailSent: boolean }>}
 */
export async function cancelBooking(id, { reason, sendEmail }, { now = new Date() } = {}) {
  const booking = await sequelize.transaction(async (transaction) => {
    const lock = transaction.LOCK.UPDATE;
    const booking = await Booking.findByPk(id, { transaction, lock });
    if (!booking) throw AppError.notFound('Booking not found.');
    if (booking.status === 'cancelled') throw AppError.badRequest('This booking is already cancelled.');
    if (booking.status === 'completed') throw AppError.badRequest('Completed bookings cannot be cancelled.');

    if (booking.departureId) {
      const departure = await PackageDeparture.findByPk(booking.departureId, { transaction, lock });
      if (departure) {
        await departure.update(
          { bookedSeats: Math.max(0, departure.bookedSeats - booking.seats) },
          { transaction },
        );
      }
    }
    await booking.update(
      { status: 'cancelled', cancelledAt: now, cancelReason: reason, expiresAt: null },
      { transaction },
    );
    await Payment.update(
      { status: 'failed', failureReason: 'Booking cancelled' },
      { where: { bookingId: booking.id, status: 'created' }, transaction },
    );
    await CouponRedemption.destroy({ where: { bookingId: booking.id }, transaction });
    return booking;
  });

  const email = sendEmail ? await sendBookingCancelledEmail(booking) : { sent: false };
  return { booking: await getBookingAdmin(id), emailSent: email.sent };
}
