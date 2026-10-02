import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDays, todayIst } from '../src/lib/dates.js';
import { sequelize } from '../src/lib/db.js';
import { Package, PackageDeparture, PackagePrice } from '../src/models/index.js';
import { api } from './helpers.js';

afterAll(() => sequelize.close());

const ids = {};
beforeAll(async () => {
  for (const slug of ['kedarnath-yatra-package', 'kedarkantha-winter-trek', 'char-dham-yatra-by-road']) {
    const pkg = await Package.findOne({ where: { slug }, include: ['prices'] });
    ids[slug] = { id: pkg.id, prices: Object.fromEntries(pkg.prices.map((p) => [p.priceType, p.id])) };
  }
});

/** A Kedarnath date that is open: at least 3 days ahead and outside the winter closure. */
function openKedarnathDate() {
  const date = addDays(todayIst(), 10);
  const month = Number(date.slice(5, 7));
  return month >= 5 && month <= 10 ? date : `${Number(date.slice(0, 4)) + (month > 10 ? 1 : 0)}-05-15`;
}

const quote = (body) => api().post('/api/pricing/quote').send(body);
const kedarnath = (extra = {}) => ({
  packageId: ids['kedarnath-yatra-package'].id,
  priceId: ids['kedarnath-yatra-package'].prices.per_person,
  counts: { adults: 2 },
  travelDate: openKedarnathDate(),
  ...extra,
});

describe('POST /api/pricing/quote', () => {
  it('reproduces the worked example with NORTH10', async () => {
    const res = await quote(kedarnath({ couponCode: 'north10' }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      quantity: 2,
      seats: 2,
      subtotal: 2599800,
      discount: 200000,
      gstPercent: 5,
      gstAmount: 120000,
      total: 2519800,
      bookingAmountPercent: 20,
      payNow: 504000,
      balanceDue: 2015800,
      coupon: { code: 'NORTH10', valid: true },
    });
    expect(res.body.data.endDate).toBe(addDays(res.body.data.travelDate, 4));
  });

  it('returns the price without the discount and a message for an invalid coupon', async () => {
    const res = await quote(kedarnath({ couponCode: 'COUPLE2000' }));
    expect(res.status).toBe(200);
    expect(res.body.data.discount).toBe(0);
    expect(res.body.data.coupon).toEqual({
      code: 'COUPLE2000',
      valid: false,
      message: 'COUPLE2000 is not valid on this package.',
    });
  });

  it('counts couples by units and infants as free', async () => {
    const res = await quote(
      kedarnath({
        priceId: ids['kedarnath-yatra-package'].prices.per_couple,
        counts: { units: 2, infants: 1 },
      }),
    );
    expect(res.body.data).toMatchObject({ quantity: 2, seats: 4, infants: 1, subtotal: 2399900 * 2 });
  });

  it('rejects dates that are too soon or blocked', async () => {
    const soon = await quote(kedarnath({ travelDate: addDays(todayIst(), 1) }));
    expect(soon.status).toBe(400);
    expect(soon.body.error.fields.travelDate).toMatch(/3 days ahead/);

    const winter = await quote(kedarnath({ travelDate: '2027-01-15' }));
    expect(winter.status).toBe(400);
    expect(winter.body.error.fields.travelDate).toMatch(/closed for winter/);
  });

  it('checks seats on fixed departures and uses the package booking % override', async () => {
    const trek = ids['kedarkantha-winter-trek'];
    const almostFull = await PackageDeparture.findOne({
      where: { packageId: trek.id, startDate: '2026-12-26' },
    });
    const tooMany = await quote({
      packageId: trek.id,
      priceId: trek.prices.per_person,
      counts: { adults: 2 },
      departureId: almostFull.id,
    });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.fields.departureId).toBe('Only 1 seat left on this departure.');

    const charDham = ids['char-dham-yatra-by-road'];
    const departure = await PackageDeparture.findOne({
      where: { packageId: charDham.id, startDate: '2027-05-08' },
    });
    const ok = await quote({
      packageId: charDham.id,
      priceId: charDham.prices.per_person,
      counts: { adults: 1 },
      departureId: departure.id,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({
      travelDate: '2027-05-08',
      endDate: '2027-05-17',
      bookingAmountPercent: 25,
    });
  });

  it('requires a departure for fixed-date packages and an adult for per-person prices', async () => {
    const trek = ids['kedarkantha-winter-trek'];
    const noDate = await quote({
      packageId: trek.id,
      priceId: trek.prices.per_person,
      counts: { adults: 1 },
    });
    expect(noDate.body.error.fields.departureId).toBe('Choose a departure date.');

    const noAdult = await quote(kedarnath({ counts: { children: 2 } }));
    expect(noAdult.body.error.fields['counts.adults']).toBe('Add at least one adult.');
  });

  it('rejects a price option from another package', async () => {
    const otherPrice = await PackagePrice.findOne({
      where: { packageId: ids['char-dham-yatra-by-road'].id },
    });
    const res = await quote(kedarnath({ priceId: otherPrice.id }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields.priceId).toBeTruthy();
  });
});
