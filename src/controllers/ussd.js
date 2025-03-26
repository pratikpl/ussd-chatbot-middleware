const sessionService = require('../services');
const chatbotService = require('../services/chatbot');
const logger = require('../utils/logger');
const config = require('../utils/config');
const ussdResponse = require('../utils/ussdResponse');

// Maximum wait time in milliseconds
const MAX_WAIT_TIME = parseInt(config.get('ussd.maxWaitTime')) || 3000;
// Poll interval in milliseconds
const POLL_INTERVAL = parseInt(config.get('ussd.pollInterval')) || 200;
// Maximum number of poll attempts
const MAX_POLL_ATTEMPTS = Math.floor(MAX_WAIT_TIME / POLL_INTERVAL);

/**
 * Handle the USSD start request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleStart(req, res) {
  const { sessionId } = req.params;
  const { msisdn, text, shortCode } = req.body;
  
  logger.info(`USSD session started: ${sessionId}`, {
    msisdn,
    shortCode,
    text
  });
  
  try {
    // Create new session
    const session = await sessionService.createSession(sessionId, msisdn);
    
    logger.info(`Session created with UUID: ${session.senderUuid}`, {
      sessionId,
      msisdn,
      senderUuid: session.senderUuid
    });
    
    // Forward to chatbot
    await chatbotService.sendToChatbot(session, text || "start");
    
    // Poll for response with timeout
    const response = await pollForResponse(sessionId);
    
    if (response) {
      logger.info(`Responding to USSD start with chatbot response: ${sessionId}`);
      return res.json(ussdResponse.continueSession(response));
    }
    
    // If no response within timeout, send a waiting message
    logger.warn(`No chatbot response received in time for session: ${sessionId}`);
    return res.json(ussdResponse.timeoutResponse());
  } catch (error) {
    logger.error(`Error in USSD start handler: ${error.message}`, {
      sessionId,
      error: error.toString()
    });
    
    // Determine if this is a configuration error
    const isConfigError = error.message.includes('API key is missing') || 
                          error.message.includes('Destination ID is missing');
    
    let errorMessage = "Sorry, an error occurred. Please try again later.";
    
    // If it's a configuration error, provide a more specific message
    if (isConfigError) {
      errorMessage = "Service is currently unavailable due to configuration issues. Please contact the service provider.";
    }
    
    return res.status(500).json(ussdResponse.errorResponse(
      errorMessage, 
      500, 
      error.message
    ));
  }
}

/**
 * Handle the USSD response request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleResponse(req, res) {
  const { sessionId } = req.params;
  const { msisdn, text } = req.body;
  
  logger.info(`USSD response received: ${sessionId}`, {
    msisdn,
    text
  });
  
  try {
    
    // Get session
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      logger.warn(`Session not found for response: ${sessionId}`);
      return res.status(404).json(ussdResponse.notFoundResponse());
    }
    
    // Update session
    await sessionService.updateSession(sessionId, {
      lastInteraction: Date.now()
    });
    
    // Forward to chatbot
    await chatbotService.sendToChatbot(session, text);
    
    // Poll for response with timeout
    const response = await pollForResponse(sessionId);
    
    if (response) {
      // Check if the chatbot response contains [END] to terminate the session
      const shouldClose = response.includes('[END]');
      
      // If response contains [END], remove it from the message
      let cleanResponse = response;
      if (shouldClose) {
        cleanResponse = response.replace('[END]', '').trim();
        logger.info(`Chatbot requested to end session with [END] keyword: ${sessionId}`);
      }
      
      logger.info(`Responding to USSD response with chatbot response: ${sessionId}, shouldClose: ${shouldClose}`);
      
      if (shouldClose) {
        return res.json(ussdResponse.endSession(cleanResponse));
      } else {
        return res.json(ussdResponse.continueSession(cleanResponse));
      }
    }
    
    // If no response within timeout, send an error message
    logger.warn(`No chatbot response received in time for session: ${sessionId}`);
    return res.json(ussdResponse.timeoutResponse());
  } catch (error) {
    logger.error(`Error in USSD response handler: ${error.message}`, {
      sessionId,
      error: error.toString()
    });
    
    // Determine if this is a configuration error
    const isConfigError = error.message.includes('API key is missing') || 
                          error.message.includes('Destination ID is missing');
    
    let errorMessage = "Sorry, an error occurred. Please try again later.";
    
    // If it's a configuration error, provide a more specific message
    if (isConfigError) {
      errorMessage = "Service is currently unavailable due to configuration issues. Please contact the service provider.";
    }
    
    return res.status(500).json(ussdResponse.errorResponse(
      errorMessage, 
      500, 
      error.message
    ));
  }
}

/**
 * Handle the USSD end request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleEnd(req, res) {
  const { sessionId } = req.params;
  const { exitCode, reason } = req.body;
  
  logger.info(`USSD session ended: ${sessionId}`, {
    exitCode,
    reason
  });
  
  try {
    // End the session
    await sessionService.endSession(sessionId);
    
    return res.json({
      responseExitCode: 200,
      responseMessage: ""
    });
  } catch (error) {
    logger.error(`Error in USSD end handler: ${error.message}`, {
      sessionId,
      error: error.toString()
    });
    
    return res.status(500).json({
      responseExitCode: 500,
      responseMessage: "Internal server error"
    });
  }
}

/**
 * Poll for chatbot response
 * @param {string} sessionId - USSD session ID
 * @returns {string|null} - Chatbot response or null if timeout
 */
async function pollForResponse(sessionId) {
  let attempts = 0;
  
  while (attempts < MAX_POLL_ATTEMPTS) {
    const response = await sessionService.getChatbotResponse(sessionId);
    
    if (response) {
      return response;
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    attempts++;
  }
  
  return null;
}

module.exports = {
  handleStart,
  handleResponse,
  handleEnd
};