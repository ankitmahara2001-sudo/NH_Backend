import { pino } from 'pino';
import { env, isProduction, isTest } from '../config/env.js';

// Structured JSON logs in production, pretty logs in development, silent in tests.
export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
  ...(isProduction || isTest
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }),
  base: { env: env.NODE_ENV },
});
