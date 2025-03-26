const sessionService = require('../services');
const logger = require('../utils/logger');

/**
 * Handle the chatbot callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCallback(req, res) {
  try {
    // Log the entire request body for debugging
    logger.debug('Chatbot callback full payload:', {
      body: JSON.stringify(req.body)
    });
    
    const { content, message, callbackData, sender, destination } = req.body;
    
    logger.info(`Chatbot callback received`, {
      sender,
      destination,
      callbackData
    });
    
    // Extract session ID from callback data
    const { sessionId } = callbackData || {};
    
    if (!sessionId) {
      logger.warn(`Callback received without sessionId`);
      return res.status(400).json({
        status: "ERROR",
        message: "Missing sessionId in callbackData"
      });
    }
    
    // Get session
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      logger.warn(`Callback received for unknown session: ${sessionId}`);
      return res.status(404).json({
        status: "ERROR",
        message: "Session not found"
      });
    }
    
    // Extract the text response - with more flexible handling
    let text = null;
    
    // Try different possible structures for the text content
    if (message?.body?.text) {
      // New structure from logs
      text = message.body.text;
    } else if (content?.body?.text) {
      // Standard structure
      text = content.body.text;
    } else if (content?.text) {
      // Alternative structure
      text = content.text;
    } else if (content?.message) {
      // Another possible structure
      text = content.message;
    } else if (typeof content === 'string') {
      // Plain text content
      text = content;
    } else if (message?.text) {
      // Direct message text
      text = message.text;
    } else if (typeof message === 'string') {
      // Plain message text
      text = message;
    } else if (content || message) {
      // If content/message exists but we can't find text, log the structure
      logger.warn(`Unknown content structure in callback:`, {
        content: JSON.stringify(content || message)
      });
      
      // Try to extract any string we can use
      if (typeof content === 'object') {
        // Search for any property that might contain the message
        for (const key in content) {
          if (typeof content[key] === 'string') {
            text = content[key];
            logger.info(`Using "${key}" field with value "${text}" as response`);
            break;
          } else if (typeof content[key] === 'object' && content[key]?.text) {
            text = content[key].text;
            logger.info(`Using "${key}.text" field with value "${text}" as response`);
            break;
          }
        }
      }
    }
    
    // If we still don't have text, use a default message
    if (!text) {
      logger.warn(`Callback received without text content for session: ${sessionId}`);
      text = "We are experiencing technical issues. Please try again later.";
      
      // Continue with a default message rather than returning an error
      // return res.status(400).json({
      //   status: "ERROR",
      //   message: "Missing text content"
      // });
    }
    
    // Store the response
    await sessionService.storeChatbotResponse(sessionId, text);
    
    logger.info(`Chatbot response stored for session: ${sessionId}`, {
      response: text
    });
    
    return res.status(200).json({
      status: "SUCCESS",
      message: "Response processed successfully"
    });
  } catch (error) {
    logger.error(`Error handling chatbot callback: ${error.message}`, {
      error: error.toString(),
      body: JSON.stringify(req.body)
    });
    
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error"
    });
  }
}

module.exports = {
  handleCallback
};