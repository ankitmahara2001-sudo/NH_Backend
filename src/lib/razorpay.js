import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';
import { logger } from './logger.js';

// Razorpay client: creates orders, reads payments and checks signatures.
// The key secret and webhook secret never leave the server; the key id is public.

const CURRENCY = 'INR';

export function isRazorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

let client = null;
function getClient() {
  if (!isRazorpayConfigured()) {
    throw new AppError(
      503,
      'PAYMENTS_NOT_CONFIGURED',
      'Online payments are not set up yet. Please contact us to complete your booking.',
    );
  }
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

/** The SDK rejects with a plain object ({ statusCode, error: { description } }), not an Error. */
function gatewayError(error, action) {
  logger.error(
    { statusCode: error?.statusCode, description: error?.error?.description ?? error?.message },
    `Razorpay: ${action} failed`,
  );
  return new AppError(
    502,
    'PAYMENT_GATEWAY_ERROR',
    'We could not reach the payment gateway. Please try again in a moment.',
  );
}

/** Creates an order for `amount` paise. `receipt` is the booking number. */
export async function createOrder({ amount, receipt, notes }) {
  try {
    return await getClient().orders.create({ amount, currency: CURRENCY, receipt, notes });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw gatewayError(error, 'create order');
  }
}

/** Reads a payment (status, amount, order id) straight from Razorpay. */
export async function fetchPayment(paymentId) {
  try {
    return await getClient().payments.fetch(paymentId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw gatewayError(error, 'fetch payment');
  }
}

function hmacMatches(secret, payload, signature) {
  if (!secret || typeof signature !== 'string') return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(payload).digest('hex'));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Checkout success handler signature: HMAC-SHA256("<order_id>|<payment_id>", key secret). */
export function isValidPaymentSignature({ orderId, paymentId, signature }) {
  return hmacMatches(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body, webhook secret). */
export function isValidWebhookSignature(rawBody, signature) {
  return hmacMatches(env.RAZORPAY_WEBHOOK_SECRET, rawBody, signature);
}
