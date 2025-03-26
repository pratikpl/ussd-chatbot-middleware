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

// Redis health check endpoint
router.get('/redis-health', async (req, res) => {
  try {
    // Import redis and promisify
    const redis = require('redis');
    const { promisify } = require('util');
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT) || 6379;
    
    // Create a temporary client for the health check
    const client = redis.createClient({
      host: redisHost,
      port: redisPort,
      connect_timeout: 2000, // 2 seconds timeout
      retry_strategy: () => undefined // Don't retry
    });
    
    // Promisify ping
    const pingAsync = promisify(client.ping).bind(client);
    
    // Set a timeout for the health check
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis health check timed out')), 2000);
    });
    
    // Race between ping and timeout
    const result = await Promise.race([
      pingAsync(),
      timeoutPromise
    ]);
    
    // Close the client
    client.quit();
    
    // Check result
    if (result === 'PONG') {
      logger.info('Redis health check: OK');
      return res.json({
        status: 'healthy',
        message: 'Redis connection successful',
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn(`Redis health check: Unexpected response: ${result}`);
      return res.status(500).json({
        status: 'unhealthy',
        message: `Unexpected Redis response: ${result}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error(`Redis health check failed: ${error.message}`);
    return res.status(500).json({
      status: 'unhealthy',
      message: `Redis connection failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;