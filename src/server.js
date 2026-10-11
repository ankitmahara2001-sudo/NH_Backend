import { createApp } from './app.js';
import { env } from './config/env.js';
import { scheduleExpirePendingBookings } from './jobs/expirePendingBookings.js';
import { isDatabaseUp, sequelize } from './lib/db.js';
import { logger } from './lib/logger.js';
import './models/index.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  const app = createApp();

  if (!(await isDatabaseUp())) {
    logger.warn('Database is not reachable. The API starts anyway; /api/health reports db: down.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}/api`);
  });
  const expiryJob = scheduleExpirePendingBookings();

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    expiryJob.stop();
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  logger.fatal({ err: error }, 'API failed to start');
  process.exit(1);
});
