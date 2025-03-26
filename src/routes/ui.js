const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const { user, pass } = req.query;
  
  // Simple hardcoded authentication for demo
  // In production, use a proper authentication system
  if (user === 'admin' && pass === 'admin123') {
    return next();
  }
  
  return res.status(401).send('Authentication required');
};

// UI routes
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>USSD Middleware</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          text-align: center;
        }
        h1 {
          margin-bottom: 20px;
        }
        .login-form {
          max-width: 300px;
          margin: 0 auto;
        }
        input {
          width: 100%;
          padding: 8px;
          margin-bottom: 10px;
        }
        button {
          width: 100%;
          padding: 10px;
          background-color: #4CAF50;
          color: white;
          border: none;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1>USSD Middleware</h1>
      <div class="login-form">
        <h2>Log Viewer</h2>
        <form action="/logs" method="get">
          <input type="text" name="user" placeholder="Username" required>
          <input type="password" name="pass" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

router.get('/logs', authenticate, (req, res) => {
  const logsDir = path.join(process.cwd(), 'logs');
  
  try {
    // Get list of log files
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logsDir, file),
        stats: fs.statSync(path.join(logsDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);
    
    // Generate HTML for log files list
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>USSD Middleware - Logs</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          h1 {
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          a {
            color: #1a73e8;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <h1>USSD Middleware - Log Files</h1>
        <table>
          <tr>
            <th>File Name</th>
            <th>Size</th>
            <th>Last Modified</th>
            <th>Actions</th>
          </tr>
    `;
    
    if (files.length === 0) {
      html += `
        <tr>
          <td colspan="4">No log files found</td>
        </tr>
      `;
    } else {
      files.forEach(file => {
        html += `
          <tr>
            <td>${file.name}</td>
            <td>${(file.stats.size / 1024).toFixed(2)} KB</td>
            <td>${file.stats.mtime.toISOString()}</td>
            <td>
              <a href="/logs/${file.name}?user=${req.query.user}&pass=${req.query.pass}">View</a>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
        </table>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    logger.error(`Error loading log files: ${error.message}`);
    res.status(500).send('Error loading log files');
  }
});

router.get('/logs/:file', authenticate, (req, res) => {
  const { file } = req.params;
  const logFile = path.join(process.cwd(), 'logs', file);
  
  try {
    // Check if file exists and is a .log file
    if (!fs.existsSync(logFile) || !file.endsWith('.log')) {
      return res.status(404).send('Log file not found');
    }
    
    // Get file stats
    const stats = fs.statSync(logFile);
    
    // Read last N lines of the file
    const maxLines = req.query.lines || 100;
    const fileContent = fs.readFileSync(logFile, 'utf8');
    const lines = fileContent.split('\n')
      .filter(line => line.trim())
      .slice(-maxLines);
    
    // Generate HTML for log content
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>USSD Middleware - ${file}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          h1 {
            margin-bottom: 20px;
          }
          .log-meta {
            margin-bottom: 20px;
          }
          .log-meta p {
            margin: 5px 0;
          }
          pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-all;
          }
          .controls {
            margin-bottom: 20px;
          }
          a {
            color: #1a73e8;
            text-decoration: none;
            margin-right: 10px;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <h1>USSD Middleware - ${file}</h1>
        
        <div class="controls">
          <a href="/logs?user=${req.query.user}&pass=${req.query.pass}">Back to Logs</a>
          <a href="/logs/${file}?user=${req.query.user}&pass=${req.query.pass}&lines=50">Last 50 lines</a>
          <a href="/logs/${file}?user=${req.query.user}&pass=${req.query.pass}&lines=100">Last 100 lines</a>
          <a href="/logs/${file}?user=${req.query.user}&pass=${req.query.pass}&lines=500">Last 500 lines</a>
        </div>
        
        <div class="log-meta">
          <p><strong>File:</strong> ${file}</p>
          <p><strong>Size:</strong> ${(stats.size / 1024).toFixed(2)} KB</p>
          <p><strong>Last Modified:</strong> ${stats.mtime.toISOString()}</p>
          <p><strong>Showing:</strong> Last ${lines.length} lines</p>
        </div>
        
        <pre>${lines.map(line => {
          try {
            // Try to parse as JSON and pretty print
            const data = JSON.parse(line);
            return JSON.stringify(data, null, 2);
          } catch (e) {
            // If not JSON, return as is
            return line;
          }
        }).join('\n')}</pre>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    logger.error(`Error reading log file ${file}: ${error.message}`);
    res.status(500).send('Error reading log file');
  }
});

module.exports = router;