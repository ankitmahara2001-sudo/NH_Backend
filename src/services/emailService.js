import { env } from '../config/env.js';
import {
  balanceReceivedEmail,
  bookingCancelledEmail,
  bookingConfirmedAdminEmail,
  bookingConfirmedCustomerEmail,
  newEnquiryEmail,
  offlineBookingReceiptEmail,
  otpEmail,
} from '../emails/templates.js';
import { logger } from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import { getSettings } from './settingsService.js';

// Builds branded emails from site settings and sends them. Never throws.

async function getBranding() {
  const { company = {}, email = {} } = await getSettings(['company', 'email']);
  return {
    companyName: company.name || 'Norther Harier',
    senderName: email.senderName || env.MAIL_FROM_NAME,
    footerText: email.footerText || company.legalName || company.name || '',
    supportPhone: company.supportPhone || company.phone || '',
    adminEmail: env.ADMIN_NOTIFY_EMAIL || company.email || null,
    siteUrl: env.SITE_URL,
  };
}

async function deliver(to, buildEmail) {
  try {
    const branding = await getBranding();
    const recipient = to === 'admin' ? branding.adminEmail : to;
    if (!recipient) {
      logger.warn('No admin email configured (ADMIN_NOTIFY_EMAIL or company email); email skipped');
      return { sent: false };
    }
    const { subject, html, text } = buildEmail(branding);
    return await sendMail({ to: recipient, subject, html, text, fromName: branding.senderName });
  } catch (error) {
    logger.error({ err: error }, 'Email could not be prepared');
    return { sent: false };
  }
}

export const sendOtpEmail = (email, code, expiresInMinutes) =>
  deliver(email, (branding) => otpEmail({ code, expiresInMinutes, branding }));

export const sendNewEnquiryEmail = (enquiry) =>
  deliver('admin', (branding) => newEnquiryEmail({ enquiry, branding }));

/** Confirmation to the customer plus a copy to the admin. */
export async function sendBookingConfirmedEmails(booking) {
  const [customer] = await Promise.all([
    deliver(booking.leadEmail, (branding) => bookingConfirmedCustomerEmail({ booking, branding })),
    deliver('admin', (branding) => bookingConfirmedAdminEmail({ booking, branding })),
  ]);
  return customer;
}

/** Receipt for an admin-panel booking paid offline. `payment` is the Payment row just recorded. */
export const sendOfflineBookingReceiptEmail = (booking, payment) =>
  deliver(booking.leadEmail, (branding) => offlineBookingReceiptEmail({ booking, payment, branding }));

/** Receipt for a balance payment recorded later by the admin. */
export const sendBalanceReceivedEmail = (booking, payment) =>
  deliver(booking.leadEmail, (branding) => balanceReceivedEmail({ booking, payment, branding }));

export const sendBookingCancelledEmail = (booking, reason) =>
  deliver(booking.leadEmail, (branding) => bookingCancelledEmail({ booking, reason, branding }));
