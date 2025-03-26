/**
 * Service selector - chooses between Redis and in-memory session services
 * based on environment configuration
 */
const config = require('../utils/config');
const logger = require('../utils/logger');

let sessionService;

try {
  // Check if we should use Redis
  const useRedis = process.env.USE_REDIS === 'true' || process.env.NODE_ENV === 'production';
  
  if (useRedis) {
    logger.info('Using Redis for session management');
    sessionService = require('./session');
  } else {
    logger.info('Using in-memory storage for session management');
    sessionService = require('./memory-session');
  }
} catch (error) {
  // Fall back to in-memory if Redis fails
  logger.warn(`Error initializing Redis, falling back to in-memory storage: ${error.message}`);
  sessionService = require('./memory-session');
}

module.exports = sessionService;