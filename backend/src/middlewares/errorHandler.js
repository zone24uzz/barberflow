export function errorHandler(err, req, res, next) {
  console.error('Unhandled server error:', err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server xatosi, keyinroq urinib ko\'ring'
  });
}
