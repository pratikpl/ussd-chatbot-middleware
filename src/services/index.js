/**
 * Session service that uses Redis for all session management
 */
const logger = require('../utils/logger');

let sessionService;

try {
  // Always use Redis for session management
  logger.info('Using Redis for session management');
  sessionService = require('./session');
  
  // Verify the session service has the required methods
  const requiredMethods = [
    'createSession', 
    'getSession', 
    'updateSession', 
    'endSession', 
    'storeChatbotResponse', 
    'getChatbotResponse'
  ];
  
  const missingMethods = requiredMethods.filter(method => 
    typeof sessionService[method] !== 'function'
  );
  
  if (missingMethods.length > 0) {
    throw new Error(`Session service is missing required methods: ${missingMethods.join(', ')}`);
  }
  
  logger.info('Session service loaded successfully with all required methods');
} catch (error) {
  logger.error(`Fatal error initializing Redis session service: ${error.message}`);
  // Instead of falling back to in-memory, we'll throw an error
  throw new Error(`Failed to initialize Redis session service: ${error.message}`);
}

// Export the session service directly
module.exports = sessionService;