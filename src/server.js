const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('./app');
const config = require('./utils/config');
const logger = require('./utils/logger');

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
    // Simply importing the service will check if Redis is available
    // because we've added the validation in the session.js file
    require('./services');
    logger.info('Session service initialized successfully');
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
function main() {
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
    startServer();
    setupWorkerProcessHandlers();
  }
}

// Start the server
main();