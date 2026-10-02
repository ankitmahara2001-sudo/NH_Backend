import { Router } from 'express';
import { catalogRoutes } from './catalogRoutes.js';
import { customerAuthRoutes } from './customerAuthRoutes.js';
import { healthRoutes } from './healthRoutes.js';

export const publicRoutes = Router();

publicRoutes.use(healthRoutes);
publicRoutes.use(catalogRoutes);
publicRoutes.use(customerAuthRoutes);
