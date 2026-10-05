import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OTP_LENGTH } from '../domain/constants.js';
import { Op } from 'sequelize';
import { AppError } from '../lib/AppError.js';
import { sequelize } from '../lib/db.js';
import { Customer, EmailOtp } from '../models/index.js';
import { sendOtpEmail } from './emailService.js';

// Email + 6-digit code login (CLAUDE.md section 2, "Customer accounts and login").

const OTP_RULES = {
  validMinutes: 10,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxRequestsPerHour: 5,
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const OTP_HASH_ROUNDS = 10;

function generateCode() {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

/** Sends a new code. Enforces the resend cooldown and the hourly limit per email. */
export async function requestOtp(email, requestIp) {
  const now = Date.now();

  const recent = await EmailOtp.findAll({
    where: { email, createdAt: { [Op.gte]: new Date(now - MS_PER_HOUR) } },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'createdAt'],
  });

  const latest = recent[0];
  if (latest) {
    const secondsSince = Math.floor((now - latest.createdAt.getTime()) / MS_PER_SECOND);
    if (secondsSince < OTP_RULES.resendCooldownSeconds) {
      const wait = OTP_RULES.resendCooldownSeconds - secondsSince;
      throw new AppError(429, 'OTP_COOLDOWN', `Please wait ${wait} seconds before requesting a new code.`, {
        retryAfterSeconds: String(wait),
      });
    }
  }
  if (recent.length >= OTP_RULES.maxRequestsPerHour) {
    throw new AppError(
      429,
      'OTP_TOO_MANY',
      'Too many codes requested for this email. Please try again in an hour.',
    );
  }

  const code = generateCode();
  await sequelize.transaction(async (transaction) => {
    // Only the newest code works: older unused codes expire immediately.
    await EmailOtp.update(
      { expiresAt: new Date(now) },
      { where: { email, usedAt: null, expiresAt: { [Op.gt]: new Date(now) } }, transaction },
    );
    await EmailOtp.create(
      {
        email,
        codeHash: await bcrypt.hash(code, OTP_HASH_ROUNDS),
        expiresAt: new Date(now + OTP_RULES.validMinutes * MS_PER_MINUTE),
        requestIp: requestIp ?? null,
      },
      { transaction },
    );
  });

  await sendOtpEmail(email, code, OTP_RULES.validMinutes);
  return { resendAfterSeconds: OTP_RULES.resendCooldownSeconds, expiresInMinutes: OTP_RULES.validMinutes };
}

/**
 * Checks a code. On success the code is used up and the customer account is found or created.
 * @returns {Promise<Customer>}
 */
export async function verifyOtp(email, code) {
  const otp = await EmailOtp.findOne({ where: { email, usedAt: null }, order: [['createdAt', 'DESC']] });

  if (!otp || otp.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'OTP_EXPIRED', 'This code has expired. Please request a new one.', {
      code: 'This code has expired. Please request a new one.',
    });
  }
  if (otp.attempts >= OTP_RULES.maxAttempts) {
    throw new AppError(429, 'OTP_LOCKED', 'Too many wrong attempts. Please request a new code.', {
      code: 'Too many wrong attempts. Please request a new code.',
    });
  }

  if (!(await bcrypt.compare(code, otp.codeHash))) {
    const attemptsUsed = otp.attempts + 1;
    await otp.increment('attempts');
    const attemptsLeft = Math.max(0, OTP_RULES.maxAttempts - attemptsUsed);
    const message =
      attemptsLeft > 0
        ? `That code is not right. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
        : 'Too many wrong attempts. Please request a new code.';
    throw new AppError(400, 'OTP_INVALID', message, { code: message });
  }

  return sequelize.transaction(async (transaction) => {
    // Mark as used only if nobody used it in the meantime (codes are single-use).
    const [updated] = await EmailOtp.update(
      { usedAt: new Date() },
      { where: { id: otp.id, usedAt: null }, transaction },
    );
    if (updated === 0) {
      throw new AppError(400, 'OTP_EXPIRED', 'This code has already been used. Please request a new one.');
    }

    const now = new Date();
    const [customer] = await Customer.findOrCreate({
      where: { email },
      defaults: { email, emailVerifiedAt: now, lastLoginAt: now },
      transaction,
    });
    customer.lastLoginAt = now;
    customer.emailVerifiedAt ??= now;
    await customer.save({ transaction });
    return customer;
  });
}
