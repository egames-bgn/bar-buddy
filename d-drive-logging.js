/**
 * bar-buddy D Drive Logging Configuration
 * This module ensures all logs are written to D drive instead of C drive
 */

const path = require('path');
const fs = require('fs');

// Define log directories
const LOG_BASE_DIR = 'D:\\Logs\\bar-buddy';
const APP_LOG_DIR = path.join(LOG_BASE_DIR, 'app');
const API_LOG_DIR = path.join(LOG_BASE_DIR, 'api');
const DEBUG_LOG_DIR = path.join(LOG_BASE_DIR, 'debug');

// Create log directories if they don't exist
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created log directory: ${dir}`);
  }
};

// Create all required directories
ensureDirExists(LOG_BASE_DIR);
ensureDirExists(APP_LOG_DIR);
ensureDirExists(API_LOG_DIR);
ensureDirExists(DEBUG_LOG_DIR);

// Export log paths for use in application
module.exports = {
  // App logs
  appLogPath: path.join(APP_LOG_DIR, 'app.log'),
  errorLogPath: path.join(APP_LOG_DIR, 'error.log'),
  
  // API logs
  apiRequestLogPath: path.join(API_LOG_DIR, 'requests.log'),
  apiResponseLogPath: path.join(API_LOG_DIR, 'responses.log'),
  
  // Debug logs
  debugLogPath: path.join(DEBUG_LOG_DIR, 'debug.log'),
  
  // Helper method to get a timestamped log file path
  getTimestampedLogPath: (prefix) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    return path.join(LOG_BASE_DIR, `${prefix}_${timestamp}.log`);
  },
  
  // Log directory paths
  LOG_BASE_DIR,
  APP_LOG_DIR,
  API_LOG_DIR,
  DEBUG_LOG_DIR
};

console.log('bar-buddy logging configured to use D drive');
