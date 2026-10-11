import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isCloudinaryConfigured } from '../src/lib/cloudinary.js';
import { sequelize } from '../src/lib/db.js';
import { api, loginAsAdmin } from './helpers.js';

afterAll(() => sequelize.close());

let admin;
beforeAll(async () => {
  admin = await loginAsAdmin();
});

describe('admin content', () => {
  it('requires the admin session on every admin route', async () => {
    for (const path of [
      '/api/admin/dashboard',
      '/api/admin/packages',
      '/api/admin/settings',
      '/api/admin/customers',
    ]) {
      expect((await api().get(path)).status).toBe(401);
    }
  });

  it('returns dashboard numbers', async () => {
    const res = await admin.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    // Other test files create bookings in the same database, so only the shape is fixed.
    const amount = expect.any(Number);
    expect(res.body.data).toMatchObject({ bookingsToday: amount, revenueThisMonth: amount, balancePending: amount });
    expect(res.body.data.upcomingDepartures.length).toBeGreaterThan(0);
  });

  it('saves settings and /settings/public returns them', async () => {
    const current = (await admin.get('/api/admin/settings')).body.data;

    await admin.put('/api/admin/settings/gst_percent').send({ value: 12 }).expect(200);
    const home = { ...current.home, hero: { ...current.home.hero, heading: 'New hero heading' } };
    await admin.put('/api/admin/settings/home').send({ value: home }).expect(200);

    const publicSettings = (await api().get('/api/settings/public')).body.data;
    expect(publicSettings.gst_percent).toBe(12);
    expect(publicSettings.home.hero.heading).toBe('New hero heading');

    await admin.put('/api/admin/settings/gst_percent').send({ value: current.gst_percent }).expect(200);
    await admin.put('/api/admin/settings/home').send({ value: current.home }).expect(200);
  });

  it('validates settings values', async () => {
    const res = await admin.put('/api/admin/settings/default_booking_percent').send({ value: 0 });
    expect(res.status).toBe(400);
  });

  it('sanitises policy HTML', async () => {
    const { policies } = (await admin.get('/api/admin/settings')).body.data;
    const value = {
      ...policies,
      privacy: { title: 'Privacy', content: '<p>Hi</p><script>alert(1)</script>' },
    };
    const res = await admin.put('/api/admin/settings/policies').send({ value });
    expect(res.body.data.privacy.content).toBe('<p>Hi</p>');
  });

  it('runs destination CRUD', async () => {
    const created = await admin.post('/api/admin/destinations').send({
      name: 'Chopta',
      slug: 'chopta',
      region: 'garhwal',
      district: 'Rudraprayag',
      shortDescription: 'Meadows below Tungnath.',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    await admin
      .put(`/api/admin/destinations/${id}`)
      .send({ name: 'Chopta', slug: 'chopta', region: 'garhwal', district: 'Rudraprayag', isActive: false })
      .expect(200);
    expect((await api().get('/api/destinations')).body.data.map((d) => d.slug)).not.toContain('chopta');

    await admin.delete(`/api/admin/destinations/${id}`).expect(200);
  });

  it('refuses to delete a destination that still has packages', async () => {
    const kedarnath = (await admin.get('/api/admin/destinations')).body.data.find(
      (d) => d.slug === 'kedarnath',
    );
    const res = await admin.delete(`/api/admin/destinations/${kedarnath.id}`);
    expect(res.status).toBe(409);
  });

  it('sanitises blog HTML and publishes with a date', async () => {
    const res = await admin.post('/api/admin/blog').send({
      title: 'Test post',
      slug: 'test-post',
      category: 'guides',
      excerpt: 'Short summary.',
      content: '<h2>Hello</h2><p onclick="x()">Text<script>bad()</script></p>',
      authorName: 'Arjun Negi',
      readMinutes: 3,
      status: 'published',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('<h2>Hello</h2><p>Text</p>');
    expect(res.body.data.publishedAt).toBeTruthy();
    expect((await api().get('/api/blog/test-post')).status).toBe(200);
    await admin.delete(`/api/admin/blog/${res.body.data.id}`).expect(200);
  });

  it('creates a coupon limited to packages and shows usage', async () => {
    const packages = (await admin.get('/api/admin/packages?search=Auli')).body.data;
    const res = await admin.post('/api/admin/coupons').send({
      code: 'snow500',
      description: 'Snow special',
      discountType: 'flat',
      discountValue: 50000,
      appliesToAllPackages: false,
      packageIds: [packages[0].id],
      showOnSite: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ code: 'SNOW500', usageCount: 0, packageIds: [packages[0].id] });
    expect((await api().get('/api/offers')).body.data.map((o) => o.code)).toContain('SNOW500');
    await admin.delete(`/api/admin/coupons/${res.body.data.id}`).expect(200);
  });

  it('bulk-adds gallery photos and reorders them', async () => {
    const res = await admin.post('/api/admin/gallery/bulk').send({
      images: [
        { url: 'https://res.cloudinary.com/demo/image/upload/a.jpg', category: 'snow', caption: 'A' },
        { url: 'https://res.cloudinary.com/demo/image/upload/b.jpg', category: 'snow', caption: 'B' },
      ],
    });
    expect(res.status).toBe(201);
    const ids = (await admin.get('/api/admin/gallery')).body.data.map((g) => g.id);
    await admin
      .patch('/api/admin/gallery/reorder')
      .send({ ids: [...ids].reverse() })
      .expect(200);
    const first = (await admin.get('/api/admin/gallery')).body.data[0];
    expect(first.caption).toBe('B');
    for (const image of res.body.data) await admin.delete(`/api/admin/gallery/${image.id}`).expect(200);
  });

  it.skipIf(isCloudinaryConfigured())(
    'says uploads are not configured when Cloudinary keys are missing',
    async () => {
      const res = await admin.post('/api/admin/uploads/signature').send({ folder: 'packages' });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('UPLOADS_NOT_CONFIGURED');
    },
  );

  it('lists customers, bookings and enquiries with pagination', async () => {
    for (const path of ['/api/admin/customers', '/api/admin/bookings', '/api/admin/enquiries']) {
      const res = await admin.get(path);
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ page: 1 });
    }
  });
});
