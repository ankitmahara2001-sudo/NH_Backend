import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/lib/db.js';
import { Booking, BookingTraveller, Customer, Package, Payment } from '../src/models/index.js';
import { api, loginAsCustomer } from './helpers.js';

afterAll(() => sequelize.close());

const runId = Date.now();
const ownerEmail = `bookings-owner-${runId}@example.com`;
const otherEmail = `bookings-other-${runId}@example.com`;
// Year 2099 keeps these numbers clear of real NH-<year>-… bookings created by other tests.
let sequence = Number(String(runId).slice(-5));
const nextBookingNumber = () => `NH-2099-${String((sequence += 1)).padStart(5, '0')}`;

function bookingFor(customer, pkg, createdAt) {
  return Booking.create({
    bookingNumber: nextBookingNumber(),
    customerId: customer.id,
    packageId: pkg.id,
    travelDate: '2099-05-10',
    endDate: '2099-05-14',
    pickupPoint: 'Haridwar Railway Station',
    adults: 2,
    seats: 2,
    leadName: 'Priya Sharma',
    leadEmail: customer.email,
    leadPhone: '9876543210',
    status: 'confirmed',
    paymentStatus: 'advance_paid',
    packageTitle: pkg.title,
    priceLabel: 'Per person',
    priceType: 'per_person',
    unitPrice: 1_299_900,
    quantity: 2,
    subtotal: 2_599_800,
    couponCode: 'NORTH10',
    discountAmount: 200_000,
    gstPercent: 5,
    gstAmount: 120_000,
    totalAmount: 2_519_800,
    bookingAmountPercent: 20,
    payNowAmount: 504_000,
    amountPaid: 504_000,
    balanceDue: 2_015_800,
    createdAt,
  });
}

let owner;
let ownerSession;
let pkg;
let olderBooking;
let newerBooking;
let otherBooking;

beforeAll(async () => {
  ownerSession = await loginAsCustomer(ownerEmail);
  await loginAsCustomer(otherEmail);
  owner = await Customer.findOne({ where: { email: ownerEmail } });
  const other = await Customer.findOne({ where: { email: otherEmail } });
  pkg = await Package.findOne({ order: [['id', 'ASC']] });

  olderBooking = await bookingFor(owner, pkg, new Date('2026-01-01T10:00:00Z'));
  newerBooking = await bookingFor(owner, pkg, new Date('2026-02-01T10:00:00Z'));
  otherBooking = await bookingFor(other, pkg, new Date('2026-03-01T10:00:00Z'));

  await BookingTraveller.bulkCreate([
    { bookingId: newerBooking.id, fullName: 'Priya Sharma', age: 32, gender: 'female', isLead: true },
    { bookingId: newerBooking.id, fullName: 'Rohan Sharma', age: 34, gender: 'male', isLead: false },
  ]);
  await Payment.create({
    bookingId: newerBooking.id,
    paymentType: 'advance',
    method: 'razorpay',
    amount: 504_000,
    status: 'captured',
    razorpayOrderId: `order_test_${runId}`,
    rawPayload: { secret: 'never-exposed' },
    paidAt: new Date('2026-02-01T10:05:00Z'),
  });
});

describe('customer bookings', () => {
  it('requires login', async () => {
    expect((await api().get('/api/me/bookings')).status).toBe(401);
    expect((await api().get(`/api/me/bookings/${newerBooking.bookingNumber}`)).status).toBe(401);
  });

  it('lists only the customer’s own bookings, newest first', async () => {
    const res = await ownerSession.get('/api/me/bookings');

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((b) => b.bookingNumber);
    expect(numbers).toEqual([newerBooking.bookingNumber, olderBooking.bookingNumber]);
    expect(numbers).not.toContain(otherBooking.bookingNumber);
    expect(res.body.data[0]).toMatchObject({
      packageTitle: pkg.title,
      packageSlug: pkg.slug,
      coverImageUrl: pkg.coverImageUrl,
      priceLabel: 'Per person',
      travelDate: '2099-05-10',
      endDate: '2099-05-14',
      seats: 2,
      adults: 2,
      status: 'confirmed',
      paymentStatus: 'advance_paid',
      totalAmount: 2_519_800,
      payNowAmount: 504_000,
      amountPaid: 504_000,
      balanceDue: 2_015_800,
    });
    expect(res.body.data[0]).not.toHaveProperty('customerId');
  });

  it('returns the full detail of an own booking with travellers and payments', async () => {
    const res = await ownerSession.get(`/api/me/bookings/${newerBooking.bookingNumber}`);

    expect(res.status).toBe(200);
    const booking = res.body.data;
    expect(booking).toMatchObject({
      bookingNumber: newerBooking.bookingNumber,
      packageSlug: pkg.slug,
      pickupPoint: 'Haridwar Railway Station',
      leadName: 'Priya Sharma',
      unitPrice: 1_299_900,
      quantity: 2,
      subtotal: 2_599_800,
      couponCode: 'NORTH10',
      discountAmount: 200_000,
      gstPercent: 5,
      gstAmount: 120_000,
      totalAmount: 2_519_800,
      bookingAmountPercent: 20,
      refundedAmount: 0,
      cancelReason: null,
    });
    expect(booking.travellers).toEqual([
      { fullName: 'Priya Sharma', age: 32, gender: 'female', isLead: true },
      { fullName: 'Rohan Sharma', age: 34, gender: 'male', isLead: false },
    ]);
    expect(booking.payments).toEqual([
      {
        paymentType: 'advance',
        method: 'razorpay',
        amount: 504_000,
        status: 'captured',
        paidAt: '2026-02-01T10:05:00.000Z',
      },
    ]);
    expect(JSON.stringify(booking)).not.toContain('never-exposed');
  });

  it('returns 404 for another customer’s booking', async () => {
    const res = await ownerSession.get(`/api/me/bookings/${otherBooking.bookingNumber}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects a malformed booking number', async () => {
    const res = await ownerSession.get('/api/me/bookings/not-a-number');
    expect(res.status).toBe(400);
  });
});
