import { Router } from 'express';
import { catalogRoutes } from './catalogRoutes.js';
import { customerAuthRoutes } from './customerAuthRoutes.js';
import { customerBookingRoutes } from './customerBookingRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { pricingRoutes } from './pricingRoutes.js';

export const publicRoutes = Router();

publicRoutes.use(healthRoutes);
publicRoutes.use(catalogRoutes);
publicRoutes.use(pricingRoutes);
publicRoutes.use(customerAuthRoutes);
publicRoutes.use(customerBookingRoutes);
