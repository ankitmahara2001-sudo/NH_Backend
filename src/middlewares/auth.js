import { AppError } from '../lib/AppError.js';
import { verifySessionToken } from '../lib/jwt.js';
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from '../lib/sessionCookies.js';
import { findAdminById } from '../services/adminAuthService.js';
import { findCustomerById } from '../services/customerService.js';

/** Requires a valid admin session cookie; sets req.admin. */
export async function requireAdmin(req, _res, next) {
  const adminId = verifySessionToken('admin', req.cookies?.[ADMIN_COOKIE]);
  const admin = adminId ? await findAdminById(adminId) : null;
  if (!admin) return next(AppError.unauthorized('Please log in to the admin panel.'));
  req.admin = admin;
  return next();
}

/** Requires a valid customer session cookie; sets req.customer. */
export async function requireCustomer(req, _res, next) {
  const customerId = verifySessionToken('customer', req.cookies?.[CUSTOMER_COOKIE]);
  const customer = customerId ? await findCustomerById(customerId) : null;
  if (!customer) return next(AppError.unauthorized('Please log in to continue.'));
  req.customer = customer;
  return next();
}

/** Sets req.customer when a valid session cookie is present; never rejects. */
export async function loadOptionalCustomer(req, _res, next) {
  const customerId = verifySessionToken('customer', req.cookies?.[CUSTOMER_COOKIE]);
  req.customer = customerId ? await findCustomerById(customerId) : null;
  return next();
}
