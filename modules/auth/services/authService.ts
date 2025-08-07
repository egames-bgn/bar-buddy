import apiProxy from '../../api-proxy/services/apiProxyService';
import { SignInRequest, SignUpRequest, AuthResponse, UserProfile } from '../types/authTypes';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const USER_STORAGE_KEY = 'user_profile';
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Authentication Service
 * 
 * Handles user authentication operations like login, registration, and logout
 * Uses the API Proxy service for making API calls
 */
class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Store user data securely
   */
  private async storeUserData(user: UserProfile): Promise<void> {
    this.currentUser = user;
    const userData = JSON.stringify(user);
    
    if (Platform.OS !== 'web') {
      // Use SecureStore for mobile platforms
      await SecureStore.setItemAsync(USER_STORAGE_KEY, userData);
    } else {
      // Use AsyncStorage for web (less secure)
      await AsyncStorage.setItem(USER_STORAGE_KEY, userData);
    }
  }

  /**
   * Get stored user data
   */
  private async getStoredUserData(): Promise<UserProfile | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      let userData: string | null;
      
      if (Platform.OS !== 'web') {
        // Use SecureStore for mobile platforms
        userData = await SecureStore.getItemAsync(USER_STORAGE_KEY);
      } else {
        // Use AsyncStorage for web
        userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      }
      
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error retrieving user data:', error);
    }
    
    return null;
  }

  /**
   * Clear stored user data
   */
  private async clearUserData(): Promise<void> {
    this.currentUser = null;
    
    if (Platform.OS !== 'web') {
      // Use SecureStore for mobile platforms
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    } else {
      // Use AsyncStorage for web
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  /**
   * Sign in user
   */
  public async signIn(credentials: SignInRequest): Promise<AuthResponse> {
    try {
      // Add device_id and invite_token to match the expected format
      const loginRequest = {
        ...credentials,
        device_id: Platform.OS === 'web' ? 'web-client-' + Date.now() : `${Platform.OS}-${Platform.Version}`,
        invite_token: ''
      };
      
      console.log('[AuthService] Sending login request:', { ...loginRequest, password: '********' });
      
      // Using the same endpoint as the Flutter app
      const response = await apiProxy.login(loginRequest.email, loginRequest.password);
      
      console.log('[AuthService] Received login response:', { 
        player_id: response.player_id,
        display_name: response.display_name,
        auth_token_received: !!response.auth_token
      });
      
      // CloudHub API returns auth_token directly in the response
      if (response && response.auth_token) {
        // Store the auth token in the API proxy service
        console.log('[AuthService] Storing auth token');
        await apiProxy.setAuthToken(response.auth_token);
        
        // Create a user profile from the response, preserving ALL fields from the API response
        const user: UserProfile = {
          // Map required UserProfile fields
          id: response.player_id.toString(),
          displayName: response.display_name || response.mobile_display_name,
          email: credentials.email,
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          
          // Store all original response fields as well
          player_id: response.player_id,
          display_name: response.display_name,
          mobile_display_name: response.mobile_display_name,
          session_id: response.session_id,
          pin: response.pin,
          site_id: response.site_id,
          avatar_crc: response.avatar_crc,
          player_plus_points: response.player_plus_points,
          birth_date: response.birth_date,
          auth_token: response.auth_token // Store token in user profile too for redundancy
        };
        
        // Store user data
        console.log('[AuthService] Storing complete user data');
        await this.storeUserData(user);
        
        return {
          success: true,
          data: {
            user,
            authToken: response.auth_token
          }
        };
      }
      
      console.warn('[AuthService] Login response missing auth_token');
      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error: any) {
      console.error('[AuthService] Login error:', error);
      return {
        success: false,
        error: error.response?.data || error.message || 'An error occurred during login'
      };
    }
  }

  /**
   * Register new user
   */
  public async signUp(userData: SignUpRequest): Promise<AuthResponse> {
    try {
      // Using the same endpoint as the Flutter app
      const response = await apiProxy.post<AuthResponse>('/cloudhub/auth/buzztime_registration/', userData);
      
      if (response.data.success && response.data.data?.authToken) {
        // Store the auth token in the API proxy service
        await apiProxy.setAuthToken(response.data.data.authToken);
        
        // Store user data if available
        if (response.data.data.user) {
          await this.storeUserData(response.data.data.user);
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'An error occurred during registration'
      };
    }
  }

  /**
   * Sign out user
   */
  public async signOut(): Promise<void> {
    try {
      // Clear auth token from API proxy
      await apiProxy.clearAuthToken();
      
      // Clear user data
      await this.clearUserData();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    console.log('[AuthService] Checking if user is authenticated');
    const token = await apiProxy.getAuthToken();
    console.log('[AuthService] Auth token exists:', !!token);
    return !!token;
  }

  /**
   * Get current user profile
   */
  public async getCurrentUser(): Promise<UserProfile | null> {
    return await this.getStoredUserData();
  }

  /**
   * Update user profile
   */
  public async updateProfile(profileData: Partial<UserProfile>): Promise<AuthResponse> {
    try {
      const currentUser = await this.getStoredUserData();
      
      if (!currentUser) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }
      
      // Update user profile endpoint
      const response = await apiProxy.put<AuthResponse>('/cloudhub/auth/update_profile/', profileData);
      
      if (response.data.success && response.data.data?.user) {
        // Update stored user data
        await this.storeUserData({
          ...currentUser,
          ...response.data.data.user
        });
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'An error occurred while updating profile'
      };
    }
  }

  /**
   * Request password reset
   */
  public async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await apiProxy.post<AuthResponse>('/cloudhub/auth/forgot_password/', { email });
      return response.data;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'An error occurred while requesting password reset'
      };
    }
  }
}

export default AuthService.getInstance();
