/**
 * Environment configuration for the application (JavaScript version)
 * This file is used by the proxy server which runs in Node.js
 */

// Environment types
const Environment = {
  DEV: 'DEV',
  PRD: 'PRD'
};

// Get current environment from environment variable or default to DEV
const getCurrentEnvironment = () => {
  try {
    // Try to get from environment variables
    if (process.env && process.env.REACT_APP_ENV) {
      const env = process.env.REACT_APP_ENV.toUpperCase();
      if (env === Environment.PRD) {
        return Environment.PRD;
      }
    }
    
    // Default to DEV if not specified or if any error occurs
    return Environment.DEV;
  } catch (error) {
    console.warn('Error determining environment, defaulting to DEV:', error);
    return Environment.DEV;
  }
};

// Environment-specific configuration
const environmentConfigs = {
  [Environment.DEV]: {
    apiBaseUrl: 'https://ntnservices.dev.buzztime.com', // Cheerios DEV API URL
    apiProxyUrl: 'http://localhost:3000',
    jwtSecret: 'dev-secret-key',
  },
  [Environment.PRD]: {
    apiBaseUrl: 'https://api.example.com',
    apiProxyUrl: 'https://proxy.example.com',
    jwtSecret: 'production-secret-key',
  },
};

// Get the configuration for the current environment
const getEnvironmentConfig = () => {
  const currentEnv = getCurrentEnvironment();
  return environmentConfigs[currentEnv];
};

// Export the current environment and its configuration
const currentEnvironment = getCurrentEnvironment();
const config = getEnvironmentConfig();

module.exports = {
  Environment,
  currentEnvironment,
  config
};
