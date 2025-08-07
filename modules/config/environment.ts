/**
 * Environment configuration for the application
 * Controls environment-specific settings like API endpoints
 */

// Environment types
export enum Environment {
  DEV = 'DEV',
  PRD = 'PRD',
  ANDROID_DEVICE = 'ANDROID_DEVICE',
  MOBILE = 'MOBILE',
}

// Get current environment from environment variable or default to DEV
export const getCurrentEnvironment = (): Environment => {
  try {
    // Check for mobile platforms (iOS or Android)
    const { Platform } = require('react-native');
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Use MOBILE environment for all mobile devices
      return Environment.MOBILE;
    }
    
    // Try to get from environment variables (for Node.js environments)
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_ENV) {
      const env = process.env.REACT_APP_ENV.toUpperCase();
      if (env === Environment.PRD) {
        return Environment.PRD;
      }
    }
    
    // Try to get from Expo Constants (for Expo/React Native)
    try {
      const Constants = require('expo-constants');
      if (Constants.expoConfig?.extra?.env === Environment.PRD) {
        return Environment.PRD;
      }
    } catch (e) {
      // Expo Constants not available, continue
    }
    
    // Default to DEV if not specified or if any error occurs
    return Environment.DEV;
  } catch (error) {
    console.warn('Error determining environment, defaulting to DEV:', error);
    return Environment.DEV;
  }
};

// Environment-specific configuration
interface EnvironmentConfig {
  apiBaseUrl: string;
  apiProxyUrl: string;
  cheeriosApiUrl: string;
  cloudHubApiUrl: string;
  useProxy: boolean;
  jwtSecret: string;
}

// Configuration for each environment
const environmentConfigs: Record<Environment, EnvironmentConfig> = {
  [Environment.DEV]: {
    apiBaseUrl: 'https://dev-api.example.com',
    apiProxyUrl: 'http://localhost:3000', // For web development
    cheeriosApiUrl: 'http://192.168.68.129:8001', // Local Cheerios API via proxy
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // CloudHub API via proxy
    useProxy: true, // Use proxy for web browser testing
    jwtSecret: 'dev-secret-key',
  },
  // Special environment for Android device testing
  [Environment.ANDROID_DEVICE]: {
    apiBaseUrl: 'https://dev-api.example.com',
    apiProxyUrl: 'http://192.168.68.129:3000', // Your computer's IP address
    cheeriosApiUrl: 'http://192.168.60.42:8001', // Local Cheerios API via proxy
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // CloudHub API via proxy
    useProxy: true, // Use proxy for Android device testing
    jwtSecret: 'dev-secret-key',
  },
  // Mobile environment for direct API access
  [Environment.MOBILE]: {
    apiBaseUrl: 'https://dev-api.example.com',
    apiProxyUrl: '',
    cheeriosApiUrl: 'https://ntnservices.dev.buzztime.com',
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
    useProxy: false, // Skip proxy for mobile devices
    jwtSecret: 'dev-secret-key',
  },
  [Environment.PRD]: {
    apiBaseUrl: 'https://api.example.com',
    apiProxyUrl: 'https://proxy.example.com',
    cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // Production Cheerios API
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // Production CloudHub API
    useProxy: false, // No proxy in production
    jwtSecret: 'production-secret-key',
  },
};

// Get the configuration for the current environment
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const currentEnv = getCurrentEnvironment();
  return environmentConfigs[currentEnv];
};

// Export the current environment and its configuration
export const currentEnvironment = getCurrentEnvironment();
export const config = getEnvironmentConfig();
