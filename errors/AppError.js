class AppError extends Error {
  constructor(message, options = {}) {
    const {
      statusCode = 500,
      code = 'APP_ERROR',
      details = null,
      cause = undefined
    } = options;

    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = AppError;
