/**
 * Direct test to check if .env is being loaded correctly
 * Run with: node test-env-direct.js
 */

const fs = require('fs');
const path = require('path');

// Find .env file
const envPath = path.join(process.cwd(), '.env');
console.log(`Looking for .env file at: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found!');
  
  // Read contents
  const content = fs.readFileSync(envPath, 'utf8');
  
  // Check for API key
  if (content.includes('CHATBOT_API_KEY=')) {
    console.log('✅ CHATBOT_API_KEY found in .env file');
    
    // Extract the value (but mask it)
    const match = content.match(/CHATBOT_API_KEY=(.+)/);
    if (match && match[1]) {
      const value = match[1].trim();
      const masked = value.length > 10 ? 
        `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
        '********';
      console.log(`API Key value: ${masked}`);
      
      // Check format
      if (!value.startsWith('App ') && !value.startsWith('Bearer ')) {
        console.log('⚠️ Warning: API Key should start with "App " or "Bearer "');
      }
    }
  } else {
    console.log('❌ CHATBOT_API_KEY not found in .env file');
  }
  
  // Check for destination
  if (content.includes('CHATBOT_DESTINATION=')) {
    console.log('✅ CHATBOT_DESTINATION found in .env file');
  } else {
    console.log('❌ CHATBOT_DESTINATION not found in .env file');
  }
} else {
  console.log('❌ .env file not found!');
  console.log(`Please create a .env file at: ${envPath}`);
}

// Now test if dotenv loads it correctly
console.log('\nTesting dotenv loading:');
require('dotenv').config();

if (process.env.CHATBOT_API_KEY) {
  console.log('✅ dotenv loaded CHATBOT_API_KEY successfully');
  
  const value = process.env.CHATBOT_API_KEY;
  const masked = value.length > 10 ? 
    `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
    '********';
  console.log(`Value from dotenv: ${masked}`);
} else {
  console.log('❌ dotenv did not load CHATBOT_API_KEY');
}

// Create a sample .env file if needed
if (!fs.existsSync(envPath) || !content?.includes('CHATBOT_API_KEY=')) {
  console.log('\nCreating a sample .env file...');
  
  const sampleContent = `# Server Configuration
SERVER_PORT=3000
SERVER_WORKERS=2

# Session Management
USE_REDIS=false

# Chatbot Configuration
CHATBOT_BASE_URL=https://api.infobip.com
# IMPORTANT: Replace with your actual API key
CHATBOT_API_KEY=App your-api-key-here
CHATBOT_DESTINATION=db1c48bf-a482-4715-8f7f-0934eb371d81

# Logging Configuration
LOGGING_LEVEL=debug
`;
  
  // Write to a temporary file to not overwrite existing .env
  const tempPath = path.join(process.cwd(), '.env.sample');
  fs.writeFileSync(tempPath, sampleContent);
  
  console.log(`Sample .env file created at: ${tempPath}`);
  console.log('Please rename it to .env and fill in your actual API key');
}