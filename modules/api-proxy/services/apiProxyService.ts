import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import storageService from './storageService';
import { generateJWT, addCloudHubAuthHeaders } from '../../auth/utils/jwtUtils';

// Safely import environment configuration
let config: any = {
  apiProxyUrl: '',
  cheeriosApiUrl: 'https://ntnservices.dev.buzztime.com',
  cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
  useProxy: false,
  jwtSecret: 'dev-secret-key'
};

let currentEnvironment = 'MOBILE';

// Try to load the actual config, but use defaults if it fails
try {
  const envModule = require('../../config/environment');
  config = envModule.config || config;
  currentEnvironment = envModule.currentEnvironment || 'MOBILE';
  console.log('[API Client] Successfully loaded environment config');
} catch (error) {
  console.error('[API Client] Error loading environment config, using defaults:', error);
}

// Get API URLs from environment configuration with fallbacks
const API_PROXY_URL = config.apiProxyUrl || '';
const CHEERIOS_API_URL = config.cheeriosApiUrl || 'https://ntnservices.dev.buzztime.com';
const CLOUDHUB_API_URL = config.cloudHubApiUrl || 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
const USE_PROXY = config.useProxy === true ? true : false;

// Log current environment for debugging
try {
  console.log(`[API Client] Running in ${currentEnvironment} environment`);
  console.log(`[API Client] Cheerios API URL: ${CHEERIOS_API_URL}`);
  console.log(`[API Client] API Proxy URL: ${API_PROXY_URL}`);
  console.log(`[API Client] CloudHub API URL: ${CLOUDHUB_API_URL}`);
  console.log(`[API Client] Using proxy: ${USE_PROXY}`);
  console.log(`[API Client] Platform: ${Platform.OS}`);
} catch (error) {
  console.error('[API Client] Error logging environment:', error);
}

/**
 * API Proxy Service
 * 
 * This service handles all API calls and routes them through a proxy when running in web mode
 * to avoid CORS issues. When running on mobile, it makes direct API calls.
 */
class ApiProxyService {
  private static instance: ApiProxyService;
  private authToken: string | null = null;

  private constructor() {}

  public static getInstance(): ApiProxyService {
    if (!ApiProxyService.instance) {
      ApiProxyService.instance = new ApiProxyService();
    }
    return ApiProxyService.instance;
  }

  /**
   * Generate JWT token for authentication
   * Simplified for mobile to prevent crashes
   */
  private async generateJWT(endpoint: string, method: string): Promise<string> {
    try {
      // For web, we'll use the proxy server to generate the JWT
      if (Platform.OS === 'web') {
        console.log('[API Client] Using web JWT generation');
        // For web clients, we need to pass the endpoint and method to the proxy
        // The proxy will generate the JWT with the proper auth token
        return 'web-client';
      }
      
      // For native platforms, use the shared JWT utilities
      console.log('[API Client] Generating JWT for mobile device');
      
      // Get the auth token from storage
      const authToken = await this.getAuthToken();
      
      // Import the shared JWT utilities
      const { generateJWT } = require('../../auth/utils/shared-jwt');
      
      // Generate JWT with the auth token
      return await generateJWT(authToken);
    } catch (error) {
      console.error('[API Client] JWT generation error:', error);
      // Return a fallback JWT to prevent crashes
      return 'mobile-client-fallback-jwt';
    }
  }
  
  /**
   * Base64 encode a string in a way that works in all environments
   * Simplified to avoid crashes on mobile
   */
  private base64Encode(str: string): string {
    try {
      // For web, use btoa
      if (Platform.OS === 'web') {
        return btoa(str);
      }
      
      // For mobile, return a simplified string to avoid encoding issues
      // This is temporary to prevent crashes during debugging
      return str;
    } catch (error) {
      console.error('[API Client] Base64 encoding error:', error);
      return str;
    }
  }

  /**
   * Get the appropriate base URL based on environment configuration
   */
  private getBaseUrl(endpoint: string): string {
    try {
      console.log(`[API Client] Getting base URL for endpoint: ${endpoint}`);
      console.log(`[API Client] USE_PROXY: ${USE_PROXY}, Platform: ${Platform.OS}`);
      
      // Check if we should use the proxy based on environment config
      if (USE_PROXY) {
        console.log(`[API Client] Using proxy URL: ${API_PROXY_URL}`);
        return API_PROXY_URL || 'http://localhost:3000'; // Fallback if proxy URL is empty
      }
      
      // Direct API calls for mobile platforms
      // Determine which API to use based on the endpoint
      if (endpoint.startsWith('/cloudhub/')) {
        console.log(`[API Client] Using CloudHub API URL: ${CLOUDHUB_API_URL}`);
        return CLOUDHUB_API_URL || 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
      } else if (endpoint.startsWith('/cheerios/')) {
        console.log(`[API Client] Using Cheerios API URL: ${CHEERIOS_API_URL}`);
        return CHEERIOS_API_URL || 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
      }
      
      // Default to Cheerios API URL for other endpoints
      console.log(`[API Client] Using Cheerios API URL for other endpoints: ${CHEERIOS_API_URL}`);
      return CHEERIOS_API_URL || 'https://ntnservices.dev.buzztime.com';
    } catch (error) {
      console.error('[API Client] Error getting base URL:', error);
      // Return a fallback URL to prevent crashes
      return 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
    }
  }

  /**
   * Set authentication token
   */
  public async setAuthToken(token: string): Promise<void> {
    console.log('[API Client] Setting auth token');
    if (!token) {
      console.warn('[API Client] Attempted to set empty auth token');
      return;
    }
    
    this.authToken = token;
    try {
      await storageService.setItem('auth_token', token);
      console.log('[API Client] Auth token stored successfully');
    } catch (error) {
      console.error('[API Client] Failed to store auth token:', error);
    }
  }

  /**
   * Get authentication token
   */
  public async getAuthToken(): Promise<string | null> {
    console.log('[API Client] Getting auth token, in-memory token exists:', !!this.authToken);
    
    if (!this.authToken) {
      console.log('[API Client] No in-memory token, checking storage');
      this.authToken = await storageService.getItem('auth_token');
      console.log('[API Client] Token from storage exists:', !!this.authToken);
    } else {
      // Verify the token in storage matches the in-memory token
      // This ensures consistency between memory and storage
      const storedToken = await storageService.getItem('auth_token');
      if (storedToken !== this.authToken) {
        console.log('[API Client] Token mismatch between memory and storage, updating');
        if (storedToken) {
          this.authToken = storedToken;
        } else if (this.authToken) {
          // If we have an in-memory token but nothing in storage, save it
          await storageService.setItem('auth_token', this.authToken);
        }
      }
    }
    
    return this.authToken;
  }

  /**
   * Clear authentication token
   */
  public async clearAuthToken(): Promise<void> {
    console.log('[API Client] Clearing auth token');
    this.authToken = null;
    try {
      await storageService.removeItem('auth_token');
      console.log('[API Client] Auth token removed from storage');
    } catch (error) {
      console.error('[API Client] Failed to remove auth token from storage:', error);
    }
  }

  /**
   * Make a request with the appropriate headers
   */
  private async makeRequest<T>(method: string, endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    console.log(`[API Client] Making ${method} request to endpoint: ${endpoint}`);
    
    // Get the appropriate base URL based on endpoint and environment config
    const baseUrl = this.getBaseUrl(endpoint);
    
    // Modify the endpoint if not using proxy
    try {
      // Get the base URL for the request
      const baseUrl = this.getBaseUrl(endpoint);
      const url = `${baseUrl}${endpoint}`;
      console.log(`[API Client] Full URL: ${url}`);
      
      // Set up headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Only add Accept header for non-CloudHub endpoints
      if (!endpoint.startsWith('/cloudhub/')) {
        headers['Accept'] = 'application/json';
      }
      
      try {
        // Add appropriate authentication headers
        if (USE_PROXY && Platform.OS === 'web') {
          // For web using proxy, add a client type header
          console.log(`[API Client] Using proxy on web, adding x-client-type header`);
          headers['x-client-type'] = 'web-client';
        } else if (endpoint.startsWith('/cloudhub/')) {
          // For direct CloudHub API calls on mobile, use our JWT utility
          console.log(`[API Client] Making direct CloudHub API call, adding authentication headers`);
          const token = await this.getAuthToken();
          // Convert null to undefined to match the function signature
          const tokenValue = token === null ? undefined : token;
          const authHeaders = await addCloudHubAuthHeaders(headers, tokenValue, endpoint, method);
          Object.assign(headers, authHeaders);
        }
        
        // For web clients using proxy, add a header to identify the client type
        // This helps the proxy server handle requests appropriately
        if (Platform.OS === 'web' && USE_PROXY) {
          headers['x-client-type'] = 'web-proxy';
          
          // For web clients, also send the auth token as a header
          // The proxy server will use this to generate the proper JWT
          const authToken = await this.getAuthToken();
          if (authToken) {
            headers['auth-token'] = authToken;
          }
        }
        
        // Generate JWT token for CloudHub API endpoints
        if (baseUrl === CLOUDHUB_API_URL && Platform.OS !== 'web') {
          console.log('[API Client] Generating JWT for CloudHub API');
          try {
            const jwt = await this.generateJWT(endpoint, method);
            headers['Authorization'] = jwt;
            console.log('[API Client] Added JWT to headers');
          } catch (error) {
            console.error('[API Client] Failed to generate JWT:', error);
          }
        }
      } catch (headerError) {
        console.error('[API Client] Error setting up headers:', headerError);
        // Continue with basic headers
      }
      
      console.log(`[API Client] Request headers:`, headers);
      if (data) {
        console.log(`[API Client] Request payload:`, data);
      }
      
      try {
        // Set timeout to prevent hanging requests
        const requestConfig = {
          timeout: 30000, // 30 seconds timeout
          ...config,
          headers: {
            ...headers,
            ...config?.headers,
          }
        };
        
        // Make the request
        const response = await axios<T>({
          method,
          url,
          data,
          ...requestConfig,
        });
        
        console.log(`[API Client] Response status: ${response.status}`);
        console.log(`[API Client] Response data:`, response.data);
        return response;
      } catch (requestError: any) {
        console.error(`[API Client] Request failed:`, requestError.message);
        if (requestError.response) {
          console.error(`[API Client] Error status: ${requestError.response.status}`);
          console.error(`[API Client] Error data:`, requestError.response.data);
        } else if (requestError.request) {
          console.error('[API Client] No response received from server');
        } else {
          console.error('[API Client] Error setting up request:', requestError.message);
        }
        throw requestError;
      }
    } catch (error: any) {
      console.error('[API Client] Critical error in makeRequest:', error);
      // Create a friendly error response to prevent app crashes
      const errorResponse: AxiosResponse<T> = {
        data: {} as T,
        status: 500,
        statusText: 'Internal Error',
        headers: {},
        config: {
          headers: {}
        } as any, // Use 'any' to bypass TypeScript error with AxiosRequestConfig
      };
      return errorResponse;
    }
  }

  /**
   * Make a GET request
   */
  public async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, undefined, config);
  }

  /**
   * Make a POST request
   */
  public async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, data, config);
  }

  /**
   * Make a PUT request
   */
  public async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, data, config);
  }

  /**
   * Make a DELETE request
   */
  public async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, config);
  }
  
  /**
   * Login method
   */
  public async login(email: string, password: string): Promise<any> {
    console.log(`[API Client] Login attempt for user: ${email}`);
    
    // Generate a device ID for web clients or use a platform-specific ID for native
    const deviceId = Platform.OS === 'web' ? 'web-client-' + Date.now() : `${Platform.OS}-${Platform.Version}`;
    
    // Define a type for the expected response
    interface LoginResponse {
      auth_token: string;
      player_id: number;
      display_name: string;
      mobile_display_name: string;
      session_id: string;
      pin: string;
      site_id: number;
      avatar_crc: number;
      player_plus_points: number;
      birth_date: string;
      [key: string]: any; // Allow for other properties
    }
    
    try {
      console.log(`[API Client] Sending login request to /cloudhub/auth/buzztime_login/`);
      const response = await this.post<LoginResponse>('/cloudhub/auth/buzztime_login/', { 
        email, 
        password, 
        device_id: deviceId,
        invite_token: '' // Empty string as default
      });
      
      console.log(`[API Client] Login successful`);
      if (response.data && response.data.auth_token) {
        console.log(`[API Client] Received auth token, storing securely`);
        await this.setAuthToken(response.data.auth_token);
      } else {
        console.warn(`[API Client] Login response missing auth_token`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`[API Client] Login failed: ${error.message}`);
      throw error;
    }
  }
}

export default ApiProxyService.getInstance();
