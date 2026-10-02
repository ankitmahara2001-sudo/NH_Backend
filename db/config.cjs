// Database config for sequelize-cli (migrations and seeders).
// The running API builds its own connection in src/lib/db.ts from the same env variables.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const common = {
  dialect: 'postgres',
  logging: false,
  define: { underscored: true, timestamps: true },
  migrationStorageTableName: 'sequelize_meta',
  // Seeders are not tracked: db:reset rolls back every migration and re-runs every seeder.
  seederStorage: 'none',
};

function requireUrl(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy docs/env/api.env.example to api/.env and fill it in.`);
  }
  return value;
}

// Getters keep each environment lazy, so a missing TEST_DATABASE_URL only fails test commands.
module.exports = {
  get development() {
    return { ...common, url: requireUrl('DATABASE_URL') };
  },
  get test() {
    return { ...common, url: requireUrl('TEST_DATABASE_URL') };
  },
  get production() {
    return { ...common, url: requireUrl('DATABASE_URL') };
  },
};
