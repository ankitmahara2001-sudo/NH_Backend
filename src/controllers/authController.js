import { clearSessionCookie, setSessionCookie } from '../lib/sessionCookies.js';
import { changeAdminPassword, loginAdmin, serializeAdmin } from '../services/adminAuthService.js';
import { serializeCustomer, updateCustomerProfile } from '../services/customerService.js';
import { requestOtp, verifyOtp } from '../services/otpService.js';

// ---- Admin ----------------------------------------------------------------------------

export async function adminLogin(req, res) {
  const admin = await loginAdmin(req.validated.body);
  setSessionCookie(res, 'admin', admin.id);
  res.json({ data: admin });
}

export function adminLogout(_req, res) {
  clearSessionCookie(res, 'admin');
  res.json({ data: { loggedOut: true } });
}

export function adminMe(req, res) {
  res.json({ data: serializeAdmin(req.admin) });
}

export async function adminChangePassword(req, res) {
  await changeAdminPassword(req.admin.id, req.validated.body);
  res.json({ data: { changed: true } });
}

// ---- Customer (email + OTP) -----------------------------------------------------------

export async function customerRequestOtp(req, res) {
  const result = await requestOtp(req.validated.body.email, req.ip);
  res.json({ data: { sent: true, ...result } });
}

export async function customerVerifyOtp(req, res) {
  const { email, code } = req.validated.body;
  const customer = await verifyOtp(email, code);
  setSessionCookie(res, 'customer', customer.id);
  res.json({ data: serializeCustomer(customer) });
}

export function customerLogout(_req, res) {
  clearSessionCookie(res, 'customer');
  res.json({ data: { loggedOut: true } });
}

/** The logged-in customer or null (used by the website header; never 401). */
export function customerSession(req, res) {
  res.json({ data: req.customer ? serializeCustomer(req.customer) : null });
}

export function customerMe(req, res) {
  res.json({ data: serializeCustomer(req.customer) });
}

export async function customerUpdateMe(req, res) {
  res.json({ data: await updateCustomerProfile(req.customer, req.validated.body) });
}
