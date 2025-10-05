const { ZodError } = require('zod');
const AppError = require('../errors/AppError');

const formatZodError = (error) => {
  return error.issues.map((issue) => ({
    path: Array.isArray(issue.path) ? issue.path.join('.') : issue.path,
    message: issue.message,
    code: issue.code,
    received: issue.received,
    expected: issue.expected
  }));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      issues: formatZodError(err)
    });
  }

  if (err instanceof AppError) {
    const statusCode = err.statusCode || 500;
    const payload = {
      error: err.code || 'APP_ERROR',
      message: err.message
    };

    if (err.details) {
      payload.details = err.details;
    }

    return res.status(statusCode).json(payload);
  }

  console.error('Unhandled application error:', err);

  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred. Please try again later.'
  });
};

module.exports = errorHandler;
