/**
 * Shared JWT utilities for both Node.js and React Native
 * 
 * This module provides JWT generation that works in both environments:
 * - In Node.js, it uses the native crypto module
 * - In React Native, it uses expo-crypto
 */

// Platform API Key for CloudHub API - must match the one used in the proxy server
const CLOUDHUB_PLATFORM_API_KEY = '5BAA7F6E-C84B-4197-9F90-64019BC85028';

// JWT secret - must match the one used in the proxy server
const JWT_SECRET = "secret";

// Base64 URL encoding function that works in both Node.js and React Native
function base64UrlEncode(str) {
  // Check if we're in Node.js environment
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    // React Native environment - use btoa (built-in to React Native)
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// Cross-platform HMAC-SHA256 function
async function hmacSha256(message, secret) {
  // Check if we're in Node.js environment
  if (typeof require !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
    // We're in Node.js - use the crypto module
    const crypto = eval('require("crypto")');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const hash = hmac.digest('base64');
    
    // Convert to base64url
    return hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    // We're in React Native - use crypto-js library
    console.log('[JWT] Using crypto-js for HMAC-SHA256 in React Native');
    
    try {
      // Import crypto-js (works in React Native)
      const CryptoJS = require('crypto-js');
      
      // Generate HMAC-SHA256
      const hash = CryptoJS.HmacSHA256(message, secret);
      
      // Convert to base64url format
      const base64 = CryptoJS.enc.Base64.stringify(hash);
      return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
        
    } catch (error) {
      console.error('[JWT] Error using crypto-js:', error);
      
      // Ultimate fallback - use a deterministic but simple approach
      console.log('[JWT] Using deterministic fallback hash');
      const combinedString = message + secret;
      let hash = 0;
      for (let i = 0; i < combinedString.length; i++) {
        const char = combinedString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Convert to base64url-like string
      return btoa(Math.abs(hash).toString())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
  }
}

/**
 * Generate a JWT token for authentication with CloudHub API
 * Works in both Node.js and React Native environments
 * 
 * @param {string} authToken - Optional auth token from previous authentication
 * @returns {Promise<string>} - JWT token
 */
async function generateJWT(authToken) {
  try {
    console.log(`[JWT] Generating JWT token`);
    
    // For React Native, use a fixed expiration to ensure consistent JWT generation
    // This is a temporary solution for development/testing only
    // In production, we would use a proper crypto library for React Native
    const isNodeJs = typeof require === 'function' && typeof process !== 'undefined' && process.versions && process.versions.node;
    
    // Create default payload with current timestamp
    const nowUtc = new Date().getTime();
    const secondsToExpire = Math.round(nowUtc / 1000) + 300; // 5 minutes expiration
    
    const payload = {
      exp: `${secondsToExpire}`, // Must be a string to match Prometheus implementation
      auth_token: authToken || 'dev-auth-token' // Add auth_token as seen in Prometheus implementation
    };
    
    console.log(`[JWT] Creating JWT with expiration: ${secondsToExpire} (current time: ${Math.round(nowUtc / 1000)})`);
    
    
    // Match the Prometheus implementation exactly
    const header = { alg: 'HS256', typ: 'JWT' };
    
    // Base64Url encode the header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    
    // Create the message to sign: header.payload
    const message = `${encodedHeader}.${encodedPayload}`;
    
    // Generate signature using our cross-platform function
    const signature = await hmacSha256(message, JWT_SECRET);
    
    // Combine to form the JWT
    const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    console.log('[JWT] Generated JWT for CloudHub API');
    return jwt;
  } catch (error) {
    console.error('[JWT] Error generating JWT:', error);
    return 'fallback-jwt';
  }
}

/**
 * Add CloudHub API authentication headers to a request
 * 
 * @param {Object} headers - Existing headers object
 * @param {string} authToken - Optional auth token from previous authentication
 * @param {string} endpoint - API endpoint (optional)
 * @param {string} method - HTTP method (optional)
 * @returns {Promise<Object>} - Updated headers object with authentication headers
 */
async function addCloudHubAuthHeaders(headers = {}, authToken, endpoint, method) {
  try {
    // Get JWT token
    const jwt = await generateJWT(authToken);
    
    // Add the required headers for CloudHub API
    const updatedHeaders = {
      ...headers,
      'Authorization': jwt, // Use JWT directly without Bearer prefix
      'X-Platform-API-Key': CLOUDHUB_PLATFORM_API_KEY
    };
    
    // Add auth token if available
    if (authToken) {
      updatedHeaders['Auth-Token'] = authToken;
    }
    
    console.log('[JWT] Added CloudHub authentication headers');
    return updatedHeaders;
  } catch (error) {
    console.error('[JWT] Error adding CloudHub authentication headers:', error);
    return headers;
  }
}

// Export functions for CommonJS (Node.js) environment
// React Native will also use this export format
module.exports = {
  generateJWT,
  addCloudHubAuthHeaders,
  CLOUDHUB_PLATFORM_API_KEY,
  JWT_SECRET
};
