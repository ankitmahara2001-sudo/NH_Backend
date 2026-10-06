# Norther Harier — API

Backend for the Norther Harier website and admin panel: Node.js + Express 5 (JavaScript, ES modules),
Sequelize 6 + PostgreSQL. Endpoint reference with curl examples: [API.md](API.md).

## Requirements

- Node.js 22.12 or newer, npm 10+
- PostgreSQL 16+ (local for development; Neon or any hosted PostgreSQL in production)

## Setup

```bash
npm install
cp .env.example .env        # then fill it in (see below)
```

Create the two local databases. They must be UTF-8 (the seed data contains ₹ and ★):

```sql
CREATE DATABASE norther_harier_dev  WITH ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE norther_harier_test WITH ENCODING 'UTF8' TEMPLATE template0;
```

In `.env`, set at least `DATABASE_URL`, `TEST_DATABASE_URL`, the two `JWT_*_SECRET` values
(`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) and `ADMIN_EMAIL` /
`ADMIN_PASSWORD` (10+ characters). Razorpay, Cloudinary and SMTP may stay empty in development; keep
`MAIL_DEV_LOG=true` to print emails (and login codes) in the console. Never commit `.env`.

```bash
npm run db:reset   # create the tables and load the demo data
npm run dev        # http://localhost:5000/api/health → "status": "ok", "db": "up"
```

## Commands

| Command                   | What it does                                                                    |
| ------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`             | Starts the API with auto-restart on changes                                     |
| `npm start`               | Starts the API (production)                                                     |
| `npm test`                | Tests (Vitest); rebuilds the test database first                                |
| `npm run lint`            | ESLint                                                                          |
| `npm run format`          | Prettier                                                                        |
| `npm run db:migrate`      | Runs pending migrations on the development database                             |
| `npm run db:seed`         | Runs every seeder (on an empty database)                                        |
| `npm run db:reset`        | Rolls back every migration, migrates and seeds — **wipes the development data** |
| `npm run db:prod:status`  | Migration status of the production database                                     |
| `npm run db:prod:migrate` | Runs pending migrations on the production database                              |
| `npm run db:prod:seed`    | Runs every seeder on the production database (once, on an empty database)       |

The `db:prod:*` commands read `DATABASE_URL` and `ADMIN_*` from `.env.production` (git-ignored, same
variables as `.env.example`). On the server itself the host's environment variables are used instead.

## Deployment

- Run `npm ci --omit=dev` and `npm start` (port from `PORT`), behind HTTPS.
- Set every variable from `.env.example` in the host's settings with `NODE_ENV=production`. The API refuses
  to start in production without Razorpay, Cloudinary and SMTP settings, and with `MAIL_DEV_LOG=true`.
- `DATABASE_URL` with `?sslmode=require` (Neon, most hosted PostgreSQL) connects over SSL with certificate
  checks (`db/ssl.cjs`).
- Run `npm run db:prod:migrate` before starting a new version that adds migrations.
- `CORS_ORIGINS` must list the website and admin panel origins; `COOKIE_DOMAIN` (e.g. `.example.com`) lets
  the website and API share the login cookie.
- Razorpay webhook: `https://<api-domain>/api/webhooks/razorpay` with `RAZORPAY_WEBHOOK_SECRET`.

## Domain code

`src/domain/` holds the enums, zod schemas for every request and the formatting helpers. The API is the source
of truth for validation: the website and admin panel have their own copies of the rules they need.

## Notes

- Money is always integer **paise** (₹1 = 100). Pricing lives in `src/services/pricingService.js` only.
- Migrations and seeders are CommonJS (`.cjs`) because sequelize-cli loads them with `require()`.
- Seeded images are placeholders from Cloudinary's public demo account.
- ESLint stays on 9.x to match the website's `eslint-config-next`.
# NH_Backend
