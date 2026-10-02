import { afterAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/lib/db.js';
import { AdminUser } from '../src/models/index.js';
import { api, loginAsAdmin } from './helpers.js';

afterAll(() => sequelize.close());

describe('admin auth', () => {
  it('logs in with the seeded credentials and sets the nh_admin cookie', async () => {
    const res = await api()
      .post('/api/admin/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(process.env.ADMIN_EMAIL.toLowerCase());
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'].join(';')).toMatch(/nh_admin=.+HttpOnly/i);
  });

  it('rejects a wrong password with a generic message', async () => {
    const res = await api()
      .post('/api/admin/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: 'definitely-wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'The email or password is incorrect.',
    });
  });

  it('rejects an unknown email with the same message', async () => {
    const res = await api()
      .post('/api/admin/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 on admin routes without the cookie', async () => {
    const res = await api().get('/api/admin/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the admin for /auth/me and logs out', async () => {
    const session = await loginAsAdmin();
    const me = await session.get('/api/admin/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(process.env.ADMIN_EMAIL.toLowerCase());

    await session.post('/api/admin/auth/logout').expect(200);
    await session.get('/api/admin/auth/me').expect(401);
  });

  it('changes the password only with the right current password', async () => {
    const session = await loginAsAdmin();
    const original = (await AdminUser.scope('withPassword').findOne()).passwordHash;

    const wrong = await session
      .patch('/api/admin/auth/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'a-brand-new-password' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fields.currentPassword).toBeTruthy();

    await session
      .patch('/api/admin/auth/password')
      .send({ currentPassword: process.env.ADMIN_PASSWORD, newPassword: 'a-brand-new-password' })
      .expect(200);

    // Restore the seeded password for the other tests.
    await AdminUser.update({ passwordHash: original }, { where: {} });
  });
});
