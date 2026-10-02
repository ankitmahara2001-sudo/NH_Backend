import { isDatabaseUp } from '../lib/db.js';

export async function getHealthStatus() {
  const dbUp = await isDatabaseUp();
  return {
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
