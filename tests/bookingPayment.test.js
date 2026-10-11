import { createHmac } from 'node:crypto';
import { Op } from 'sequelize';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { expirePendingBookings } from '../src/jobs/expirePendingBookings.js';
import { todayIst } from '../src/lib/dates.js';
import { sequelize } from '../src/lib/db.js';
import {
  Booking,
  CouponRedemption,
  Package,
  PackageDeparture,
  PackagePrice,
  Payment,
} from '../src/models/index.js';
import { api, clearOutbox, loginAsCustomer, testOutbox } from './helpers.js';

// Only the two network calls are mocked; signature checks run for real with the test secrets
// from vitest.config.js.
const razorpayMock = vi.hoisted(() => ({ orderCount: 0, payment: null }));
vi.mock('../src/lib/razorpay.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createOrder: vi.fn(async ({ amount }) => ({
    id: `order_test_${Date.now()}_${(razorpayMock.orderCount += 1)}`,
    amount,
    currency: 'INR',
  })),
  fetchPayment: vi.fn(async () => razorpayMock.payment),
}));

afterAll(() => sequelize.close());

const runId = Date.now();
const sign = (secret, payload) => createHmac('sha256', secret).update(payload).digest('hex');

let session;
let departure;
let price;

function bookingBody(overrides = {}) {
  return {
    packageId: departure.packageId,
    priceId: price.id,
    departureId: departure.id,
    counts: { adults: 2 },
    pickupPoint: 'Dehradun Railway Station',
    leadName: 'Priya Sharma',
    leadPhone: '9876543210',
    travellers: [
      { fullName: 'Priya Sharma', age: 34, gender: 'female' },
      { fullName: 'Rohan Sharma', age: 36, gender: 'male' },
    ],
    acceptTerms: true,
    ...overrides,
  };
}

function capturedEvent(orderId, amount, paymentId = `pay_${orderId}`) {
  return JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount, status: 'captured' } } },
  });
}

function postWebhook(body, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  return api()
    .post('/api/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sign(secret, body))
    .send(body);
}

async function createBooking(overrides) {
  const res = await session.post('/api/bookings').send(bookingBody(overrides));
  expect(res.status).toBe(201);
  return res.body.data;
}

beforeAll(async () => {
  session = await loginAsCustomer(`booking-flow-${runId}@example.com`);
  departure = await PackageDeparture.findOne({
    where: { isActive: true, totalSeats: { [Op.gte]: 10 }, startDate: { [Op.gt]: todayIst() } },
    include: [{ model: Package, as: 'package', where: { availabilityType: 'fixed_date', isActive: true } }],
    order: [['startDate', 'ASC']],
  });
  price = await PackagePrice.findOne({ where: { packageId: departure.packageId, priceType: 'per_person' } });
  // Room for every booking this file creates, so none fails as "sold out".
  await departure.update({ totalSeats: departure.bookedSeats + 100 });
});

beforeEach(() => clearOutbox());

describe('POST /api/bookings', () => {
  it('requires login', async () => {
    const res = await api().post('/api/bookings').send(bookingBody());
    expect(res.status).toBe(401);
  });

  it('creates a pending booking, reserves seats and opens an order for the booking amount', async () => {
    const seatsBefore = (await departure.reload()).bookedSeats;
    const quote = await session.post('/api/pricing/quote').send({
      packageId: departure.packageId,
      priceId: price.id,
      departureId: departure.id,
      counts: { adults: 2 },
      couponCode: 'NORTH10',
    });

    const data = await createBooking({ couponCode: 'NORTH10' });
    expect(data.bookingNumber).toMatch(/^NH-\d{4}-\d{5}$/);
    expect(data.checkout).toMatchObject({ amount: quote.body.data.payNow, currency: 'INR' });

    const booking = await Booking.findOne({ where: { bookingNumber: data.bookingNumber } });
    expect(booking).toMatchObject({
      status: 'pending',
      paymentStatus: 'unpaid',
      seats: 2,
      couponCode: 'NORTH10',
      totalAmount: quote.body.data.total,
      payNowAmount: quote.body.data.payNow,
      balanceDue: quote.body.data.balanceDue,
    });
    expect(booking.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect((await departure.reload()).bookedSeats).toBe(seatsBefore + 2);
    const payment = await Payment.findOne({ where: { bookingId: booking.id } });
    expect(payment).toMatchObject({ status: 'created', amount: booking.payNowAmount, paymentType: 'advance' });
  });

  it('needs details for every traveller', async () => {
    const res = await session
      .post('/api/bookings')
      .send(bookingBody({ travellers: [{ fullName: 'Priya Sharma', age: 34, gender: 'female' }] }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('travellers');
  });

  it('gives each booking a different number', async () => {
    const [a, b] = await Promise.all([createBooking(), createBooking()]);
    expect(a.bookingNumber).not.toBe(b.bookingNumber);
  });
});

describe('POST /api/webhooks/razorpay', () => {
  it('rejects a wrong signature', async () => {
    const res = await postWebhook(capturedEvent('order_x', 100), 'wrong-secret');
    expect(res.status).toBe(400);
  });

  it('confirms the booking once, records the coupon and emails customer + admin; a duplicate changes nothing', async () => {
    const { bookingNumber, checkout } = await createBooking({ couponCode: 'NORTH10' });
    const body = capturedEvent(checkout.orderId, checkout.amount);

    expect((await postWebhook(body)).status).toBe(200);
    const booking = await Booking.findOne({ where: { bookingNumber } });
    expect(booking).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'advance_paid',
      amountPaid: checkout.amount,
      balanceDue: booking.totalAmount - checkout.amount,
      expiresAt: null,
    });
    expect(await CouponRedemption.count({ where: { bookingId: booking.id } })).toBe(1);
    expect(testOutbox.filter((m) => m.text.includes(bookingNumber))).toHaveLength(2);

    expect((await postWebhook(body)).status).toBe(200);
    await booking.reload();
    expect(booking.amountPaid).toBe(checkout.amount);
    expect(await CouponRedemption.count({ where: { bookingId: booking.id } })).toBe(1);
    expect(testOutbox.filter((m) => m.text.includes(bookingNumber))).toHaveLength(2);
  });

  it('does not confirm when the amount does not match the order', async () => {
    const { bookingNumber, checkout } = await createBooking();
    await postWebhook(capturedEvent(checkout.orderId, checkout.amount - 100));
    expect((await Booking.findOne({ where: { bookingNumber } })).status).toBe('pending');
  });

  it('keeps the booking pending on payment.failed and stores the reason', async () => {
    const { bookingNumber, checkout } = await createBooking();
    const body = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: { id: 'pay_failed', order_id: checkout.orderId, amount: checkout.amount, error_description: 'Card declined' },
        },
      },
    });
    expect((await postWebhook(body)).status).toBe(200);
    const booking = await Booking.findOne({ where: { bookingNumber }, include: ['payments'] });
    expect(booking.status).toBe('pending');
    expect(booking.payments[0]).toMatchObject({ status: 'failed', failureReason: 'Card declined' });
  });
});

describe('POST /api/payments/verify', () => {
  it('rejects a bad signature', async () => {
    const { checkout } = await createBooking();
    const res = await session.post('/api/payments/verify').send({
      razorpayOrderId: checkout.orderId,
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'not-a-real-signature',
    });
    expect(res.status).toBe(400);
  });

  it('confirms the booking when Razorpay reports the payment captured', async () => {
    const { bookingNumber, checkout } = await createBooking();
    const paymentId = `pay_verify_${runId}`;
    razorpayMock.payment = { id: paymentId, order_id: checkout.orderId, amount: checkout.amount, status: 'captured' };

    const res = await session.post('/api/payments/verify').send({
      razorpayOrderId: checkout.orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sign(process.env.RAZORPAY_KEY_SECRET, `${checkout.orderId}|${paymentId}`),
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ bookingNumber, status: 'confirmed', paymentStatus: 'advance_paid' });
  });
});

describe('expirePendingBookings', () => {
  it('cancels unpaid bookings past their hold and gives the seats back', async () => {
    const { bookingNumber } = await createBooking();
    const seatsWithBooking = (await departure.reload()).bookedSeats;
    await Booking.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { bookingNumber } });

    await expirePendingBookings();

    const booking = await Booking.findOne({ where: { bookingNumber } });
    expect(booking.status).toBe('cancelled');
    expect((await departure.reload()).bookedSeats).toBe(seatsWithBooking - 2);
  });
});
