import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// api/.env sits two folders up from both src/config and dist/config.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

// All environment variables the API reads, validated once at start-up (fail fast).
// Integrations (Razorpay, Cloudinary, SMTP) may stay empty in development and test;
// they are required in production.

const MIN_SECRET_LENGTH = 32;
const DEFAULT_PORT = 5000;

const emptyToUndefined = (value) => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());
const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    TEST_DATABASE_URL: optionalString,

    CORS_ORIGINS: z
      .string()
      .min(1)
      .transform((v) =>
        v
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    COOKIE_DOMAIN: optionalString,

    JWT_CUSTOMER_SECRET: z.string().min(MIN_SECRET_LENGTH, `Use at least ${MIN_SECRET_LENGTH} characters`),
    JWT_ADMIN_SECRET: z.string().min(MIN_SECRET_LENGTH, `Use at least ${MIN_SECRET_LENGTH} characters`),

    // Only the seeder uses these, but validating them here catches typos early.
    ADMIN_NAME: optionalString,
    ADMIN_EMAIL: optionalEmail,
    ADMIN_PASSWORD: optionalString,

    RAZORPAY_KEY_ID: optionalString,
    RAZORPAY_KEY_SECRET: optionalString,
    RAZORPAY_WEBHOOK_SECRET: optionalString,

    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    CLOUDINARY_ROOT_FOLDER: z.string().min(1).default('norther-harier'),

    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_SECURE: booleanFlag,
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    MAIL_FROM_NAME: z.string().min(1).default('Norther Harier'),
    MAIL_FROM_ADDRESS: optionalEmail,
    ADMIN_NOTIFY_EMAIL: optionalEmail,
    MAIL_DEV_LOG: booleanFlag,

    SITE_URL: z.url(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    const requiredInProduction = [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'MAIL_FROM_ADDRESS',
      'ADMIN_NOTIFY_EMAIL',
    ];
    for (const key of requiredInProduction) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Required in production' });
    }
    if (env.MAIL_DEV_LOG) {
      ctx.addIssue({ code: 'custom', path: ['MAIL_DEV_LOG'], message: 'Must be false in production' });
    }
  });

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    console.error(
      `Invalid environment configuration (api/.env):\n${problems.join('\n')}\n` +
        'See .env.example for every variable.',
    );
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
