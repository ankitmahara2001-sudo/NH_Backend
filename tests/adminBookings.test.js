import { Op } from 'sequelize';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { todayIst } from '../src/lib/dates.js';
import { sequelize } from '../src/lib/db.js';
import { Booking, Customer, Package, PackageDeparture, PackagePrice, Payment } from '../src/models/index.js';
import { api, clearOutbox, loginAsAdmin, testOutbox } from './helpers.js';

// Admin-panel bookings paid offline (cash / UPI / bank transfer): confirmed at once, receipt mailed.

afterAll(() => sequelize.close());

const runId = Date.now();
let admin;
let departure;
let price;

const tripChoice = (overrides = {}) => ({
  packageId: departure.packageId,
  priceId: price.id,
  departureId: departure.id,
  counts: { adults: 2 },
  ...overrides,
});

function bookingBody(overrides = {}) {
  return {
    ...tripChoice(),
    leadName: 'Anita Rawat',
    leadEmail: `cash-${runId}@example.com`,
    leadPhone: '9876543210',
    travellers: [
      { fullName: 'Anita Rawat', age: 41, gender: 'female' },
      { fullName: 'Vikram Rawat', age: 44, gender: 'male' },
    ],
    payment: { method: 'cash', amount: 500000 },
    ...overrides,
  };
}

const receiptsTo = (email) => testOutbox.filter((m) => m.to === email);

beforeAll(async () => {
  admin = await loginAsAdmin();
  departure = await PackageDeparture.findOne({
    where: { isActive: true, totalSeats: { [Op.gte]: 10 }, startDate: { [Op.gt]: todayIst() } },
    include: [{ model: Package, as: 'package', where: { availabilityType: 'fixed_date', isActive: true } }],
    order: [['startDate', 'ASC']],
  });
  price = await PackagePrice.findOne({ where: { packageId: departure.packageId, priceType: 'per_person' } });
  await departure.update({ totalSeats: departure.bookedSeats + 100 });
});

beforeEach(() => clearOutbox());

describe('POST /api/admin/bookings/quote', () => {
  it('needs an admin session', async () => {
    const res = await api().post('/api/admin/bookings/quote').send(tripChoice());
    expect(res.status).toBe(401);
  });

  it('takes the manual discount off before GST', async () => {
    const plain = (await admin.post('/api/admin/bookings/quote').send(tripChoice())).body.data;
    const res = await admin.post('/api/admin/bookings/quote').send(tripChoice({ manualDiscount: 100000 }));
    expect(res.status).toBe(200);
    expect(res.body.data.manualDiscount).toBe(100000);
    expect(res.body.data.taxable).toBe(plain.taxable - 100000);
    expect(res.body.data.total).toBeLessThan(plain.total);
  });

  it('refuses a discount larger than the price', async () => {
    const res = await admin
      .post('/api/admin/bookings/quote')
      .send(tripChoice({ manualDiscount: 1_000_000_000 }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('manualDiscount');
  });
});

describe('POST /api/admin/bookings', () => {
  it('confirms the booking, records the cash and mails a receipt with the price breakdown', async () => {
    const seatsBefore = (await departure.reload()).bookedSeats;
    const quote = (
      await admin.post('/api/admin/bookings/quote').send(tripChoice({ manualDiscount: 150000 }))
    ).body.data;

    const res = await admin.post('/api/admin/bookings').send(
      bookingBody({
        manualDiscount: 150000,
        manualDiscountReason: 'Repeat customer',
        payment: { method: 'cash', amount: 500000, notes: 'Paid at the office' },
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.meta.emailSent).toBe(true);
    const booking = res.body.data;
    expect(booking).toMatchObject({
      source: 'admin',
      status: 'confirmed',
      paymentStatus: 'advance_paid',
      manualDiscount: 150000,
      manualDiscountReason: 'Repeat customer',
      totalAmount: quote.total,
      amountPaid: 500000,
      balanceDue: quote.total - 500000,
      expiresAt: null,
    });
    expect(booking.payments).toHaveLength(1);
    expect(booking.payments[0]).toMatchObject({ method: 'cash', status: 'recorded', amount: 500000 });
    expect((await departure.reload()).bookedSeats).toBe(seatsBefore + 2);

    const customer = await Customer.findOne({ where: { email: `cash-${runId}@example.com` } });
    expect(customer).toMatchObject({ name: 'Anita Rawat', phone: '9876543210' });

    const [receipt] = receiptsTo(`cash-${runId}@example.com`);
    expect(receipt.subject).toContain(booking.bookingNumber);
    expect(receipt.text).toContain('Discount (Repeat customer)');
    expect(receipt.text).toContain('Paid by: Cash');
    expect(receipt.text).toContain('Amount received: ₹5,000');
    expect(receipt.text).toMatch(/Total \(incl\. GST\): ₹/);
    expect(receipt.text).toMatch(/Balance due: ₹/);
  });

  it('marks the booking fully paid when the full amount was collected', async () => {
    const res = await admin
      .post('/api/admin/bookings')
      .send(bookingBody({ payment: { method: 'upi', collectedInFull: true, reference: 'UPI-123' } }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ paymentStatus: 'fully_paid', balanceDue: 0 });
    expect(res.body.data.amountPaid).toBe(res.body.data.totalAmount);
    const [receipt] = receiptsTo(`cash-${runId}@example.com`);
    expect(receipt.subject).toContain('Booking confirmed');
    expect(receipt.text).toContain('Reference: UPI-123');
    expect(receipt.attachments).toHaveLength(1);
    expect(receipt.attachments[0].filename).toMatch(/^Receipt-NH-\d{4}-\d{5}-\d+\.pdf$/);
    expect(receipt.attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('refuses more than the total and saves nothing', async () => {
    const before = await Booking.count();
    const res = await admin
      .post('/api/admin/bookings')
      .send(bookingBody({ payment: { method: 'cash', amount: 1_000_000_000 } }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty(['payment.amount']);
    expect(await Booking.count()).toBe(before);
  });

  it('needs the amount unless collected in full', async () => {
    const res = await admin.post('/api/admin/bookings').send(bookingBody({ payment: { method: 'cash' } }));
    expect(res.status).toBe(400);
  });

  it('skips the email when asked', async () => {
    const res = await admin.post('/api/admin/bookings').send(bookingBody({ sendEmail: false }));
    expect(res.status).toBe(201);
    expect(res.body.meta.emailSent).toBe(false);
    expect(receiptsTo(`cash-${runId}@example.com`)).toHaveLength(0);
  });
});

describe('POST /api/admin/bookings/:id/payments', () => {
  it('records part of the balance, then the rest, mailing a receipt each time', async () => {
    const created = (await admin.post('/api/admin/bookings').send(bookingBody())).body.data;
    clearOutbox();

    const part = await admin
      .post(`/api/admin/bookings/${created.id}/payments`)
      .send({ method: 'cash', amount: 100000 });
    expect(part.status).toBe(201);
    expect(part.body.data).toMatchObject({
      paymentStatus: 'advance_paid',
      amountPaid: created.amountPaid + 100000,
      balanceDue: created.balanceDue - 100000,
    });

    const rest = await admin
      .post(`/api/admin/bookings/${created.id}/payments`)
      .send({ method: 'bank_transfer', collectedInFull: true });
    expect(rest.status).toBe(201);
    expect(rest.body.data).toMatchObject({ paymentStatus: 'fully_paid', balanceDue: 0 });
    expect(rest.body.data.amountPaid).toBe(created.totalAmount);

    const payments = await Payment.findAll({ where: { bookingId: created.id, paymentType: 'balance' } });
    expect(payments).toHaveLength(2);
    const mails = receiptsTo(`cash-${runId}@example.com`);
    expect(mails).toHaveLength(2);
    expect(mails[1].subject).toContain('fully paid');

    const again = await admin
      .post(`/api/admin/bookings/${created.id}/payments`)
      .send({ method: 'cash', amount: 100 });
    expect(again.status).toBe(400);
  });

  it('refuses more than the balance due', async () => {
    const created = (await admin.post('/api/admin/bookings').send(bookingBody())).body.data;
    const res = await admin
      .post(`/api/admin/bookings/${created.id}/payments`)
      .send({ method: 'cash', amount: created.balanceDue + 100 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('amount');
  });
});

describe('POST /api/admin/bookings/:id/cancel', () => {
  it('cancels with a reason, frees the seats and mails a cancellation note', async () => {
    const created = (await admin.post('/api/admin/bookings').send(bookingBody())).body.data;
    const seatsBefore = (await departure.reload()).bookedSeats;
    clearOutbox();

    const res = await admin
      .post(`/api/admin/bookings/${created.id}/cancel`)
      .send({ reason: 'Customer requested cancellation' });
    expect(res.status).toBe(200);
    expect(res.body.meta.emailSent).toBe(true);
    expect(res.body.data).toMatchObject({
      status: 'cancelled',
      cancelReason: 'Customer requested cancellation',
      amountPaid: created.amountPaid,
    });
    expect(res.body.data.cancelledAt).toBeTruthy();
    expect((await departure.reload()).bookedSeats).toBe(seatsBefore - 2);

    const [mail] = receiptsTo(`cash-${runId}@example.com`);
    expect(mail.subject).toContain(`Booking cancelled – ${created.bookingNumber}`);
    expect(mail.text).toContain('Reason: Customer requested cancellation');
    expect(mail.text).toContain('refund');
    expect(mail.attachments[0].filename).toBe(`Cancellation-${created.bookingNumber}.pdf`);
    expect(mail.attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');

    const again = await admin.post(`/api/admin/bookings/${created.id}/cancel`).send({ reason: 'Twice' });
    expect(again.status).toBe(400);
  });

  it('needs a reason and can skip the email', async () => {
    const created = (await admin.post('/api/admin/bookings').send(bookingBody())).body.data;
    expect((await admin.post(`/api/admin/bookings/${created.id}/cancel`).send({ reason: ' ' })).status).toBe(400);

    clearOutbox();
    const res = await admin
      .post(`/api/admin/bookings/${created.id}/cancel`)
      .send({ reason: 'Duplicate booking', sendEmail: false });
    expect(res.status).toBe(200);
    expect(res.body.meta.emailSent).toBe(false);
    expect(receiptsTo(`cash-${runId}@example.com`)).toHaveLength(0);
  });

  it('lists bookings by source', async () => {
    const res = await admin.get('/api/admin/bookings?source=admin');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((b) => b.source === 'admin')).toBe(true);
  });
});

describe('manual "seats left online"', () => {
  it('limits website bookings to the manual figure but not admin bookings', async () => {
    await departure.reload();
    const packageId = departure.packageId;
    const pkg = (await admin.get(`/api/admin/packages/${packageId}`)).body.data;
    const departures = pkg.departures.map(({ id, startDate, totalSeats, onlineSeatsLeft, isActive }) => ({
      id,
      startDate,
      totalSeats,
      onlineSeatsLeft: id === departure.id ? 1 : onlineSeatsLeft,
      isActive,
    }));
    const saved = await admin.put(`/api/admin/packages/${packageId}/departures`).send({ departures });
    expect(saved.status).toBe(200);
    expect(saved.body.data.departures.find((d) => d.id === departure.id)).toMatchObject({
      onlineSeatsLeft: 1,
      websiteSeatsLeft: 1,
    });

    const website = await api().post('/api/pricing/quote').send(tripChoice());
    expect(website.status).toBe(400);
    expect(website.body.error.message).toContain('Only 1 seat left');

    const offline = await admin.post('/api/admin/bookings/quote').send(tripChoice());
    expect(offline.status).toBe(200);

    const tooMany = await admin.put(`/api/admin/packages/${packageId}/departures`).send({
      departures: departures.map((d) => (d.id === departure.id ? { ...d, onlineSeatsLeft: 100_000 } : d)),
    });
    expect(tooMany.status).toBe(400);

    // Clear it again: the real count applies.
    await admin.put(`/api/admin/packages/${packageId}/departures`).send({
      departures: departures.map((d) => (d.id === departure.id ? { ...d, onlineSeatsLeft: null } : d)),
    });
    expect((await api().post('/api/pricing/quote').send(tripChoice())).status).toBe(200);
  });
});
