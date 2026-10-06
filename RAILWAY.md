# Railway health checks

`GET /api/health/live` returns HTTP 200 with `{"data":{"status":"ok"}}`
when the API is running, without querying PostgreSQL. `/api/health` remains
the database readiness check.

For an external check every 10 minutes, create a separate Railway cron service
from this API directory with:

- Start command: `node scripts/ping-health.mjs`
- Cron schedule: `*/10 * * * *`
- Environment variable: `BACKEND_URL=https://YOUR-BACKEND.up.railway.app`
- No public domain or deployment healthcheck on the cron service.

The script exits after checking and retries transient wake-up failures. Do not
replace the API service's `npm start` command with this cron command.
The cron service needs to be deployed separately; adding these files does not
activate a schedule.

Railway Serverless can sleep after 5–10 minutes without outbound traffic, so
10-minute polling does not guarantee uninterrupted availability. For an always
running API, disable Serverless in the API service's Settings > Deploy and
redeploy. Always-on runtime and a separate cron service consume usage credits;
polling cannot bypass plan limits.

References: https://docs.railway.com/deployments/serverless
and https://docs.railway.com/guides/cut-idle-costs-serverless
