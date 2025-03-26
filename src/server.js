const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('./app');
const config = require('./utils/config');
const logger = require('./utils/logger');
const validateEnv = require('./utils/validateEnv');

// Get server port and workers
const PORT = config.get('server.port') || 3000;
const WORKERS = Math.min(
  parseInt(config.get('server.workers')) || 2,
  numCPUs
);

/**
 * Start the server
 */
async function startServer() {
  // Validate critical environment variables
  validateEnv.validateAndLog(true); // Exit on failure
  
  // Log important configuration at startup
  const config = require('./utils/config');
  
  // Show the API key (masked)
  const apiKey = config.get('chatbot.apiKey');
  if (!apiKey) {
    logger.error('CRITICAL: API Key is missing. Please check your .env file.');
  } else {
    const maskedKey = apiKey.substring(0, 6) + '...' + 
                     (apiKey.length > 10 ? apiKey.substring(apiKey.length - 4) : '');
    logger.info(`API Key: ${maskedKey}`);
  }
  
  // Verify Redis is configured
  const redisHost = config.get('redis.host');
  const redisPort = config.get('redis.port');
  
  if (!redisHost || !redisPort) {
    logger.error('CRITICAL: Redis configuration is missing. Please check your .env file.');
    process.exit(1); // Exit with error
  } else {
    logger.info(`Redis configured at ${redisHost}:${redisPort}`);
  }
  
  // Verify session service is initialized
  try {
    // Import the session service
    const sessionService = require('./services');
    
    // Explicitly check that required functions exist
    const requiredMethods = [
      'createSession', 
      'getSession', 
      'updateSession', 
      'endSession', 
      'storeChatbotResponse', 
      'getChatbotResponse'
    ];
    
    const availableMethods = Object.keys(sessionService);
    logger.info(`Session service has the following methods: ${availableMethods.join(', ')}`);
    
    const missingMethods = requiredMethods.filter(method => 
      typeof sessionService[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      throw new Error(`Session service is missing required methods: ${missingMethods.join(', ')}`);
    }
    
    logger.info('Session service initialized successfully with all required methods');
  } catch (error) {
    logger.error(`Failed to initialize session service: ${error.message}`);
    logger.error('Cannot start server without session service');
    process.exit(1); // Exit with error
  }
  
  app.listen(PORT, () => {
    logger.info(`Worker ${process.pid} started on port ${PORT}`);
  });
}

/**
 * Handle worker process errors
 */
function setupWorkerProcessHandlers() {
  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', {
      promise: promise,
      reason: reason
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.toString(),
      stack: error.stack
    });
    
    // Exit with error
    process.exit(1);
  });
}

/**
 * Main function to start the server with clustering
 */
async function main() {
  // If clustering is enabled and this is the master process
  if (WORKERS > 1 && cluster.isMaster) {
    logger.info(`Master ${process.pid} is running`);
    
    // Fork workers
    for (let i = 0; i < WORKERS; i++) {
      cluster.fork();
    }
    
    // Handle worker crashes
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
      cluster.fork();
    });
  } else {
    // This is a worker process or clustering is disabled
    try {
      await startServer();
      setupWorkerProcessHandlers();
    } catch (error) {
      logger.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    }
  }
}

// Start the server
main().catch(error => {
  logger.error(`Fatal error during server startup: ${error.message}`);
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});