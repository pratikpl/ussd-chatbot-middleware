/**
 * Test routes for API connectivity and configuration
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

// Route to test the API connection
router.get('/api-test', async (req, res) => {
  try {
    // Get API key directly from environment variable
    const apiKey = process.env.CHATBOT_API_KEY;
    const baseUrl = process.env.CHATBOT_BASE_URL || 'https://api.infobip.com';
    const destination = process.env.CHATBOT_DESTINATION;
    
    // Return config status
    res.json({
      status: 'ok',
      envCheck: {
        apiKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set',
        baseUrl,
        destination: destination || 'Not set'
      }
    });
  } catch (error) {
    logger.error(`Error in API test: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Route to test sending a message
router.post('/send-test', async (req, res) => {
  try {
    // Get API key directly from environment variable
    const apiKey = process.env.CHATBOT_API_KEY;
    const baseUrl = process.env.CHATBOT_BASE_URL || 'https://api.infobip.com';
    const destination = process.env.CHATBOT_DESTINATION;
    
    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'API key is not configured'
      });
    }
    
    if (!destination) {
      return res.status(400).json({
        status: 'error',
        message: 'Destination ID is not configured'
      });
    }
    
    // Create test payload
    const payload = {
      sender: req.body.sender || "test-sender-uuid",
      destination: destination,
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
    
    // Log request details
    logger.info('Sending test API request', {
      url: `${baseUrl}/open-channel/1/messages/inbound`,
      payload,
      apiKeyMasked: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set'
    });
    
    // Send the request
    const response = await axios({
      method: 'post',
      url: `${baseUrl}/open-channel/1/messages/inbound`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      data: payload
    });
    
    // Return the response
    res.json({
      status: 'success',
      response: response.data
    });
  } catch (error) {
    logger.error(`Error sending test message: ${error.message}`, {
      error: error.toString(),
      response: error.response?.data
    });
    
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;