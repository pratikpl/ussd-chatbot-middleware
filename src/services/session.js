const redis = require('redis');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const config = require('../utils/config');
const logger = require('../utils/logger');

// Create Redis client
const redisConfig = {
  host: config.get('redis.host') || 'localhost',
  port: parseInt(config.get('redis.port')) || 6379,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max attempts reached, stopping retries');
      return undefined;
    }
    
    // Implement exponential backoff with jitter
    const delay = Math.min(
      Math.pow(2, options.attempt) * 100 + Math.floor(Math.random() * 100),
      3000
    );
    logger.info(`Retrying Redis connection in ${delay}ms (attempt ${options.attempt})`);
    return delay;
  },
  enable_offline_queue: true
};

// Add password only if it's provided and not null
const redisPassword = config.get('redis.password');
if (redisPassword && redisPassword !== 'null' && redisPassword !== 'undefined') {
  redisConfig.password = redisPassword;
}

const client = redis.createClient(redisConfig);

// Promisify Redis commands
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const expireAsync = promisify(client.expire).bind(client);

// Session TTL in seconds (e.g., 10 minutes)
const SESSION_TTL = 600;

// Log Redis errors
client.on('error', (err) => {
  logger.error(`Redis Error: ${err.message}`, { error: err.toString() });
});

// Log successful Redis connection
client.on('connect', () => {
  logger.info('Connected to Redis server');
});

/**
 * Create a new session
 * @param {string} sessionId - USSD session ID
 * @param {string} msisdn - User's phone number
 * @returns {Object} - Session object
 */
async function createSession(sessionId, msisdn) {
  // Generate a UUID for this user
  const senderUuid = uuidv4();
  
  const session = {
    sessionId,
    msisdn,
    senderUuid,
    state: 'active',
    createdAt: Date.now(),
    lastInteraction: Date.now()
  };
  
  await setAsync(`session:${sessionId}`, JSON.stringify(session));
  await expireAsync(`session:${sessionId}`, SESSION_TTL);
  
  logger.info(`Session created: ${sessionId}`, { msisdn, senderUuid });
  return session;
}

/**
 * Get a session by ID
 * @param {string} sessionId - USSD session ID
 * @returns {Object|null} - Session object or null if not found
 */
async function getSession(sessionId) {
  const data = await getAsync(`session:${sessionId}`);
  
  if (!data) {
    logger.warn(`Session not found: ${sessionId}`);
    return null;
  }
  
  return JSON.parse(data);
}

/**
 * Update a session
 * @param {string} sessionId - USSD session ID
 * @param {Object} updates - Updates to apply to the session
 * @returns {Object|null} - Updated session object or null if not found
 */
async function updateSession(sessionId, updates) {
  const session = await getSession(sessionId);
  
  if (!session) {
    logger.warn(`Cannot update non-existent session: ${sessionId}`);
    return null;
  }
  
  // Ensure we preserve the senderUuid when updating
  const updatedSession = {
    ...session,
    ...updates,
    senderUuid: updates.senderUuid || session.senderUuid,
    lastInteraction: Date.now()
  };
  
  await setAsync(`session:${sessionId}`, JSON.stringify(updatedSession));
  await expireAsync(`session:${sessionId}`, SESSION_TTL);
  
  logger.debug(`Session updated: ${sessionId}`);
  return updatedSession;
}

/**
 * End a session
 * @param {string} sessionId - USSD session ID
 * @returns {boolean} - True if session was ended, false otherwise
 */
async function endSession(sessionId) {
  const session = await getSession(sessionId);
  
  if (!session) {
    logger.warn(`Cannot end non-existent session: ${sessionId}`);
    return false;
  }
  
  await delAsync(`session:${sessionId}`);
  logger.info(`Session ended: ${sessionId}`);
  return true;
}

/**
 * Store a chatbot response for a session
 * @param {string} sessionId - USSD session ID
 * @param {string} response - Chatbot response text
 * @returns {boolean} - True if response was stored
 */
async function storeChatbotResponse(sessionId, response) {
  await setAsync(`response:${sessionId}`, response);
  await expireAsync(`response:${sessionId}`, SESSION_TTL);
  
  logger.debug(`Stored chatbot response for session: ${sessionId}`);
  return true;
}

/**
 * Get a chatbot response for a session and delete it
 * @param {string} sessionId - USSD session ID
 * @returns {string|null} - Chatbot response text or null if not found
 */
async function getChatbotResponse(sessionId) {
  const response = await getAsync(`response:${sessionId}`);
  
  if (response) {
    await delAsync(`response:${sessionId}`);
    logger.debug(`Retrieved chatbot response for session: ${sessionId}`);
  }
  
  return response;
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  endSession,
  storeChatbotResponse,
  getChatbotResponse
};