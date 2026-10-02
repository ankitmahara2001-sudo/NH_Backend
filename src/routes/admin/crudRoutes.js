import { idParamSchema, reorderSchema } from '@nh/shared';
import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';

/**
 * Standard admin routes for a crud service:
 * GET /, GET /:id, POST /, PUT /:id, DELETE /:id and (optionally) PATCH /reorder.
 *
 * @param {ReturnType<import('../../services/crudService.js').createCrudService>} service
 * @param {{ schema: import('zod').ZodType, listQuery?: import('zod').ZodType,
 *           toWhere?: (query: object) => object, reorderable?: boolean }} options
 */
export function createCrudRoutes(service, { schema, listQuery, toWhere = () => ({}), reorderable = false }) {
  const router = Router();

  router.get('/', validate(listQuery ? { query: listQuery } : {}), async (req, res) => {
    res.json({ data: await service.list(toWhere(req.validated.query ?? {})) });
  });

  if (reorderable) {
    // Registered before /:id so "reorder" is never read as an id.
    router.patch('/reorder', validate({ body: reorderSchema }), async (req, res) => {
      await service.reorder(req.validated.body.ids);
      res.json({ data: { reordered: true } });
    });
  }

  router.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
    res.json({ data: await service.get(req.validated.params.id) });
  });

  router.post('/', validate({ body: schema }), async (req, res) => {
    res.status(201).json({ data: await service.create(req.validated.body) });
  });

  router.put('/:id', validate({ params: idParamSchema, body: schema }), async (req, res) => {
    res.json({ data: await service.update(req.validated.params.id, req.validated.body) });
  });

  router.delete('/:id', validate({ params: idParamSchema }), async (req, res) => {
    await service.remove(req.validated.params.id);
    res.json({ data: { deleted: true } });
  });

  return router;
}
