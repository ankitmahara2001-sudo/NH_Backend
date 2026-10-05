import { AVAILABILITY_TYPES, TRIP_TYPES } from '../../domain/enums.js';
import {
  blockedDatesSchema,
  departuresSchema,
  faqsSchema,
  highlightsSchema,
  hotelsSchema,
  inclusionsSchema,
  itinerarySchema,
  packageDetailsSchema,
  packageFlagsSchema,
  packageImagesCreateSchema,
  packagePricesSchema,
  reorderSchema,
} from '../../domain/schemas/packages.js';
import { idParamSchema, idSchema, optionalText } from '../../domain/schemas/common.js';
import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../../controllers/adminPackageController.js';
import { validate } from '../../middlewares/validate.js';

const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  destinationId: idSchema.optional(),
  tripType: z.enum(TRIP_TYPES).optional(),
  availabilityType: z.enum(AVAILABILITY_TYPES).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isFeatured: z.enum(['true', 'false']).optional(),
  isPopular: z.enum(['true', 'false']).optional(),
});
const imageParams = z.object({ id: idSchema, imageId: idSchema });
const imageUpdate = z.object({ altText: optionalText(255) });

const TAB_SCHEMAS = {
  prices: packagePricesSchema,
  itinerary: itinerarySchema,
  inclusions: inclusionsSchema,
  highlights: highlightsSchema,
  hotels: hotelsSchema,
  faqs: faqsSchema,
  departures: departuresSchema,
  'blocked-dates': blockedDatesSchema,
};

const byId = { params: idParamSchema };

export const packageRoutes = Router();

packageRoutes.get('/', validate({ query: listQuery }), controller.list);
packageRoutes.post('/', validate({ body: packageDetailsSchema }), controller.create);
packageRoutes.patch('/reorder', validate({ body: reorderSchema }), controller.reorder);
packageRoutes.get('/:id', validate(byId), controller.get);
packageRoutes.put('/:id', validate({ ...byId, body: packageDetailsSchema }), controller.updateDetails);
packageRoutes.delete('/:id', validate(byId), controller.remove);
packageRoutes.patch('/:id/flags', validate({ ...byId, body: packageFlagsSchema }), controller.updateFlags);
packageRoutes.post('/:id/duplicate', validate(byId), controller.duplicate);

for (const [tab, schema] of Object.entries(TAB_SCHEMAS)) {
  packageRoutes.put(`/:id/${tab}`, validate({ ...byId, body: schema }), controller.saveTab(tab));
}

packageRoutes.post(
  '/:id/images',
  validate({ ...byId, body: packageImagesCreateSchema }),
  controller.addImages,
);
packageRoutes.patch(
  '/:id/images/reorder',
  validate({ ...byId, body: reorderSchema }),
  controller.reorderImages,
);
packageRoutes.patch(
  '/:id/images/:imageId',
  validate({ params: imageParams, body: imageUpdate }),
  controller.updateImage,
);
packageRoutes.delete('/:id/images/:imageId', validate({ params: imageParams }), controller.deleteImage);
