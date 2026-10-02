import {
  blogQuerySchema,
  enquiryCreateSchema,
  galleryQuerySchema,
  packageListQuerySchema,
  slugSchema,
} from '@nh/shared';
import { Router } from 'express';
import { z } from 'zod';
import * as catalog from '../../controllers/catalogController.js';
import { enquiryLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';

const slugParams = z.object({ slug: slugSchema });
const availabilityQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM.')
    .optional(),
});

export const catalogRoutes = Router();

catalogRoutes.get('/home', catalog.home);
catalogRoutes.get('/packages', validate({ query: packageListQuerySchema }), catalog.packages);
catalogRoutes.get('/packages/:slug', validate({ params: slugParams }), catalog.packageDetail);
catalogRoutes.get(
  '/packages/:slug/availability',
  validate({ params: slugParams, query: availabilityQuery }),
  catalog.packageAvailability,
);
catalogRoutes.get('/destinations', catalog.destinations);
catalogRoutes.get('/offers', catalog.offers);
catalogRoutes.get('/gallery', validate({ query: galleryQuerySchema }), catalog.gallery);
catalogRoutes.get('/blog', validate({ query: blogQuerySchema }), catalog.blog);
catalogRoutes.get('/blog/:slug', validate({ params: slugParams }), catalog.blogPost);
catalogRoutes.get('/settings/public', catalog.publicSettings);
catalogRoutes.post('/enquiries', enquiryLimiter, validate({ body: enquiryCreateSchema }), catalog.enquiry);
