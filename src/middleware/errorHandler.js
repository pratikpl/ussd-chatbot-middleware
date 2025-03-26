const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error(`Unhandled error: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    error: err.toString(),
    stack: err.stack
  });
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Determine if this is a USSD API request based on URL
  const isUssdApiRequest = req.originalUrl.includes('/session/');
  
  if (isUssdApiRequest) {
    // Format error response for USSD API
    return res.status(500).json({
      shouldClose: true,
      ussdMenu: "Sorry, an error occurred. Please try again later.",
      responseExitCode: 500,
      responseMessage: "Internal server error"
    });
  }
  
  // For other API endpoints
  return res.status(500).json({
    status: "ERROR",
    message: "Internal server error",
    ...(process.env.NODE_ENV !== 'production' ? { error: err.message } : {})
  });
}

/**
 * 404 handler middleware
 */
function notFoundHandler(req, res, next) {
  logger.warn(`Route not found: ${req.originalUrl}`, {
    method: req.method,
    ip: req.ip
  });
  
  // Determine if this is a USSD API request based on URL
  const isUssdApiRequest = req.originalUrl.includes('/session/');
  
  if (isUssdApiRequest) {
    // Format 404 response for USSD API
    return res.status(404).json({
      shouldClose: true,
      ussdMenu: "Invalid request. Please try again.",
      responseExitCode: 404,
      responseMessage: "Not found"
    });
  }
  
  // For other API endpoints
  return res.status(404).json({
    status: "ERROR",
    message: "Resource not found"
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};