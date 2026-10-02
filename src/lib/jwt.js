import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

const SECRETS = {
  admin: env.JWT_ADMIN_SECRET,
  customer: env.JWT_CUSTOMER_SECRET,
};

/** Signs a session token for an admin or a customer. */
export function signSessionToken(audience, userId, expiresInSeconds) {
  return jwt.sign({ sub: String(userId) }, SECRETS[audience], {
    algorithm: ALGORITHM,
    audience,
    expiresIn: expiresInSeconds,
  });
}

/** Returns the user id from a valid token, or null when it is missing, expired or forged. */
export function verifySessionToken(audience, token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRETS[audience], { algorithms: [ALGORITHM], audience });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
