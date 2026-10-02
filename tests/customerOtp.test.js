import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sequelize } from '../src/lib/db.js';
import { Customer, EmailOtp } from '../src/models/index.js';
import { agent, api, clearOutbox, latestOtpCode, testOutbox } from './helpers.js';

afterAll(() => sequelize.close());
beforeEach(() => clearOutbox());

let emailCounter = 0;
const uniqueEmail = () => `otp-test-${Date.now()}-${(emailCounter += 1)}@example.com`;

const requestCode = (email) => api().post('/api/auth/otp/request').send({ email });
const verifyCode = (client, email, code) => client.post('/api/auth/otp/verify').send({ email, code });
const wrongCode = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

describe('customer OTP login', () => {
  it('emails a 6-digit code and stores only its hash', async () => {
    const email = uniqueEmail();
    const res = await requestCode(email);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ sent: true, resendAfterSeconds: 60, expiresInMinutes: 10 });
    const code = latestOtpCode(email);
    expect(code).toMatch(/^\d{6}$/);

    const stored = await EmailOtp.findOne({ where: { email } });
    expect(stored.codeHash).not.toContain(code);
  });

  it('creates the account on first verify, sets the session cookie and returns the profile', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    const session = agent();

    const res = await verifyCode(session, email, latestOtpCode(email));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email, profileComplete: false });
    expect(res.headers['set-cookie'].join(';')).toMatch(/nh_customer=.+HttpOnly/i);
    expect(await Customer.count({ where: { email } })).toBe(1);

    const me = await session.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
  });

  it('normalises the email to lowercase', async () => {
    const email = uniqueEmail();
    await requestCode(email.toUpperCase()).expect(200);
    expect(latestOtpCode(email)).toMatch(/^\d{6}$/);
  });

  it('enforces the 60-second resend cooldown', async () => {
    const email = uniqueEmail();
    await requestCode(email).expect(200);

    const res = await requestCode(email);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_COOLDOWN');
  });

  it('allows at most 5 codes per email per hour', async () => {
    const email = uniqueEmail();
    const longAgo = new Date(Date.now() - 2 * 60 * 1000);
    await EmailOtp.bulkCreate(
      Array.from({ length: 5 }, () => ({
        email,
        codeHash: 'x',
        expiresAt: longAgo,
        createdAt: longAgo,
        updatedAt: longAgo,
      })),
    );

    const res = await requestCode(email);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_TOO_MANY');
  });

  it('rejects a wrong code and counts down the attempts left', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    const code = latestOtpCode(email);

    const res = await verifyCode(api(), email, wrongCode(code));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_INVALID');
    expect(res.body.error.message).toContain('4 attempts left');
  });

  it('locks the code after 5 wrong attempts, even if the right code follows', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    const code = latestOtpCode(email);

    for (let i = 0; i < 5; i += 1) await verifyCode(api(), email, wrongCode(code)).expect(400);

    const res = await verifyCode(api(), email, code);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_LOCKED');
  });

  it('rejects an expired code', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    await EmailOtp.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { email } });

    const res = await verifyCode(api(), email, latestOtpCode(email));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('accepts each code only once', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    const code = latestOtpCode(email);

    await verifyCode(api(), email, code).expect(200);
    const second = await verifyCode(api(), email, code);
    expect(second.status).toBe(400);
  });

  it('lets a logged-in customer complete the profile and log out', async () => {
    const email = uniqueEmail();
    await requestCode(email);
    const session = agent();
    await verifyCode(session, email, latestOtpCode(email)).expect(200);

    const updated = await session.patch('/api/me').send({ name: 'Priya Sharma', phone: '98765 43210' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: 'Priya Sharma', profileComplete: true });

    await session.post('/api/auth/logout').expect(200);
    await session.get('/api/me').expect(401);
  });

  it('requires login for /me', async () => {
    const res = await api().get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates the request body', async () => {
    const res = await api().post('/api/auth/otp/request').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBeTruthy();
    expect(testOutbox).toHaveLength(0);
  });
});
