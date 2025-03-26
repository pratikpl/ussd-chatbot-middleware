/**
 * API debugging utility functions
 */
const logger = require('./logger');

/**
 * Create a simple endpoint to check API configuration
 * @param {Express} app - Express app instance
 */
function setupApiDebugRoutes(app) {
  app.get('/debug/config', (req, res) => {
    const config = require('./config');
    const dotenv = require('dotenv');
    
    // Load env variables directly to check what's available
    const envVars = dotenv.config().parsed || {};
    
    // Get API configuration (but mask sensitive data)
    const apiConfig = {
      baseUrl: config.get('chatbot.baseUrl'),
      // Show first few and last few characters of API key
      apiKey: maskString(config.get('chatbot.apiKey')),
      destination: config.get('chatbot.destination')
    };
    
    // Check for environment variables
    const envConfig = {
      CHATBOT_BASE_URL: maskString(envVars.CHATBOT_BASE_URL),
      CHATBOT_API_KEY: maskString(envVars.CHATBOT_API_KEY),
      CHATBOT_DESTINATION: maskString(envVars.CHATBOT_DESTINATION)
    };
    
    res.json({ 
      status: 'ok',
      apiConfig,
      envConfig,
      message: apiConfig.apiKey ? 'API key is configured' : 'API key is missing or null'
    });
  });
  
  app.post('/debug/test-chatbot', async (req, res) => {
    const axios = require('axios');
    const config = require('./config');
    
    try {
      // Create a test payload
      const payload = {
        sender: req.body.sender || "test-sender",
        destination: config.get('chatbot.destination'),
        content: {
          body: {
            type: "TEXT",
            text: req.body.message || "Test message"
          }
        },
        responseWebhook: {
          callbackData: { test: true }
        },
        metadata: { test: true }
      };
      
      // Log full request details
      logger.info('Test chatbot request:', {
        url: `${config.get('chatbot.baseUrl')}/open-channel/1/messages/inbound`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': maskString(config.get('chatbot.apiKey'))
        },
        payload
      });
      
      // Make the request
      const response = await axios({
        method: 'post',
        url: `${config.get('chatbot.baseUrl')}/open-channel/1/messages/inbound`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.get('chatbot.apiKey')
        },
        data: payload
      });
      
      // Return the response
      res.json({
        status: 'success',
        response: response.data
      });
    } catch (error) {
      logger.error('Test chatbot request failed:', {
        error: error.toString(),
        response: error.response?.data
      });
      
      res.status(500).json({
        status: 'error',
        error: error.toString(),
        response: error.response?.data
      });
    }
  });
}

/**
 * Mask sensitive string (show only first and last few characters)
 * @param {string} str - String to mask
 * @returns {string} - Masked string
 */
function maskString(str) {
  if (!str) return null;
  
  const length = str.length;
  if (length <= 8) return '********';
  
  return `${str.substring(0, 4)}...${str.substring(length - 4)}`;
}

module.exports = {
  setupApiDebugRoutes
};