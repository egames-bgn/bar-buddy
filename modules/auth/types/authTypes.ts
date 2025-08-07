/**
 * Authentication Types
 * These types are based on the Flutter app's authentication models
 */

export interface SignInRequest {
  email: string;
  password: string;
  deviceId?: string;
  inviteToken?: string;
}

export interface SignUpRequest {
  name?: string;
  displayName?: string;
  email: string;
  password: string;
  dob?: string;
  platformApiKey?: string;
  deviceId?: string;
  dobUserFormat?: string;
  inviteToken?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    authToken?: string;
    user?: UserProfile;
    [key: string]: any;
  };
  error?: string;
}

export interface UserProfile {
  // Base profile fields
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  dob?: string;
  createdAt?: string;
  updatedAt?: string;
  avatarUrl?: string | null;
  
  // API response fields
  player_id?: number;
  display_name?: string;
  mobile_display_name?: string;
  session_id?: string;
  pin?: string;
  site_id?: number;
  avatar_crc?: number;
  player_plus_points?: number;
  birth_date?: string;
  auth_token?: string;
  
  // Allow for other properties
  [key: string]: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;
}

export enum AuthActionTypes {
  LOGIN_REQUEST = 'LOGIN_REQUEST',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  REGISTER_REQUEST = 'REGISTER_REQUEST',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  REGISTER_FAILURE = 'REGISTER_FAILURE',
  LOGOUT = 'LOGOUT',
  CLEAR_ERROR = 'CLEAR_ERROR',
}

export interface AuthAction {
  type: AuthActionTypes;
  payload?: any;
}
