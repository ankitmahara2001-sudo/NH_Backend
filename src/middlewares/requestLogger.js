import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

export const requestLogger = pinoHttp({
  logger,
  // Health checks are polled often; keep them out of the logs.
  autoLogging: { ignore: (req) => ['/api/health', '/api/health/live'].includes(req.url) },
  customLogLevel: (_req, res, err) =>
    err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
});
