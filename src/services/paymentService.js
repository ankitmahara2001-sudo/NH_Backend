import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';
import { sequelize } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import {
  fetchPayment,
  isValidPaymentSignature,
  isValidWebhookSignature,
} from '../lib/razorpay.js';
import { Booking, Coupon, CouponRedemption, Payment } from '../models/index.js';
import { sendBookingConfirmedEmails } from './emailService.js';

// Razorpay advance payments (CLAUDE.md "Booking and payment flow", steps 5–6).
// The webhook is the source of truth. The checkout callback (POST /payments/verify) also
// confirms when Razorpay already reports the payment captured, so a booking is confirmed even
// before (or without, e.g. locally without a tunnel) the webhook. Both paths share
// recordAdvanceCaptured, which is idempotent: a second delivery changes nothing.

/** Coupon usage is counted only once the advance is paid. */
async function redeemCoupon(booking, transaction) {
  if (!booking.couponCode) return;
  const coupon = await Coupon.findOne({ where: { code: booking.couponCode }, transaction });
  if (!coupon) return;
  await CouponRedemption.findOrCreate({
    where: { bookingId: booking.id },
    defaults: { couponId: coupon.id, customerId: booking.customerId },
    transaction,
  });
}

/**
 * Marks the advance payment for `orderId` captured and confirms its booking.
 * @returns {Promise<{ changed: boolean, booking: Booking|null }>}
 */
export async function recordAdvanceCaptured({ orderId, paymentId, amount, payload }, { now = new Date() } = {}) {
  const result = await sequelize.transaction(async (transaction) => {
    const lock = transaction.LOCK.UPDATE;
    const payment = await Payment.findOne({ where: { razorpayOrderId: orderId }, transaction, lock });
    if (!payment) {
      logger.warn({ orderId }, 'Razorpay payment for an unknown order ignored');
      return { changed: false, booking: null };
    }
    const booking = await Booking.findByPk(payment.bookingId, { transaction, lock });
    if (payment.status === 'captured') return { changed: false, booking };
    if (amount !== payment.amount) {
      logger.error(
        { orderId, paymentId, expected: payment.amount, received: amount },
        'Razorpay amount does not match the order; booking not confirmed',
      );
      return { changed: false, booking };
    }

    await payment.update(
      { status: 'captured', razorpayPaymentId: paymentId, rawPayload: payload, paidAt: now, failureReason: null },
      { transaction },
    );
    const amountPaid = booking.amountPaid + amount;
    const balanceDue = booking.totalAmount - amountPaid;
    const paymentStatus = balanceDue <= 0 ? 'fully_paid' : 'advance_paid';

    if (booking.status === 'cancelled') {
      // Paid after the 30-minute hold ran out: its seats were released. Keep it cancelled and
      // record the money so the admin sees it and refunds (or rebooks) by hand.
      logger.error({ bookingNumber: booking.bookingNumber }, 'Payment captured for a cancelled booking; refund needed');
      await booking.update({ amountPaid, balanceDue, paymentStatus }, { transaction });
      return { changed: false, booking };
    }

    await booking.update(
      { status: 'confirmed', paymentStatus, amountPaid, balanceDue, expiresAt: null },
      { transaction },
    );
    await redeemCoupon(booking, transaction);
    return { changed: true, booking };
  });

  // After commit: the booking is saved even if the email fails (sending never throws).
  if (result.changed) await sendBookingConfirmedEmails(result.booking);
  return result;
}

/** A failed attempt: keep the reason; the booking stays pending so the customer can retry. */
async function recordPaymentFailed({ orderId, paymentId, reason, payload }) {
  const payment = await Payment.findOne({ where: { razorpayOrderId: orderId } });
  if (!payment || payment.status === 'captured') return;
  await payment.update({
    status: 'failed',
    failureReason: reason || 'Payment failed',
    rawPayload: { ...payload, failedPaymentId: paymentId },
  });
}

const bookingStatus = (booking) => ({
  bookingNumber: booking.bookingNumber,
  status: booking.status,
  paymentStatus: booking.paymentStatus,
});

/** POST /payments/verify — checkout success handler. Returns the booking's current status. */
export async function verifyPayment(customer, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const payment = await Payment.findOne({
    where: { razorpayOrderId },
    include: [{ model: Booking, as: 'booking', where: { customerId: customer.id } }],
  });
  if (!payment) throw AppError.notFound('Booking not found.');

  const signatureOk = isValidPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!signatureOk) {
    throw new AppError(400, 'PAYMENT_VERIFICATION_FAILED', 'We could not verify this payment. Please contact us.');
  }

  try {
    const rzPayment = await fetchPayment(razorpayPaymentId);
    if (rzPayment.order_id === razorpayOrderId && rzPayment.status === 'captured') {
      await recordAdvanceCaptured({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        amount: rzPayment.amount,
        payload: rzPayment,
      });
    }
  } catch (error) {
    // The signature is valid, so the payment went through; the webhook will confirm it.
    if (!(error instanceof AppError)) throw error;
    logger.warn({ orderId: razorpayOrderId }, 'Could not read the payment from Razorpay; waiting for the webhook');
  }

  return bookingStatus(await payment.booking.reload());
}

/** POST /webhooks/razorpay — `rawBody` is the exact bytes Razorpay signed. */
export async function handleRazorpayWebhook(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Webhook secret is not configured.');
  }
  if (!isValidWebhookSignature(rawBody, signature)) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Invalid webhook signature.');
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) return;

  if (event.event === 'payment.captured') {
    await recordAdvanceCaptured({
      orderId: entity.order_id,
      paymentId: entity.id,
      amount: entity.amount,
      payload: event,
    });
  } else if (event.event === 'payment.failed') {
    await recordPaymentFailed({
      orderId: entity.order_id,
      paymentId: entity.id,
      reason: entity.error_description,
      payload: event,
    });
  }
}
