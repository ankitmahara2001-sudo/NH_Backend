import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { buildCancellationPdf, buildReceiptPdf } from '../documents/bookingPdf.js';
import {
  balanceReceivedEmail,
  bookingCancelledEmail,
  bookingConfirmedAdminEmail,
  bookingConfirmedCustomerEmail,
  newEnquiryEmail,
  otpEmail,
} from '../emails/templates.js';
import { logger } from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import { Payment } from '../models/index.js';
import { getSettings } from './settingsService.js';

// Builds branded emails (and their PDF attachments) from site settings and sends them. Never throws.

async function getBranding() {
  const { company = {}, email = {} } = await getSettings(['company', 'email']);
  return {
    companyName: company.name || 'Norther Harier',
    legalName: company.legalName || '',
    address: company.address || '',
    phone: company.phone || '',
    companyEmail: company.email || '',
    senderName: email.senderName || env.MAIL_FROM_NAME,
    footerText: email.footerText || company.legalName || company.name || '',
    supportPhone: company.supportPhone || company.phone || '',
    adminEmail: env.ADMIN_NOTIFY_EMAIL || company.email || null,
    siteUrl: env.SITE_URL,
  };
}

/**
 * `buildEmail(branding)` returns { subject, html, text }; `buildAttachments(branding)` (optional)
 * returns attachments. A failed attachment is logged and the email goes out without it.
 */
async function deliver(to, buildEmail, buildAttachments) {
  try {
    const branding = await getBranding();
    const recipient = to === 'admin' ? branding.adminEmail : to;
    if (!recipient) {
      logger.warn('No admin email configured (ADMIN_NOTIFY_EMAIL or company email); email skipped');
      return { sent: false };
    }
    const { subject, html, text } = buildEmail(branding);
    let attachments = [];
    if (buildAttachments) {
      try {
        attachments = await buildAttachments(branding);
      } catch (error) {
        logger.error({ err: error, subject }, 'Email attachment could not be built; sending without it');
      }
    }
    return await sendMail({ to: recipient, subject, html, text, attachments, fromName: branding.senderName });
  } catch (error) {
    logger.error({ err: error }, 'Email could not be prepared');
    return { sent: false };
  }
}

/** Money actually moved on a booking (paid and refunded), oldest first, for the PDFs. */
function settledPayments(bookingId) {
  return Payment.findAll({
    where: { bookingId, status: { [Op.in]: ['captured', 'recorded', 'refunded'] } },
    order: [
      ['paidAt', 'ASC'],
      ['id', 'ASC'],
    ],
  });
}

const pdf = (filename, content) => ({ filename, content, contentType: 'application/pdf' });

async function receiptAttachment(booking, payment, branding) {
  const payments = await settledPayments(booking.id);
  return [
    pdf(
      `Receipt-${booking.bookingNumber}-${payment.id}.pdf`,
      await buildReceiptPdf({ booking, payment, payments, branding }),
    ),
  ];
}

export const sendOtpEmail = (email, code, expiresInMinutes) =>
  deliver(email, (branding) => otpEmail({ code, expiresInMinutes, branding }));

export const sendNewEnquiryEmail = (enquiry) =>
  deliver('admin', (branding) => newEnquiryEmail({ enquiry, branding }));

/** Confirmation with the receipt for `payment` (attached as a PDF) to the customer. */
function sendConfirmationToCustomer(booking, payment) {
  return deliver(
    booking.leadEmail,
    (branding) => bookingConfirmedCustomerEmail({ booking, payment, branding }),
    payment ? (branding) => receiptAttachment(booking, payment, branding) : undefined,
  );
}

/** Online booking paid: confirmation and receipt to the customer, plus a copy to the admin. */
export async function sendBookingConfirmedEmails(booking) {
  const payment = await Payment.findOne({
    where: { bookingId: booking.id, status: 'captured', paymentType: 'advance' },
    order: [['paidAt', 'DESC']],
  }).catch(() => null);
  const [customer] = await Promise.all([
    sendConfirmationToCustomer(booking, payment),
    deliver('admin', (branding) => bookingConfirmedAdminEmail({ booking, branding })),
  ]);
  return customer;
}

/** Admin-panel booking paid offline: confirmation and receipt. `payment` is the Payment just recorded. */
export const sendOfflineBookingReceiptEmail = (booking, payment) =>
  sendConfirmationToCustomer(booking, payment);

/** Receipt for a balance payment recorded later by the admin. */
export const sendBalanceReceivedEmail = (booking, payment) =>
  deliver(
    booking.leadEmail,
    (branding) => balanceReceivedEmail({ booking, payment, branding }),
    (branding) => receiptAttachment(booking, payment, branding),
  );

/** Cancellation notice with a PDF cancellation note. Reason and date come from the booking. */
export const sendBookingCancelledEmail = (booking) =>
  deliver(
    booking.leadEmail,
    (branding) => bookingCancelledEmail({ booking, branding }),
    async (branding) => [
      pdf(
        `Cancellation-${booking.bookingNumber}.pdf`,
        await buildCancellationPdf({ booking, payments: await settledPayments(booking.id), branding }),
      ),
    ],
  );
