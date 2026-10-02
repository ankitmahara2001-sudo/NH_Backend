import nodemailer from 'nodemailer';
import { env, isTest } from '../config/env.js';
import { logger } from './logger.js';

// Sends email through the company SMTP account. In development (MAIL_DEV_LOG=true or no SMTP
// configured) emails are printed to the console instead. Sending never throws: a failed email
// must not break the request that triggered it (the data is already saved).

const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM_ADDRESS);

const transport =
  smtpConfigured && !env.MAIL_DEV_LOG && !isTest
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      })
    : null;

const FROM_ADDRESS = env.MAIL_FROM_ADDRESS ?? 'no-reply@localhost';

/** Emails "sent" during tests, so tests can read OTP codes and check content. */
export const testOutbox = [];

/**
 * @param {{ to: string, subject: string, html: string, text: string, fromName?: string }} message
 * @returns {Promise<{ sent: boolean }>}
 */
export async function sendMail({ to, subject, html, text, fromName }) {
  const from = `"${fromName ?? env.MAIL_FROM_NAME}" <${FROM_ADDRESS}>`;

  if (isTest) {
    testOutbox.push({ to, subject, html, text });
    return { sent: true };
  }

  if (!transport) {
    // Development: show the email in the API console (this is how you read OTP codes locally).
    logger.info(
      `\n===== EMAIL (not sent: MAIL_DEV_LOG) =====\nTo: ${to}\nSubject: ${subject}\n\n${text}\n==========================================`,
    );
    return { sent: true };
  }

  try {
    await transport.sendMail({ from, to, subject, html, text });
    return { sent: true };
  } catch (error) {
    logger.error({ err: error, to, subject }, 'Email could not be sent');
    return { sent: false };
  }
}
