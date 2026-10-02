import { Router } from 'express';
import { adminRoutes } from './admin/index.js';
import { publicRoutes } from './public/index.js';

export const apiRoutes = Router();

apiRoutes.use('/admin', adminRoutes);
apiRoutes.use(publicRoutes);
