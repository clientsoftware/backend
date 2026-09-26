/**
 * Centralized error-handling middleware
 */
export function notFound(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, data: null, message: 'Invalid ID format' });
  }

  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      data: null,
      message: `Duplicate value for ${field}`,
    });
  }

  // Validation
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(422).json({ success: false, data: null, message });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    data: err.data || null,
    message: err.message || 'Server error',
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 400, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}
