/**
 * In-memory session service that can be used as an alternative to Redis
 * for development or testing purposes
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// In-memory storage
const sessions = new Map();
const responses = new Map();

// Session TTL in milliseconds (e.g., 10 minutes)
const SESSION_TTL = 600000;

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
  
  sessions.set(sessionId, session);
  
  // Auto-expire session after TTL
  setTimeout(() => {
    if (sessions.has(sessionId)) {
      sessions.delete(sessionId);
      logger.debug(`Session expired: ${sessionId}`);
    }
  }, SESSION_TTL);
  
  logger.info(`Session created: ${sessionId}`, { msisdn, senderUuid });
  return session;
}

/**
 * Get a session by ID
 * @param {string} sessionId - USSD session ID
 * @returns {Object|null} - Session object or null if not found
 */
async function getSession(sessionId) {
  const session = sessions.get(sessionId);
  
  if (!session) {
    logger.warn(`Session not found: ${sessionId}`);
    return null;
  }
  
  return session;
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
  
  sessions.set(sessionId, updatedSession);
  
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
  
  sessions.delete(sessionId);
  responses.delete(sessionId);
  
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
  responses.set(sessionId, response);
  
  // Auto-expire response after TTL
  setTimeout(() => {
    if (responses.has(sessionId)) {
      responses.delete(sessionId);
      logger.debug(`Response expired: ${sessionId}`);
    }
  }, SESSION_TTL);
  
  logger.debug(`Stored chatbot response for session: ${sessionId}`);
  return true;
}

/**
 * Get a chatbot response for a session and delete it
 * @param {string} sessionId - USSD session ID
 * @returns {string|null} - Chatbot response text or null if not found
 */
async function getChatbotResponse(sessionId) {
  const response = responses.get(sessionId);
  
  if (response) {
    responses.delete(sessionId);
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