/**
 * Simple script to verify configuration is loading correctly
 * Run with: node verify-config.js
 */

// Import config utility
require('dotenv').config();
const configUtil = require('./src/utils/config');

console.log('=== USSD Middleware Configuration Check ===');
console.log('\nChecking environment variables...\n');

// Critical configurations
const configs = [
  ['server.port', 'SERVER_PORT'],
  ['chatbot.baseUrl', 'CHATBOT_BASE_URL'],
  ['chatbot.apiKey', 'CHATBOT_API_KEY'],
  ['chatbot.destination', 'CHATBOT_DESTINATION'],
  ['ussd.maxWaitTime', 'USSD_MAX_WAIT_TIME'],
  ['logging.level', 'LOGGING_LEVEL']
];

configs.forEach(([configKey, envKey]) => {
  const value = configUtil.get(configKey);
  const envValue = process.env[envKey];
  
  // Mask sensitive values
  let displayValue = value;
  if (configKey.includes('apiKey') || configKey.includes('password')) {
    displayValue = value && value.length > 10 ? 
      `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : 
      value ? '********' : 'null or empty';
  }
  
  console.log(`${configKey} (${envKey}):`);
  console.log(`  - Value from config: ${displayValue || 'null or empty'}`);
  console.log(`  - Environment variable: ${envValue ? 'Set' : 'Not set'}`);
  
  // Check for problems
  if (!value && ['chatbot.apiKey', 'chatbot.destination'].includes(configKey)) {
    console.error(`  - WARNING: ${configKey} is missing or empty!`);
  }
  
  console.log('');
});

// Run configuration check
configUtil.checkCriticalConfig();

console.log('\n=== Configuration check complete ===');