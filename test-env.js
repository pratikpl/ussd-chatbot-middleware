/**
 * This is a simple utility to test if environment variables are loading correctly.
 * Run with: node test-env.js
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env file
console.log('Loading .env file...');
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('\n.env file not found! Please create it at:', envPath);
  } else {
    console.log('\n.env file exists at:', envPath);
    console.log('File content (first few lines):');
    
    // Read and display first few lines
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').slice(0, 10);
    lines.forEach(line => {
      // Don't display actual API keys
      if (line.includes('API_KEY') || line.includes('PASSWORD')) {
        console.log(line.replace(/=.+/, '=********'));
      } else {
        console.log(line);
      }
    });
    
    if (content.split('\n').length > 10) {
      console.log('... (more lines)');
    }
  }
} else {
  console.log('Successfully loaded .env file');
}

// Check specific variables
console.log('\nChecking important environment variables:');
const variables = [
  'CHATBOT_BASE_URL',
  'CHATBOT_API_KEY',
  'CHATBOT_DESTINATION',
  'NODE_ENV'
];

variables.forEach(varName => {
  const value = process.env[varName];
  if (value === undefined) {
    console.error(`❌ ${varName}: not set`);
  } else if (value === '') {
    console.error(`⚠️ ${varName}: empty string`);
  } else {
    // Mask sensitive data
    if (varName.includes('API_KEY') || varName.includes('PASSWORD')) {
      const maskedValue = value.length > 10 ? 
        `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : 
        '********';
      console.log(`✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('\nAll environment variables:');
Object.keys(process.env)
  .filter(key => !key.toLowerCase().includes('key') && !key.toLowerCase().includes('password'))
  .forEach(key => {
    console.log(`${key}=${process.env[key]}`);
  });

console.log('\nNote: For security, not showing variables with "key" or "password" in the name');