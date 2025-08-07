// environment.js - Configuration for different environments

// Import Platform safely - this is crucial for React Native
let Platform;
let isRunningOnMobile = false;

// Safely determine if running on a mobile device
try {
  // Use dynamic import to avoid issues with SSR or web environments
  Platform = require('react-native').Platform;
  isRunningOnMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  console.log(`[Environment] Detected platform: ${Platform.OS}, isMobile: ${isRunningOnMobile}`);
} catch (e) {
  console.log('[Environment] Error detecting platform, assuming web:', e.message);
  isRunningOnMobile = false;
}

// Get the environment from an environment variable or default to 'dev'
let ENV = 'dev';
try {
  ENV = process.env.EXPO_PUBLIC_ENV || 'dev';
} catch (e) {
  console.log('[Environment] Error accessing process.env, using default env:', e.message);
}

// Always use 'mobile' environment for mobile devices to ensure direct API calls
if (isRunningOnMobile) {
  console.log('[Environment] Running on mobile device, using mobile environment');
  ENV = 'mobile';
} else {
  console.log(`[Environment] Running in ${ENV} environment`);
}

// Configuration for different environments
const environments = {
  dev: {
    apiUrl: 'https://dev-api.example.com',
    proxyUrl: 'http://192.168.68.126:3000', // Android emulator uses 10.0.2.2 to access host machine
    cheeriosApiUrl: 'http://192.168.68.126:8001', // Local Cheerios API via proxy
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // CloudHub API via proxy
    useProxy: true, // Use proxy for web browser testing
  },
  prod: {
    apiUrl: 'https://api.example.com',
    proxyUrl: 'https://api-proxy.example.com',
    cheeriosApiUrl: 'https://ntnservices.dev.buzztime.com',
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
    useProxy: false, // No proxy in production
  },
  // For physical device testing with proxy - replace YOUR_LOCAL_IP with your computer's IP address on your network
  device: {
    apiUrl: 'https://dev-api.example.com',
    proxyUrl: 'http://192.168.60.42:3000', // Your computer's IP address
    cheeriosApiUrl: 'http://192.168.60.42:8001', // Local Cheerios API via proxy
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // CloudHub API via proxy
    useProxy: true, // Use proxy for device testing
  },
  // For mobile devices making direct API calls
  mobile: {
    apiUrl: 'https://dev-api.example.com',
    proxyUrl: '', // Not used when useProxy is false
    cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // Direct access to Cheerios API
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // Direct access to CloudHub API
    useProxy: false, // Skip proxy for mobile devices
  }
};

// Get the configuration for the current environment with fallback to dev
let currentConfig;
try {
  currentConfig = environments[ENV];
  if (!currentConfig) {
    console.warn(`[Environment] Environment '${ENV}' not found, using 'dev' instead`);
    currentConfig = environments.dev;
  }
} catch (error) {
  console.error(`[Environment] Error loading environment config:`, error);
  currentConfig = environments.dev;
}

// Ensure critical API URLs are set
if (!currentConfig.cheeriosApiUrl) {
  console.warn('[Environment] cheeriosApiUrl is not set, using default cloud URL');
  currentConfig.cheeriosApiUrl = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
}

if (!currentConfig.cloudHubApiUrl) {
  console.warn('[Environment] cloudHubApiUrl is not set, using default cloud URL');
  currentConfig.cloudHubApiUrl = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
}

// Log the active configuration
try {
  console.log('[Environment] Active configuration:', {
    env: ENV,
    apiUrl: currentConfig.apiUrl,
    proxyUrl: currentConfig.proxyUrl,
    cheeriosApiUrl: currentConfig.cheeriosApiUrl,
    cloudHubApiUrl: currentConfig.cloudHubApiUrl,
    useProxy: currentConfig.useProxy
  });
} catch (e) {
  console.error('[Environment] Error logging configuration:', e.message);
}

// Export functions to get environment config
export function getEnvironmentConfig() {
  return currentConfig;
}

// Export the configuration for the current environment
export default currentConfig;
