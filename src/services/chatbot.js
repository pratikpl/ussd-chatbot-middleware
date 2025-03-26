const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../utils/config');
const logger = require('../utils/logger');
const sessionService = require('../services');

// Store a mapping of phone numbers to UUIDs for consistency
const phoneToUuidMap = new Map();

// Create axios instance
const createChatbotClient = () => {
  // Get API key from configuration
  const apiKey = config.get('chatbot.apiKey');
  
  // Log API key information (masked)
  if (!apiKey) {
    logger.error('API Key is missing or empty. Please check your .env file or configuration.');
  } else {
    const maskedKey = apiKey.length > 10 ? 
      `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 
      '********';
    logger.info(`Using API Key: ${maskedKey}`);
  }
  
  return axios.create({
    baseURL: config.get('chatbot.baseUrl'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    timeout: 5000
  });
};

// Create client
const chatbotClient = createChatbotClient();

// Log request interceptor for debugging
chatbotClient.interceptors.request.use(request => {
  // Create a copy of headers to mask the API key
  const maskedHeaders = { ...request.headers };
  if (maskedHeaders.Authorization) {
    const auth = maskedHeaders.Authorization;
    // Show first 6 and last 4 characters if long enough
    maskedHeaders.Authorization = auth.length > 10 ? 
      `${auth.substring(0, 6)}...${auth.substring(auth.length - 4)}` : 
      '********';
  }
  
  logger.debug('Outgoing request to chatbot platform:', {
    url: request.url,
    method: request.method,
    headers: maskedHeaders,
    data: request.data
  });
  return request;
});

// Log response interceptor for debugging
chatbotClient.interceptors.response.use(
  response => {
    logger.debug('Response from chatbot platform:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    logger.error('Error from chatbot platform:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

/**
 * Send a message to the chatbot platform
 * @param {Object} session - Session object
 * @param {string} text - Message text
 * @returns {Object} - Chatbot platform response
 */
async function sendToChatbot(session, text) {
  try {
    logger.info(`Sending message to chatbot for session: ${session.sessionId}`, {
      msisdn: session.msisdn,
      text: text
    });
    
    // Get latest API key directly from config
    // This ensures we always use the latest value
    const apiKey = config.get('chatbot.apiKey');
    const baseUrl = config.get('chatbot.baseUrl') || 'https://api.infobip.com';
    const destination = config.get('chatbot.destination');
    
    // Log critical configuration issues
    if (!apiKey) {
      logger.error('Missing API key - authentication will fail');
    }
    if (!destination) {
      logger.error('Missing destination ID - request will likely fail');
    }
    
    // Create headers with proper error handling
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Only add Authorization header if API key exists and is not empty
    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = apiKey;
      logger.info(`Using API key for authentication: ${apiKey.substring(0, 4)}...`);
    } else {
      logger.error('API key is empty or missing. Authentication will fail.');
    }
    
    // Create a fresh client with the latest config
    const client = axios.create({
      baseURL: baseUrl,
      headers: headers,
      timeout: 5000
    });
    
    // Add request logging interceptor
    client.interceptors.request.use(request => {
      // Create a copy of headers to mask the API key
      const maskedHeaders = { ...request.headers };
      if (maskedHeaders.Authorization) {
        const auth = maskedHeaders.Authorization;
        // Show first 6 and last 4 characters if long enough
        maskedHeaders.Authorization = auth.length > 10 ? 
          `${auth.substring(0, 6)}...${auth.substring(auth.length - 4)}` : 
          '********';
      }
      
      logger.debug('Outgoing request to chatbot platform:', {
        url: request.url,
        method: request.method,
        headers: maskedHeaders,
        data: request.data
      });
      return request;
    });
    
    // Use the UUID from the session if available, otherwise generate one
    // This ensures the same UUID is used throughout the session
    if (!session.senderUuid) {
      // Generate a new UUID only if the session doesn't have one
      const newUuid = uuidv4();
      
      // Update the session with the new UUID
      await sessionService.updateSession(session.sessionId, {
        senderUuid: newUuid
      });
      
      logger.debug(`Session ${session.sessionId} missing senderUuid, using generated: ${newUuid}`);
      session.senderUuid = newUuid;
    } else {
      logger.debug(`Reusing existing senderUuid for session ${session.sessionId}: ${session.senderUuid}`);
    }
    
    const payload = {
      sender: session.senderUuid,
      destination: destination,
      content: {
        body: {
          type: "TEXT",
          text: text || "Hello"
        }
      },
      responseWebhook: {
        callbackData: { 
          sessionId: session.sessionId,
          msisdn: session.msisdn  // Include the phone number in callback data
        }
      },
      metadata: { 
        sessionId: session.sessionId,
        msisdn: session.msisdn    // Include the phone number in metadata
      }
    };
    
    logger.debug(`Chatbot request payload`, { payload });
    
    const response = await client.post(
      '/open-channel/1/messages/inbound',
      payload
    );
    
    logger.debug(`Chatbot response`, { response: response.data });
    
    return response.data;
  } catch (error) {
    // Specific error handling for authentication issues
    if (error.response && error.response.status === 401) {
      logger.error(`Authentication failed with the Infobip API: ${error.message}`, {
        sessionId: session.sessionId,
        statusCode: error.response.status,
        responseData: error.response.data
      });
      
      throw new Error('Authentication failed with Infobip. Please check your API key.');
    }
    
    logger.error(`Error sending to chatbot: ${error.message}`, {
      sessionId: session.sessionId,
      error: error.toString(),
      ...(error.response ? { 
        statusCode: error.response.status,
        responseData: error.response.data 
      } : {})
    });
    
    throw error;
  }
}

module.exports = {
  sendToChatbot
};