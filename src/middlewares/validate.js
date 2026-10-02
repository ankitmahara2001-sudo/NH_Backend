/**
 * Validates body, query and params with zod. Parsed values go to `req.validated`
 * (Express 5 makes `req.query` read-only). A ZodError reaches the error handler as a 400.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : undefined,
      query: schemas.query ? schemas.query.parse(req.query) : undefined,
      params: schemas.params ? schemas.params.parse(req.params) : undefined,
    };
    next();
  };
}
