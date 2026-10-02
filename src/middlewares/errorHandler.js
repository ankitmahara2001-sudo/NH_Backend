import { DatabaseError, ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError.js';
import { logger } from '../lib/logger.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_INTERNAL_ERROR = 500;

// Postgres codes: 23001 = restrict_violation (ON DELETE RESTRICT), 23503 = foreign_key_violation.
const REFERENCE_ERROR_CODES = new Set(['23001', '23503']);
const isReferenceError = (err) =>
  err instanceof ForeignKeyConstraintError ||
  (err instanceof DatabaseError && REFERENCE_ERROR_CODES.has(err.parent?.code));

const snakeToCamel = (name) => name.replace(/_([a-z])/g, (_m, char) => char.toUpperCase());

/** Field errors for a duplicate value, e.g. { slug: 'This value is already used.' }. */
function uniqueFields(error) {
  const fields = {};
  for (const item of error.errors ?? []) {
    if (item.path) fields[snakeToCamel(item.path)] = 'This value is already used. Choose another one.';
  }
  return fields;
}

function zodFields(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Central error handler: the only place that turns errors into HTTP responses. */
export const errorHandler = (err, req, res, _next) => {
  let status = HTTP_INTERNAL_ERROR;
  let body = {
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { error: { code: err.code, message: err.message, fields: err.fields } };
  } else if (err instanceof ZodError) {
    status = HTTP_BAD_REQUEST;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        fields: zodFields(err),
      },
    };
  } else if (err instanceof UniqueConstraintError) {
    status = HTTP_CONFLICT;
    body = {
      error: { code: 'DUPLICATE', message: 'This value is already used.', fields: uniqueFields(err) },
    };
  } else if (isReferenceError(err)) {
    status = HTTP_CONFLICT;
    body = {
      error: {
        code: 'IN_USE',
        message:
          'This item is linked to other records (for example bookings), so it cannot be removed. Deactivate it instead.',
      },
    };
  } else if (err?.type === 'entity.parse.failed') {
    status = HTTP_BAD_REQUEST;
    body = { error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } };
  } else if (err?.type === 'entity.too.large') {
    status = HTTP_PAYLOAD_TOO_LARGE;
    body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large.' } };
  }

  if (status >= HTTP_INTERNAL_ERROR) {
    (req.log ?? logger).error({ err }, 'Unhandled error');
  }

  res.status(status).json(body);
};
