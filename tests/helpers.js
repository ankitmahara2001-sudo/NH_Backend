import request from 'supertest';
import { createApp } from '../src/app.js';
import { testOutbox } from '../src/lib/mailer.js';

export const app = createApp();

/** A supertest agent that keeps cookies between requests (a logged-in browser). */
export function agent() {
  return request.agent(app);
}

export function api() {
  return request(app);
}

/** The 6-digit code from the latest OTP email sent to `email`. */
export function latestOtpCode(email) {
  const message = [...testOutbox].reverse().find((m) => m.to === email && /login code/.test(m.subject));
  return message?.text.match(/Code: (\d{6})/)?.[1] ?? null;
}

export function clearOutbox() {
  testOutbox.length = 0;
}

export { testOutbox };

/** Logs in as the seeded admin (ADMIN_EMAIL / ADMIN_PASSWORD from api/.env). */
export async function loginAsAdmin() {
  const session = agent();
  const res = await session
    .post('/api/admin/auth/login')
    .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (res.status !== 200)
    throw new Error(`Admin login failed in test setup: ${res.status} ${JSON.stringify(res.body)}`);
  return session;
}

/** Logs in a customer through the real OTP flow and returns the logged-in agent. */
export async function loginAsCustomer(email) {
  const session = agent();
  await session.post('/api/auth/otp/request').send({ email }).expect(200);
  await session
    .post('/api/auth/otp/verify')
    .send({ email, code: latestOtpCode(email) })
    .expect(200);
  return session;
}
