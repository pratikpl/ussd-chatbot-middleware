/**
 * Environment variable validation utility
 */
const logger = require('./logger');

/**
 * Validate required environment variables
 * @returns {Array} Array of missing or invalid variables
 */
function validateEnvironment() {
  const issues = [];
  
  // Critical environment variables
  const criticalVars = [
    {
      name: 'CHATBOT_API_KEY',
      validator: (val) => !!val && val.trim() !== ''
    },
    {
      name: 'CHATBOT_DESTINATION',
      validator: (val) => !!val && val.trim() !== ''
    },
    {
      name: 'REDIS_HOST',
      validator: (val) => !!val && val.trim() !== ''
    },
    {
      name: 'REDIS_PORT',
      validator: (val) => {
        const port = parseInt(val);
        return !isNaN(port) && port > 0 && port <= 65535;
      }
    }
  ];
  
  // Check each critical variable
  criticalVars.forEach(({name, validator}) => {
    const value = process.env[name];
    if (!validator(value)) {
      issues.push({
        name,
        value: name.includes('KEY') || name.includes('PASSWORD') ? '******' : value,
        message: value === undefined ? 'Missing' : 'Invalid'
      });
    }
  });
  
  return issues;
}

/**
 * Validate environment variables and log issues
 * @param {boolean} exitOnFailure - Whether to exit process on validation failure
 * @returns {boolean} - Whether validation passed
 */
function validateAndLog(exitOnFailure = false) {
  const issues = validateEnvironment();
  
  if (issues.length === 0) {
    logger.info('Environment validation passed - all required variables are set');
    return true;
  }
  
  logger.error('Environment validation failed:', { issues: issues.map(i => `${i.name}: ${i.message}`) });
  
  if (exitOnFailure) {
    logger.error('Exiting due to environment validation failure');
    process.exit(1);
  }
  
  return false;
}

module.exports = {
  validateEnvironment,
  validateAndLog
};