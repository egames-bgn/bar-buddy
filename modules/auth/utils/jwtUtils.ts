/**
 * JWT Utilities for direct API authentication
 * 
 * This module provides authentication utilities for direct API access on mobile devices.
 * It uses the shared JWT implementation that works in both Node.js and React Native environments.
 */
import { Platform } from 'react-native';

// Import shared JWT utilities
// Using require instead of import for compatibility with both environments
// TypeScript will still check types based on the type definitions below
const sharedJwt = require('./shared-jwt');

// Export the platform API key from the shared module
export const CLOUDHUB_PLATFORM_API_KEY = sharedJwt.CLOUDHUB_PLATFORM_API_KEY;

/**
 * Generate a JWT token for authentication with CloudHub API
 * This is a TypeScript wrapper around the shared implementation
 */
export async function generateJWT(authToken?: string): Promise<string> {
  return sharedJwt.generateJWT(authToken);
}

/**
 * Add CloudHub API authentication headers to a request
 * 
 * @param headers - Existing headers object
 * @param authToken - Optional auth token from previous authentication
 * @param endpoint - API endpoint being called
 * @param method - HTTP method being used
 * @returns Updated headers object with authentication headers
 */
export async function addCloudHubAuthHeaders(
  headers: Record<string, string> = {},
  authToken?: string,
  endpoint?: string,
  method?: string
): Promise<Record<string, string>> {
  // Call the shared implementation and cast the result to the correct type
  return sharedJwt.addCloudHubAuthHeaders(headers, authToken) as Promise<Record<string, string>>;
}
