import { rateLimit } from 'express-rate-limit';
import { isTest } from '../config/env.js';

const MINUTE_MS = 60 * 1000;

function limiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Tests fire many requests from one IP; the per-email OTP limits are still enforced.
    skip: () => isTest,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  });
}

/** Admin login: 5 attempts per minute per IP. */
export const adminLoginLimiter = limiter(
  MINUTE_MS,
  5,
  'Too many login attempts. Please wait a minute and try again.',
);

/** OTP requests and verifications per IP (per-email limits live in the OTP service). */
export const otpIpLimiter = limiter(
  15 * MINUTE_MS,
  30,
  'Too many attempts from this network. Please try again later.',
);

/** Contact form. */
export const enquiryLimiter = limiter(
  10 * MINUTE_MS,
  5,
  'Too many messages. Please try again in a few minutes.',
);

/** Price quotes (the booking card calls this on every change). */
export const quoteLimiter = limiter(MINUTE_MS, 60, 'Too many requests. Please slow down.');
