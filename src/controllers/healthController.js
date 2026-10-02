import { getHealthStatus } from '../services/healthService.js';

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

export const getHealth = async (_req, res) => {
  const health = await getHealthStatus();
  res.status(health.db === 'up' ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE).json({ data: health });
};
