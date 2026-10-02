import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/lib/db.js';
import { Destination, PackageDeparture } from '../src/models/index.js';
import { api, loginAsAdmin } from './helpers.js';

const createdIds = [];

// Leave the shared test database as seeded: other test files count packages.
afterAll(async () => {
  for (const id of createdIds) await admin.delete(`/api/admin/packages/${id}`);
  await sequelize.close();
});

let admin;
let destinationId;

beforeAll(async () => {
  admin = await loginAsAdmin();
  destinationId = (await Destination.findOne({ where: { slug: 'munsiyari' } })).id;
});

const details = (overrides = {}) => ({
  destinationId,
  title: 'Munsiyari Slow Travel',
  slug: 'munsiyari-slow-travel',
  tripType: 'family',
  fromCity: 'Kathgodam',
  toCity: 'Kathgodam',
  durationDays: 4,
  durationNights: 3,
  overview: 'Quiet days facing the Panchachuli peaks.',
  availabilityType: 'all_season',
  minDaysBeforeBooking: 5,
  bookingAmountPercent: null,
  isFeatured: false,
  isPopular: false,
  isActive: true,
  ...overrides,
});

const sampleImage = (n) => ({
  url: `https://res.cloudinary.com/demo/image/upload/sample-${n}.jpg`,
  publicId: null,
  altText: `Photo ${n}`,
  width: 1200,
  height: 800,
});

describe('admin packages', () => {
  it('builds a complete all-season package from scratch, tab by tab', async () => {
    const created = await admin.post('/api/admin/packages').send(details());
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    createdIds.push(id);

    await admin
      .put(`/api/admin/packages/${id}/prices`)
      .send({
        prices: [
          {
            label: 'Per person',
            priceType: 'per_person',
            personsCovered: 1,
            originalPrice: 1500000,
            discountedPrice: 1299900,
            isDefault: true,
          },
          { label: 'Per couple', priceType: 'per_couple', personsCovered: 2, originalPrice: 2800000 },
        ],
      })
      .expect(200);
    await admin
      .put(`/api/admin/packages/${id}/itinerary`)
      .send({
        days: [
          { dayNumber: 1, title: 'Kathgodam to Munsiyari', description: 'Long scenic drive.' },
          { dayNumber: 2, title: 'Khaliya top walk', description: 'Easy hike.', meals: 'Breakfast, Dinner' },
        ],
      })
      .expect(200);
    await admin
      .put(`/api/admin/packages/${id}/inclusions`)
      .send({
        items: [
          { type: 'included', text: 'Homestay' },
          { type: 'excluded', text: 'Lunch' },
        ],
      })
      .expect(200);
    await admin
      .put(`/api/admin/packages/${id}/highlights`)
      .send({ items: [{ title: 'Views', text: 'Panchachuli at sunrise' }] })
      .expect(200);
    await admin
      .put(`/api/admin/packages/${id}/hotels`)
      .send({
        items: [
          { name: 'Panchachuli Homestay', rating: 4.6, roomType: 'Double', nights: 3, amenities: 'Heater' },
        ],
      })
      .expect(200);
    await admin
      .put(`/api/admin/packages/${id}/faqs`)
      .send({ items: [{ question: 'Is it cold?', answer: 'Yes, carry warm layers.' }] })
      .expect(200);
    await admin
      .put(`/api/admin/packages/${id}/blocked-dates`)
      .send({ blockedDates: [{ startDate: '2027-01-01', endDate: '2027-02-15', reason: 'Snowbound road' }] })
      .expect(200);
    const withImages = await admin
      .post(`/api/admin/packages/${id}/images`)
      .send({ images: [1, 2, 3, 4, 5, 6].map(sampleImage) });
    expect(withImages.body.data.images).toHaveLength(6);

    const publicView = await api().get('/api/packages/munsiyari-slow-travel');
    expect(publicView.status).toBe(200);
    expect(publicView.body.data).toMatchObject({
      prices: [
        { label: 'Per person', sellingPrice: 1299900 },
        { label: 'Per couple', sellingPrice: 2800000 },
      ],
      itinerary: [{ dayNumber: 1 }, { dayNumber: 2 }],
      included: ['Homestay'],
      excluded: ['Lunch'],
      hotels: [{ name: 'Panchachuli Homestay', rating: 4.6 }],
      blockedDates: [{ startDate: '2027-01-01' }],
    });
    expect(publicView.body.data.images).toHaveLength(6);
  });

  it('builds a fixed-date package with departures and protects booked seats', async () => {
    const created = await admin.post('/api/admin/packages').send(
      details({
        title: 'Munsiyari Group Departure',
        slug: 'munsiyari-group-departure',
        availabilityType: 'fixed_date',
      }),
    );
    const id = created.body.data.id;
    createdIds.push(id);
    await admin
      .put(`/api/admin/packages/${id}/prices`)
      .send({
        prices: [{ label: 'Per person', priceType: 'per_person', personsCovered: 1, originalPrice: 999900 }],
      })
      .expect(200);

    const saved = await admin.put(`/api/admin/packages/${id}/departures`).send({
      departures: [
        { startDate: '2027-04-10', totalSeats: 10, isActive: true },
        { startDate: '2027-05-10', totalSeats: null, isActive: true },
      ],
    });
    expect(saved.status).toBe(200);
    const [april, may] = saved.body.data.departures;
    expect(may.totalSeats).toBeNull();

    // Simulate 6 booked seats, then try to cut the seats below that.
    await PackageDeparture.update({ bookedSeats: 6 }, { where: { id: april.id } });
    const tooFew = await admin.put(`/api/admin/packages/${id}/departures`).send({
      departures: [{ id: april.id, startDate: '2027-04-10', totalSeats: 5, isActive: true }],
    });
    expect(tooFew.status).toBe(400);
    expect(tooFew.body.error.fields['departures.0.totalSeats']).toBeTruthy();

    const removeBooked = await admin.put(`/api/admin/packages/${id}/departures`).send({
      departures: [{ id: may.id, startDate: '2027-05-10', totalSeats: null, isActive: true }],
    });
    expect(removeBooked.status).toBe(409);
    expect(removeBooked.body.error.message).toContain('has bookings');

    const keep = await admin.put(`/api/admin/packages/${id}/departures`).send({
      departures: [{ id: april.id, startDate: '2027-04-10', totalSeats: 8, isActive: true }],
    });
    expect(keep.status).toBe(200);
    expect(keep.body.data.departures).toEqual([
      expect.objectContaining({ id: april.id, totalSeats: 8, bookedSeats: 6 }),
    ]);

    const publicView = await api().get('/api/packages/munsiyari-group-departure');
    expect(publicView.body.data.departures[0]).toMatchObject({ seatsLeft: 2 });
  });

  it('rejects a duplicate slug with a field error', async () => {
    const res = await admin.post('/api/admin/packages').send(details({ slug: 'kedarnath-yatra-package' }));
    expect(res.status).toBe(409);
    expect(res.body.error.fields.slug).toBeTruthy();
  });

  it('keeps the price option ids so bookings stay linked', async () => {
    const pkg = (await admin.get('/api/admin/packages?search=Kedarnath')).body.data[0];
    const full = (await admin.get(`/api/admin/packages/${pkg.id}`)).body.data;
    const prices = full.prices.map(
      ({ id, label, priceType, personsCovered, originalPrice, discountedPrice, note, isDefault }) => ({
        id,
        label,
        priceType,
        personsCovered,
        originalPrice,
        discountedPrice,
        note,
        isDefault,
      }),
    );
    prices[0].discountedPrice = 1199900;
    const res = await admin.put(`/api/admin/packages/${pkg.id}/prices`).send({ prices });
    expect(res.body.data.prices.map((p) => p.id)).toEqual(full.prices.map((p) => p.id));
    expect(res.body.data.prices[0].discountedPrice).toBe(1199900);

    prices[0].discountedPrice = full.prices[0].discountedPrice;
    await admin.put(`/api/admin/packages/${pkg.id}/prices`).send({ prices }).expect(200);
  });

  it('toggles flags and the public site follows', async () => {
    const pkg = (await admin.get('/api/admin/packages?search=Yoga')).body.data[0];

    const off = await admin.patch(`/api/admin/packages/${pkg.id}/flags`).send({ isActive: false });
    expect(off.body.data.isActive).toBe(false);
    await api().get(`/api/packages/${pkg.slug}`).expect(404);

    await admin
      .patch(`/api/admin/packages/${pkg.id}/flags`)
      .send({ isActive: true, isFeatured: true })
      .expect(200);
    const list = await api().get('/api/packages?pageSize=50');
    expect(list.body.data.find((p) => p.slug === pkg.slug).isFeatured).toBe(true);
    await admin.patch(`/api/admin/packages/${pkg.id}/flags`).send({ isFeatured: false }).expect(200);
  });

  it('persists a new order', async () => {
    const ids = (await admin.get('/api/admin/packages')).body.data.map((p) => p.id);
    const reversed = [...ids].reverse();
    await admin.patch('/api/admin/packages/reorder').send({ ids: reversed }).expect(200);
    expect((await admin.get('/api/admin/packages')).body.data.map((p) => p.id)).toEqual(reversed);
    await admin.patch('/api/admin/packages/reorder').send({ ids }).expect(200);
  });

  it('duplicates a package as an inactive copy with every list', async () => {
    const source = (await admin.get('/api/admin/packages?search=Char Dham')).body.data[0];
    const copy = await admin.post(`/api/admin/packages/${source.id}/duplicate`);
    expect(copy.status).toBe(201);
    expect(copy.body.data).toMatchObject({ slug: 'char-dham-yatra-by-road-copy', isActive: false });
    expect(copy.body.data.itineraryDays).toHaveLength(10);
    expect(copy.body.data.departures.every((d) => d.bookedSeats === 0)).toBe(true);

    await admin.delete(`/api/admin/packages/${copy.body.data.id}`).expect(200);
  });

  it('filters the admin list', async () => {
    const fixed = await admin.get('/api/admin/packages?availabilityType=fixed_date&isActive=true');
    expect(fixed.body.data.every((p) => p.availabilityType === 'fixed_date' && p.isActive)).toBe(true);
  });
});
