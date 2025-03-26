/**
 * USSD Response Factory
 * Provides standardized response formats for USSD API
 */
const logger = require('./logger');

/**
 * Create a standard USSD response
 * @param {Object} options - Response options
 * @param {boolean} options.shouldClose - Whether to close the USSD session
 * @param {string} options.ussdMenu - Text to display in the USSD menu
 * @param {number} options.exitCode - Exit code (default: 200)
 * @param {string} options.message - Response message (default: "")
 * @returns {Object} - Formatted USSD response
 */
function createResponse(options) {
  const {
    shouldClose,
    ussdMenu,
    exitCode = 200,
    message = ""
  } = options;
  
  return {
    shouldClose,
    ussdMenu,
    responseExitCode: exitCode,
    responseMessage: message
  };
}

/**
 * Create a continue response (keep session open)
 * @param {string} text - Menu text to display
 * @returns {Object} - USSD continue response
 */
function continueSession(text) {
  return createResponse({
    shouldClose: false,
    ussdMenu: text
  });
}

/**
 * Create an end response (close session)
 * @param {string} text - Final message to display
 * @param {number} exitCode - Exit code (default: 200)
 * @returns {Object} - USSD end response
 */
function endSession(text, exitCode = 200) {
  return createResponse({
    shouldClose: true,
    ussdMenu: text,
    exitCode
  });
}

/**
 * Create an error response
 * @param {string} text - Error message to display
 * @param {number} exitCode - Exit code (default: 500)
 * @param {string} message - Technical error message (not shown to user)
 * @returns {Object} - USSD error response
 */
function errorResponse(text, exitCode = 500, message = "Internal server error") {
  return createResponse({
    shouldClose: true,
    ussdMenu: text,
    exitCode,
    message
  });
}

/**
 * Create a timeout response
 * @returns {Object} - USSD timeout response
 */
function timeoutResponse() {
  return errorResponse(
    "We are experiencing technical issues. Please try again later.",
    200,
    "Response timeout"
  );
}

/**
 * Create a not found response
 * @returns {Object} - USSD not found response
 */
function notFoundResponse() {
  return errorResponse(
    "Session expired. Please start again.",
    404,
    "Session not found"
  );
}

module.exports = {
  createResponse,
  continueSession,
  endSession,
  errorResponse,
  timeoutResponse,
  notFoundResponse
};