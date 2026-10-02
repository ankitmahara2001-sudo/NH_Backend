import { Router } from 'express';
import { healthRoutes } from './healthRoutes.js';

export const publicRoutes = Router();

publicRoutes.use(healthRoutes);
