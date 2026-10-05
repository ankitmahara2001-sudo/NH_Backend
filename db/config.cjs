// Database config for sequelize-cli (migrations and seeders).
// The running API builds its own connection in src/lib/db.js from the same env variables.
const path = require('node:path');
const dotenv = require('dotenv');
const { sslDialectOptions } = require('./ssl.cjs');

/** The environment sequelize-cli runs for: NODE_ENV, else its `--env <name>` / `--env=<name>` argument. */
function cliEnvironment() {
  if (process.env.NODE_ENV) return process.env.NODE_ENV;
  const index = process.argv.indexOf('--env');
  if (index !== -1) return process.argv[index + 1];
  return process.argv.find((arg) => arg.startsWith('--env='))?.slice('--env='.length);
}

// Production commands run from a developer's computer (`npm run db:prod:*`) read api/.env.production
// first; dotenv never overrides a variable that is already set, so its values win over api/.env.
// On the server there is no such file and the host's environment variables are used.
if (cliEnvironment() === 'production') {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.production'), quiet: true });
}
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

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
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

/** Connection settings for a database URL (with SSL options when the URL asks for SSL). */
const connection = (url) => ({ url, dialectOptions: sslDialectOptions(url) });

// Getters keep each environment lazy, so a missing TEST_DATABASE_URL only fails test commands.
module.exports = {
  get development() {
    return { ...common, ...connection(requireUrl('DATABASE_URL')) };
  },
  get test() {
    return { ...common, ...connection(requireUrl('TEST_DATABASE_URL')) };
  },
  get production() {
    return { ...common, ...connection(requireUrl('DATABASE_URL')) };
  },
};
