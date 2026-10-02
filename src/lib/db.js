import { Sequelize } from 'sequelize';
import { env, isTest } from '../config/env.js';
import { logger } from './logger.js';

const databaseUrl = isTest ? env.TEST_DATABASE_URL : env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL must be set to run the API tests.');
}

// Same conventions as the migrations: snake_case columns, created_at / updated_at.
export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: (sql) => logger.trace({ sql }, 'sql'),
  define: { underscored: true, timestamps: true },
  pool: { max: 10, min: 0, idle: 10_000 },
});

/** True when the database answers a trivial query. Never throws. */
export async function isDatabaseUp() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'Database connection check failed');
    return false;
  }
}
