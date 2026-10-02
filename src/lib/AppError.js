/**
 * An expected, user-facing error. Services throw it; the central error handler turns it
 * into `{ error: { code, message, fields? } }` with the given HTTP status.
 */
export class AppError extends Error {
  statusCode;
  code;
  fields;

  constructor(statusCode, code, message, fields) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message, fields) {
    return new AppError(400, 'BAD_REQUEST', message, fields);
  }

  static unauthorized(message = 'Please log in to continue.') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have access to this.') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found.') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message) {
    return new AppError(409, 'CONFLICT', message);
  }
}
