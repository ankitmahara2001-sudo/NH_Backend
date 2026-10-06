import { Router } from 'express';
import { getHealth, getLiveness } from '../../controllers/healthController.js';

export const healthRoutes = Router();

healthRoutes.get('/health', getHealth);
healthRoutes.get('/health/live', getLiveness);
