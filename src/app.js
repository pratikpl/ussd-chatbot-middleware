const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const expressWinston = require('express-winston');
const winston = require('winston');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const ussdRoutes = require('./routes/ussd');
const chatbotRoutes = require('./routes/chatbot');
const uiRoutes = require('./routes/ui');
const testRoutes = require('./routes/test');

// Create express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for simplicity in this demo
}));

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
}));

// Install routes
app.use('/', uiRoutes);
app.use('/', ussdRoutes); // USSD webhook routes
app.use('/chatbot', chatbotRoutes); // Chatbot callback route
app.use('/test', testRoutes); // Test routes

// 404 handler
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

module.exports = app;