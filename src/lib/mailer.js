import nodemailer from 'nodemailer';
import { env, isTest } from '../config/env.js';
import { logger } from './logger.js';

// Sends email through Brevo's HTTPS API (BREVO_API_KEY) or the company SMTP account. Brevo exists
// for hosts that block outgoing SMTP ports, such as Render's free plan. In development
// (MAIL_DEV_LOG=true or nothing configured) emails are printed to the console instead.
// Sending never throws: a failed email must not break the request that triggered it (the data is
// already saved).

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
// Fail fast: an unreachable mail server must not hold the request (and the login form) for minutes.
const SEND_TIMEOUT_MS = 15_000;
const SMTP_CONNECT_TIMEOUT_MS = 10_000;

const FROM_ADDRESS = env.MAIL_FROM_ADDRESS ?? 'no-reply@localhost';
const canSend = Boolean(env.MAIL_FROM_ADDRESS) && !env.MAIL_DEV_LOG && !isTest;
const useBrevo = canSend && Boolean(env.BREVO_API_KEY);
const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

const transport =
  canSend && !useBrevo && smtpConfigured
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
        connectionTimeout: SMTP_CONNECT_TIMEOUT_MS,
        greetingTimeout: SMTP_CONNECT_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
      })
    : null;

/** Emails "sent" during tests, so tests can read OTP codes and check content. */
export const testOutbox = [];

async function sendWithBrevo({ to, subject, html, text, fromName, attachments }) {
  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: fromName, email: FROM_ADDRESS },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      ...(attachments.length
        ? {
            attachment: attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') })),
          }
        : {}),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    // Brevo explains rejections (unverified sender, bad key) in the body; keep it for the log.
    throw new Error(`Brevo responded ${response.status}: ${await response.text()}`);
  }
}

/**
 * @param {{ to: string, subject: string, html: string, text: string, fromName?: string,
 *   attachments?: { filename: string, content: Buffer, contentType?: string }[] }} message
 * @returns {Promise<{ sent: boolean }>}
 */
export async function sendMail({ to, subject, html, text, fromName, attachments = [] }) {
  const senderName = fromName ?? env.MAIL_FROM_NAME;

  if (isTest) {
    testOutbox.push({ to, subject, html, text, attachments });
    return { sent: true };
  }

  if (!useBrevo && !transport) {
    // Development: show the email in the API console (this is how you read OTP codes locally).
    logger.info(
      `\n===== EMAIL (not sent: MAIL_DEV_LOG) =====\nTo: ${to}\nSubject: ${subject}\n` +
        (attachments.length ? `Attachments: ${attachments.map((a) => a.filename).join(', ')}\n` : '') +
        `\n${text}\n==========================================`,
    );
    return { sent: true };
  }

  try {
    if (useBrevo) await sendWithBrevo({ to, subject, html, text, fromName: senderName, attachments });
    else {
      await transport.sendMail({
        from: `"${senderName}" <${FROM_ADDRESS}>`,
        to,
        subject,
        html,
        text,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
    }
    return { sent: true };
  } catch (error) {
    logger.error({ err: error, to, subject, via: useBrevo ? 'brevo' : 'smtp' }, 'Email could not be sent');
    return { sent: false };
  }
}
