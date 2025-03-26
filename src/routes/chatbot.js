const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot');

// Chatbot callback endpoint
router.post('/callback', chatbotController.handleCallback);

module.exports = router;