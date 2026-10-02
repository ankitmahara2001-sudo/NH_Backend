import { env, isProduction } from '../config/env.js';
import { signSessionToken } from './jwt.js';

const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const MS_PER_SECOND = 1000;

export const ADMIN_COOKIE = 'nh_admin';
export const CUSTOMER_COOKIE = 'nh_customer';

const SESSION_SECONDS = {
  admin: 12 * SECONDS_PER_HOUR,
  customer: 30 * SECONDS_PER_DAY,
};

const COOKIE_NAMES = { admin: ADMIN_COOKIE, customer: CUSTOMER_COOKIE };

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/** Signs a JWT and stores it in the httpOnly session cookie for that audience. */
export function setSessionCookie(res, audience, userId) {
  const seconds = SESSION_SECONDS[audience];
  res.cookie(COOKIE_NAMES[audience], signSessionToken(audience, userId, seconds), {
    ...baseCookieOptions(),
    maxAge: seconds * MS_PER_SECOND,
  });
}

export function clearSessionCookie(res, audience) {
  res.clearCookie(COOKIE_NAMES[audience], baseCookieOptions());
}
