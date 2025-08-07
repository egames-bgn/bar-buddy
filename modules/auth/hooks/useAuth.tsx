import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, AuthAction, AuthActionTypes, UserProfile } from '../types/authTypes';
import authService from '../services/authService';
import apiProxy from '../../api-proxy/services/apiProxyService';

// Initial auth state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
};

// Auth context
const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    name?: string;
    displayName?: string;
    dob?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
}>({
  state: initialState,
  dispatch: () => null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
});

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_REQUEST:
    case AuthActionTypes.REGISTER_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AuthActionTypes.LOGIN_SUCCESS:
    case AuthActionTypes.REGISTER_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload,
        error: null,
      };
    case AuthActionTypes.LOGIN_FAILURE:
    case AuthActionTypes.REGISTER_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case AuthActionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount
  useEffect(() => {
    console.log('[useAuth] Initializing auth state check');
    let isMounted = true;
    
    // Create a global auth state reference to ensure single source of truth
    if (typeof window !== 'undefined' && !(window as any).__authStateInitialized) {
      (window as any).__authStateInitialized = true;
      console.log('[useAuth] Initializing global auth state reference');
      
      // Add event listener for storage changes to sync auth state across tabs
      // Only add this listener in web environments, not in React Native
      if (typeof document !== 'undefined') {
        console.log('[useAuth] Adding storage event listener (web only)');
        window.addEventListener('storage', (event) => {
          if (event.key === 'auth_token' || event.key?.includes('user_profile')) {
            console.log('[useAuth] Storage event detected for auth data, syncing state');
            checkAuth();
          }
        });
      } else {
        console.log('[useAuth] Skipping storage event listener (React Native environment)');
      }
    }
    
    const checkAuth = async () => {
      try {
        console.log('[useAuth] Checking if user is authenticated');
        const isAuthenticated = await authService.isAuthenticated();
        console.log('[useAuth] Authentication check result:', isAuthenticated);
        
        // Don't update state if component unmounted
        if (!isMounted) return;
        
        if (isAuthenticated) {
          console.log('[useAuth] User is authenticated, getting user profile');
          const user = await authService.getCurrentUser();
          console.log('[useAuth] Got user profile:', { 
            userId: user?.id, 
            playerId: user?.player_id,
            displayName: user?.display_name || user?.mobile_display_name,
            hasProfile: !!user 
          });
          
          // Don't update state if component unmounted
          if (!isMounted) return;
          
          if (user) {
            console.log('[useAuth] User profile found, updating auth state');
            
            // Store user in global reference to ensure single source of truth
            if (typeof window !== 'undefined') {
              (window as any).__currentUser = user;
              
              // Also store in sessionStorage for better persistence
              try {
                sessionStorage.setItem('auth_user', JSON.stringify(user));
                console.log('[useAuth] Stored user in sessionStorage during auth check');
              } catch (e) {
                console.error('[useAuth] Failed to store user in sessionStorage:', e);
              }
            }
            
            dispatch({
              type: AuthActionTypes.LOGIN_SUCCESS,
              payload: user,
            });
          } else {
            // We have a token but no user profile found, this is an inconsistent state
            // Try to recover by getting the token again and checking if it's valid
            console.warn('[useAuth] Token exists but no user profile found, attempting recovery');
            
            // First try to recover from sessionStorage
            let recoveredUser = null;
            if (typeof window !== 'undefined') {
              try {
                const storedUser = sessionStorage.getItem('auth_user');
                if (storedUser) {
                  recoveredUser = JSON.parse(storedUser);
                  console.log('[useAuth] Recovered user from sessionStorage:', {
                    userId: recoveredUser?.id,
                    hasProfile: !!recoveredUser
                  });
                }
              } catch (e) {
                console.error('[useAuth] Failed to recover user from sessionStorage:', e);
              }
            }
            
            // If we recovered the user from sessionStorage, use it
            if (recoveredUser) {
              // Store recovered user in global reference
              if (typeof window !== 'undefined') {
                (window as any).__currentUser = recoveredUser;
              }
              
              dispatch({
                type: AuthActionTypes.LOGIN_SUCCESS,
                payload: recoveredUser,
              });
              return;
            }
            
            // Otherwise try to recover using the token
            const token = await apiProxy.getAuthToken();
            if (token) {
              console.log('[useAuth] Token exists, creating minimal user profile');
              // Create a minimal user profile to prevent logout
              const minimalUser: UserProfile = {
                id: 'recovering',
                email: 'recovering@user.com',
                displayName: 'Recovering User',
                createdAt: new Date().toISOString(),
                auth_token: token
              };
              
              // Store minimal user in global reference
              if (typeof window !== 'undefined') {
                (window as any).__currentUser = minimalUser;
              }
              
              dispatch({
                type: AuthActionTypes.LOGIN_SUCCESS,
                payload: minimalUser,
              });
            } else {
              // Try to recover token from sessionStorage
              let recoveredToken = null;
              if (typeof window !== 'undefined') {
                try {
                  recoveredToken = sessionStorage.getItem('auth_token_backup');
                  if (recoveredToken) {
                    console.log('[useAuth] Recovered token from sessionStorage');
                    // Set the recovered token
                    await apiProxy.setAuthToken(recoveredToken);
                    
                    // Create a minimal user profile
                    const minimalUser: UserProfile = {
                      id: 'recovered',
                      email: 'recovered@user.com',
                      displayName: 'Recovered User',
                      createdAt: new Date().toISOString(),
                      auth_token: recoveredToken
                    };
                    
                    // Store minimal user in global reference
                    (window as any).__currentUser = minimalUser;
                    
                    dispatch({
                      type: AuthActionTypes.LOGIN_SUCCESS,
                      payload: minimalUser,
                    });
                    return;
                  }
                } catch (e) {
                  console.error('[useAuth] Failed to recover token from sessionStorage:', e);
                }
              }
              
              console.log('[useAuth] No token found during recovery, dispatching logout');
              
              // Clear global user reference
              if (typeof window !== 'undefined') {
                (window as any).__currentUser = null;
              }
              
              dispatch({ type: AuthActionTypes.LOGOUT });
            }
          }
        } else {
          // Try to recover from sessionStorage before logging out
          let recoveredUser = null;
          let recoveredToken = null;
          
          if (typeof window !== 'undefined') {
            try {
              recoveredUser = sessionStorage.getItem('auth_user');
              recoveredToken = sessionStorage.getItem('auth_token_backup');
              
              if (recoveredUser && recoveredToken) {
                console.log('[useAuth] Recovered auth data from sessionStorage');
                
                // Set the recovered token
                await apiProxy.setAuthToken(recoveredToken);
                
                // Parse and use the recovered user
                const parsedUser = JSON.parse(recoveredUser);
                
                // Store in global reference
                (window as any).__currentUser = parsedUser;
                
                dispatch({
                  type: AuthActionTypes.LOGIN_SUCCESS,
                  payload: parsedUser,
                });
                return;
              }
            } catch (e) {
              console.error('[useAuth] Failed to recover auth data from sessionStorage:', e);
            }
          }
          
          console.log('[useAuth] User is not authenticated, dispatching logout');
          
          // Clear global user reference
          if (typeof window !== 'undefined') {
            (window as any).__currentUser = null;
          }
          
          dispatch({ type: AuthActionTypes.LOGOUT });
        }
      } catch (error) {
        console.error('[useAuth] Error checking authentication:', error);
        // Don't update state if component unmounted
        if (!isMounted) return;
        
        // Clear global user reference
        if (typeof window !== 'undefined') {
          (window as any).__currentUser = null;
        }
        
        dispatch({ type: AuthActionTypes.LOGOUT });
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Login function with improved state synchronization
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('[useAuth] Login process started');
    dispatch({ type: AuthActionTypes.LOGIN_REQUEST });
    
    try {
      const response = await authService.signIn({ email, password });
      console.log('[useAuth] Sign in response:', { 
        success: response.success, 
        hasUser: !!response.data?.user,
        hasToken: !!response.data?.authToken,
        error: response.error
      });
      
      if (response.success && response.data?.user) {
        console.log('[useAuth] Login successful, updating auth state');
        
        // Store user in global reference to ensure single source of truth
        if (typeof window !== 'undefined') {
          console.log('[useAuth] Storing user in global reference:', {
            id: response.data.user.id,
            playerId: response.data.user.player_id,
            displayName: response.data.user.display_name || response.data.user.mobile_display_name
          });
          (window as any).__currentUser = response.data.user;
          
          // Also store in sessionStorage for better persistence
          try {
            sessionStorage.setItem('auth_user', JSON.stringify(response.data.user));
            console.log('[useAuth] Stored user in sessionStorage');
          } catch (e) {
            console.error('[useAuth] Failed to store user in sessionStorage:', e);
          }
        }
        
        // Ensure token is properly stored before updating state
        if (response.data.authToken) {
          // Store token in sessionStorage for better persistence
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('auth_token_backup', response.data.authToken);
              console.log('[useAuth] Stored token backup in sessionStorage');
            } catch (e) {
              console.error('[useAuth] Failed to store token in sessionStorage:', e);
            }
          }
          
          // Small delay to ensure token is properly stored
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Update auth state with user data - this will trigger navigation
        dispatch({
          type: AuthActionTypes.LOGIN_SUCCESS,
          payload: response.data.user,
        });
        
        console.log('[useAuth] Auth state updated with user profile');
        
        // We'll use a global flag to coordinate navigation
        // This prevents race conditions between different components trying to navigate
        (window as any).__isNavigatingToTabs = true;
        
        // Import router dynamically to avoid circular dependencies
        const { router } = require('expo-router');
        console.log('[useAuth] Forcing navigation to tabs after login');
        
        // Use a longer timeout to ensure state is fully propagated
        setTimeout(() => {
          if ((window as any).__isNavigatingToTabs) {
            console.log('[useAuth] Executing delayed navigation to tabs');
            router.navigate('/(tabs)');
            
            // Clear the navigation flag after a delay
            setTimeout(() => {
              (window as any).__isNavigatingToTabs = false;
            }, 1000);
          }
        }, 500);
        
        return true;
      } else {
        console.warn('[useAuth] Login failed:', response.error);
        dispatch({
          type: AuthActionTypes.LOGIN_FAILURE,
          payload: response.error || 'Login failed',
        });
        return false;
      }
    } catch (error: any) {
      console.error('[useAuth] Login error:', error);
      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: error.message || 'Login failed',
      });
      return false;
    }
  };

  // Register function
  const register = async (userData: {
    email: string;
    password: string;
    name?: string;
    displayName?: string;
    dob?: string;
  }): Promise<boolean> => {
    dispatch({ type: AuthActionTypes.REGISTER_REQUEST });
    
    try {
      const response = await authService.signUp(userData);
      
      if (response.success && response.data?.user) {
        dispatch({
          type: AuthActionTypes.REGISTER_SUCCESS,
          payload: response.data.user,
        });
        return true;
      } else {
        dispatch({
          type: AuthActionTypes.REGISTER_FAILURE,
          payload: response.error || 'Registration failed',
        });
        return false;
      }
    } catch (error: any) {
      dispatch({
        type: AuthActionTypes.REGISTER_FAILURE,
        payload: error.message || 'Registration failed',
      });
      return false;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    console.log('[useAuth] Logging out user');
    await authService.signOut();
    
    // Clear global user reference
    if (typeof window !== 'undefined') {
      console.log('[useAuth] Clearing global user reference');
      (window as any).__currentUser = null;
    }
    
    dispatch({ type: AuthActionTypes.LOGOUT });
    
    // Import router dynamically to avoid circular dependencies
    const { router } = require('expo-router');
    console.log('[useAuth] Navigating to login page after logout');
    
    // Set a flag to prevent navigation conflicts
    if (typeof window !== 'undefined') {
      (window as any).__isNavigatingToLogin = true;
    }
    
    // Navigate to login page
    router.replace('/(auth)/login');
    
    // Clear the navigation flag after a delay
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        (window as any).__isNavigatingToLogin = false;
      }
    }, 1000);
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        dispatch,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;
