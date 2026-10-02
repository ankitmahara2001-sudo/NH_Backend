import { afterAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/lib/db.js';
import { Package } from '../src/models/index.js';
import { api, clearOutbox, testOutbox } from './helpers.js';

afterAll(() => sequelize.close());

const titles = (res) => res.body.data.map((p) => p.title);

describe('GET /api/packages', () => {
  it('lists active packages with card data in the { data, meta } shape', async () => {
    const res = await api().get('/api/packages?pageSize=50');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 50, total: 9 });
    const kedarnath = res.body.data.find((p) => p.slug === 'kedarnath-yatra-package');
    expect(kedarnath).toMatchObject({
      title: 'Kedarnath Yatra Package',
      destination: { name: 'Kedarnath' },
      durationDays: 5,
      isFeatured: true,
      price: { sellingPrice: 1299900, originalPrice: 1599900, priceType: 'per_person', savingPercent: 19 },
    });
    expect(kedarnath.reviewCount).toBeGreaterThan(0);
  });

  it('puts featured packages first in the recommended sort', async () => {
    const res = await api().get('/api/packages?pageSize=50');
    const firstNonFeatured = res.body.data.findIndex((p) => !p.isFeatured);
    expect(res.body.data.slice(firstNonFeatured).every((p) => !p.isFeatured)).toBe(true);
  });

  it('filters by trip type and destination', async () => {
    const treks = await api().get('/api/packages?tripType=trekking');
    expect(titles(treks).sort()).toEqual(['Kedarkantha Winter Trek', 'Valley of Flowers Trek']);

    const rishikesh = await api().get('/api/packages?destination=rishikesh');
    expect(titles(rishikesh).sort()).toEqual(['Rishikesh Rafting & Camping', 'Rishikesh Yoga Retreat']);
  });

  it('filters by duration buckets (repeatable)', async () => {
    const long = await api().get('/api/packages?duration=long');
    expect(titles(long)).toEqual(['Char Dham Yatra by Road']);

    const shortOrLong = await api().get('/api/packages?duration=short&duration=long&pageSize=50');
    expect(shortOrLong.body.data.every((p) => p.durationDays <= 3 || p.durationDays >= 7)).toBe(true);
    expect(shortOrLong.body.meta.total).toBe(3);
  });

  it('filters by price range (paise) and price type', async () => {
    const cheap = await api().get('/api/packages?maxPrice=1000000');
    expect(titles(cheap)).toEqual(['Rishikesh Rafting & Camping']);

    const groups = await api().get('/api/packages?priceType=per_group&pageSize=50');
    expect(titles(groups).sort()).toEqual([
      'Jim Corbett Wildlife Weekend',
      'Kedarnath Yatra Package',
      'Nainital & Mussoorie Holiday',
    ]);
  });

  it('sorts by price and paginates', async () => {
    const asc = await api().get('/api/packages?sort=price_asc&pageSize=3');
    const prices = asc.body.data.map((p) => p.price.sellingPrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(asc.body.data[0].title).toBe('Rishikesh Rafting & Camping');
    expect(asc.body.meta).toEqual({ page: 1, pageSize: 3, total: 9 });

    const page3 = await api().get('/api/packages?sort=price_asc&pageSize=3&page=3');
    expect(page3.body.data).toHaveLength(3);
  });

  it('filters by travel month: fixed-date packages need a departure that month', async () => {
    const july = await api().get('/api/packages?month=2027-07&tripType=trekking');
    expect(titles(july)).toEqual(['Valley of Flowers Trek']);

    // Kedarnath is blocked for the whole of January.
    const january = await api().get('/api/packages?month=2027-01&destination=kedarnath');
    expect(january.body.data).toHaveLength(0);
  });

  it('rejects invalid filters', async () => {
    const res = await api().get('/api/packages?tripType=space');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/packages/:slug', () => {
  it('returns full detail with ordered child lists and pricing settings', async () => {
    const res = await api().get('/api/packages/kedarnath-yatra-package');

    expect(res.status).toBe(200);
    const pkg = res.body.data;
    expect(pkg.prices.map((p) => p.label)).toEqual(['Per person', 'Per couple', 'Group of 4']);
    expect(pkg.itinerary.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(pkg.included).toHaveLength(5);
    expect(pkg.excluded).toHaveLength(4);
    expect(pkg.hotels[0].rating).toBe(4.3);
    expect(pkg.faqs).toHaveLength(5);
    expect(pkg.pricing).toMatchObject({ gstPercent: 5, bookingAmountPercent: 20 });
    expect(pkg.blockedDates.length).toBeGreaterThan(0);
  });

  it('shows departures with seats left for fixed-date packages', async () => {
    const res = await api().get('/api/packages/kedarkantha-winter-trek');
    const departures = res.body.data.departures;
    expect(departures.length).toBeGreaterThan(0);
    expect(departures.find((d) => d.startDate === '2026-12-26')).toMatchObject({
      seatsLeft: 1,
      soldOut: false,
    });
    expect(res.body.data.pricing.bookingAmountPercent).toBe(20);
  });

  it('uses the package booking % override when set', async () => {
    const res = await api().get('/api/packages/char-dham-yatra-by-road');
    expect(res.body.data.pricing.bookingAmountPercent).toBe(25);
  });

  it('returns 404 for an inactive package', async () => {
    await Package.update({ isActive: false }, { where: { slug: 'rishikesh-yoga-retreat' } });
    try {
      const res = await api().get('/api/packages/rishikesh-yoga-retreat');
      expect(res.status).toBe(404);
      const list = await api().get('/api/packages?pageSize=50');
      expect(titles(list)).not.toContain('Rishikesh Yoga Retreat');
    } finally {
      await Package.update({ isActive: true }, { where: { slug: 'rishikesh-yoga-retreat' } });
    }
  });

  it('returns availability for a month', async () => {
    const fixed = await api().get('/api/packages/valley-of-flowers-trek/availability?month=2027-07');
    expect(fixed.body.data.departures.map((d) => d.startDate)).toEqual(['2027-07-10', '2027-07-24']);

    const allSeason = await api().get('/api/packages/kedarnath-yatra-package/availability?month=2027-01');
    expect(allSeason.body.data.blockedDates).toHaveLength(1);
    expect(allSeason.body.data.earliestTravelDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('other public content', () => {
  it('GET /api/home returns every home section', async () => {
    const res = await api().get('/api/home');
    const { slides, destinations, packages, offers, gallery, reviews, posts } = res.body.data;
    expect(slides).toHaveLength(4);
    expect(destinations).toHaveLength(4);
    expect(packages.every((p) => p.isPopular)).toBe(true);
    expect(offers).toHaveLength(3);
    expect(gallery).toHaveLength(5);
    expect(reviews).toHaveLength(3);
    expect(posts).toHaveLength(3);
  });

  it('GET /api/destinations includes active package counts', async () => {
    const res = await api().get('/api/destinations');
    expect(res.body.data.find((d) => d.slug === 'rishikesh').packageCount).toBe(2);
  });

  it('GET /api/offers lists in-date coupons with their package restrictions', async () => {
    const res = await api().get('/api/offers');
    const codes = res.body.data.map((o) => o.code);
    expect(codes).toContain('NORTH10');
    const chardham = res.body.data.find((o) => o.code === 'CHARDHAM1500');
    expect(chardham.packages.map((p) => p.slug)).toEqual(['char-dham-yatra-by-road']);
  });

  it('GET /api/gallery filters by category', async () => {
    const res = await api().get('/api/gallery?category=snow');
    expect(res.body.data).toHaveLength(3);
  });

  it('GET /api/blog returns the featured post separately and paginates the rest', async () => {
    const res = await api().get('/api/blog?pageSize=4');
    expect(res.body.data.featured.slug).toBe('complete-kedarnath-yatra-guide-2026');
    expect(res.body.data.posts).toHaveLength(4);
    expect(res.body.meta.total).toBe(6);
  });

  it('GET /api/blog/:slug returns content, related posts and the related package', async () => {
    const res = await api().get('/api/blog/complete-kedarnath-yatra-guide-2026');
    expect(res.body.data.content).toContain('<h2>When to go</h2>');
    expect(res.body.data.relatedPosts).toHaveLength(3);
    expect(res.body.data.relatedPosts[0].category).toBe('planning');
    expect(res.body.data.relatedPackage.slug).toBe('kedarnath-yatra-package');
  });

  it('GET /api/settings/public returns site settings', async () => {
    const res = await api().get('/api/settings/public');
    expect(res.body.data.gst_percent).toBe(5);
    expect(res.body.data.home.hero.heading).toBe('Journeys into the heart of the Himalayas');
  });
});

describe('POST /api/enquiries', () => {
  it('saves the enquiry and emails the admin', async () => {
    clearOutbox();
    const res = await api().post('/api/enquiries').send({
      name: 'Rohan Das',
      email: 'rohan@example.com',
      phone: '98765 43210',
      message: 'Kedarnath in May?',
    });

    expect(res.status).toBe(201);
    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0].subject).toBe('New enquiry: Rohan Das');
  });

  it('returns field errors for invalid input', async () => {
    const res = await api().post('/api/enquiries').send({ name: '', email: 'x', phone: '12' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'name', 'phone']);
  });
});
