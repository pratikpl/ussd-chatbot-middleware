/**
 * Configuration utility that directly accesses environment variables
 */
const path = require('path');
const dotenv = require('dotenv');
const logger = require('./logger');

// Force loading the .env file from the project root
const envPath = path.join(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`Error loading .env file: ${result.error.message}`);
} else {
  console.log(`Successfully loaded .env file from ${envPath}`);
}

// Simple mapping for key conversion
const keyMap = {
  'chatbot.apiKey': 'CHATBOT_API_KEY',
  'chatbot.baseUrl': 'CHATBOT_BASE_URL',
  'chatbot.destination': 'CHATBOT_DESTINATION',
  'server.port': 'SERVER_PORT',
  'logging.level': 'LOGGING_LEVEL'
};

/**
 * Get configuration value directly from environment variables
 * @param {string} key - Configuration key
 * @returns {string} - Configuration value
 */
function get(key) {
  // Get the environment variable name from the map or convert
  const envKey = keyMap[key] || key.toUpperCase().replace(/\./g, '_');
  
  // Log the access - this helps debug
  const value = process.env[envKey];
  if (key.includes('apiKey') || key.includes('password')) {
    // Mask sensitive data in logs
    const maskedValue = value ? 
      (value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '********') : 
      'undefined';
    console.log(`Config accessed: ${key} (${envKey}) = ${maskedValue}`);
  } else {
    console.log(`Config accessed: ${key} (${envKey}) = ${value}`);
  }
  
  return value;
}

// On module load, log all key environmental variables to verify they're loaded
if (require.main !== module) {
  console.log('ENVIRONMENT CHECK:');
  console.log(`CHATBOT_API_KEY exists: ${process.env.CHATBOT_API_KEY ? 'YES' : 'NO'}`);
  console.log(`CHATBOT_DESTINATION exists: ${process.env.CHATBOT_DESTINATION ? 'YES' : 'NO'}`);
  
  if (process.env.CHATBOT_API_KEY) {
    const apiKey = process.env.CHATBOT_API_KEY;
    const masked = apiKey.length > 8 ? 
      `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 
      '********';
    console.log(`API Key: ${masked}`);
  }
}

module.exports = { get };