// SSL options for the PostgreSQL connection, shared by the API (src/lib/db.js) and sequelize-cli (db/config.cjs).
// Sequelize does not turn the URL's `sslmode` into driver settings, so hosted databases that require SSL
// (e.g. Neon: `?sslmode=require`) get explicit options: encrypted, and the server certificate is verified.
// A local database without `sslmode` keeps a plain connection.

const SSL_MODES = ['require', 'verify-ca', 'verify-full'];

/** `dialectOptions` for Sequelize: `{ ssl }` when the URL asks for SSL, otherwise `{}`. */
function sslDialectOptions(databaseUrl) {
  const mode = new URL(databaseUrl).searchParams.get('sslmode');
  return SSL_MODES.includes(mode) ? { ssl: { require: true, rejectUnauthorized: true } } : {};
}

module.exports = { sslDialectOptions };
