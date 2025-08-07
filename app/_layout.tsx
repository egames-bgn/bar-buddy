import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, ErrorInfo } from 'react';
import { useColorScheme } from '../hooks/useColorScheme';
import { ThemeProvider } from '../context/ThemeContext';
import { ActivityIndicator, View, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Import the real auth provider and hook from our modules
import { AuthProvider, useAuth } from '../modules/auth/hooks/useAuth';
import { AuthActionTypes } from '../modules/auth/types/authTypes';

// Import environment config safely
let getEnvironmentConfig: () => any;
try {
  // Try to import from app config first
  const appConfig = require('./config/environment');
  getEnvironmentConfig = appConfig.getEnvironmentConfig || (() => ({}));
} catch (e) {
  console.warn('Failed to import app environment config, will try modules config:', e);
  try {
    // Fallback to modules config
    const modulesConfig = require('../modules/config/environment');
    getEnvironmentConfig = modulesConfig.getEnvironmentConfig || (() => ({}));
  } catch (e2) {
    console.error('Failed to import any environment config:', e2);
    // Provide a default implementation
    getEnvironmentConfig = () => ({
      cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
      cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
      useProxy: false
    });
  }
}

// Error logging function with enhanced error details
const logErrorToFile = async (error: Error, componentStack?: string) => {
  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const timestamp = new Date().toISOString();
      
      // Get environment info safely
      let envInfo = 'Unable to get environment config';
      try {
        const envConfig = getEnvironmentConfig();
        envInfo = JSON.stringify(envConfig, null, 2);
      } catch (err) {
        const envError = err as Error;
        envInfo = `Error getting environment: ${envError.message || 'Unknown error'}`;
      }
      
      // Get device info
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        constants: Platform.constants || {},
      };
      
      // Get API URLs safely
      let apiUrls = {
        cheerios: 'Not available',
        cloudHub: 'Not available',
        proxy: 'Not available',
        useProxy: 'Unknown'
      };
      
      try {
        const config = getEnvironmentConfig();
        apiUrls = {
          cheerios: config?.cheeriosApiUrl || 'Not available',
          cloudHub: config?.cloudHubApiUrl || 'Not available',
          proxy: config?.apiProxyUrl || 'Not available',
          useProxy: String(config?.useProxy)
        };
      } catch (err) {
        console.error('Failed to get API URLs:', err);
      }
      
      // Create detailed error report
      const errorMessage = `\n\n===== ERROR REPORT ${timestamp} =====\n`
        + `Error: ${error.message}\n`
        + `Stack: ${error.stack || 'No stack trace available'}\n`
        + (componentStack ? `Component Stack: ${componentStack}\n` : '')
        + `Platform: ${JSON.stringify(deviceInfo, null, 2)}\n`
        + `Environment: ${envInfo}\n`
        + `API URLs:\n`
        + `  Cheerios: ${apiUrls.cheerios}\n`
        + `  CloudHub: ${apiUrls.cloudHub}\n`
        + `  Proxy: ${apiUrls.proxy}\n`
        + `UseProxy: ${apiUrls.useProxy}\n`;
      
      // Write to a crash log file
      const crashLogPath = `${FileSystem.documentDirectory}bar_buddy_crash.txt`;
      const latestCrashPath = `${FileSystem.documentDirectory}bar_buddy_latest_crash.txt`;
      
      // Append to the crash log history - FileSystem doesn't support append in Expo, so read and append manually
      let existingContent = '';
      try {
        const info = await FileSystem.getInfoAsync(crashLogPath);
        if (info.exists) {
          existingContent = await FileSystem.readAsStringAsync(crashLogPath);
        }
      } catch (err) {
        console.error('Error reading existing log:', err);
      }
      
      await FileSystem.writeAsStringAsync(
        crashLogPath,
        existingContent + errorMessage,
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      // Overwrite the latest crash file for quick access
      await FileSystem.writeAsStringAsync(
        latestCrashPath,
        errorMessage,
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      console.log(`Error logged to ${crashLogPath}`);
      
      // Also log to console for development builds
      console.error('CRASH REPORT:', errorMessage);
    } else {
      console.error('Error:', error);
      if (componentStack) {
        console.error('Component Stack:', componentStack);
      }
    }
  } catch (e) {
    console.error('Failed to log error to file:', e);
  }
};

// Global error handler for React Native
// Use type assertion to access ErrorUtils which exists in React Native but not in TypeScript types
if (global && (global as any).ErrorUtils && !(global as any).ErrorUtils._globalHandler) {
  const ErrorUtils = (global as any).ErrorUtils;
  const originalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler(async (error: Error, isFatal: boolean) => {
    console.error('Global error caught:', error);
    
    try {
      await logErrorToFile(error);
      
      if (Platform.OS === 'android') {
        // On Android, write to a file that can be accessed later
        const errorMessage = `FATAL ERROR: ${error.message}\n${error.stack || ''}`;
        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + 'last_error.txt',
          errorMessage
        );
      }
    } catch (e) {
      console.error('Error in global error handler:', e);
    }
    
    // Call original handler
    originalHandler(error, isFatal);
  });
}

// Error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Fix TypeScript error by ensuring componentStack is a string
    const componentStack = errorInfo.componentStack || '';
    logErrorToFile(error, componentStack);
  }

  render() {
    // Define error styles inline for the error boundary
    const errorStyles = StyleSheet.create({
      errorContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8d7da',
        justifyContent: 'center',
        alignItems: 'center',
      },
      errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#721c24',
        marginBottom: 10,
      },
      errorMessage: {
        fontSize: 16,
        color: '#721c24',
        marginBottom: 10,
        textAlign: 'center',
      },
      errorStack: {
        fontSize: 12,
        color: '#721c24',
        marginBottom: 20,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.5)',
        maxHeight: 200,
      },
    });
    
    if (this.state.hasError) {
      return (
        <View style={errorStyles.errorContainer}>
          <Text style={errorStyles.errorTitle}>Something went wrong</Text>
          <Text style={errorStyles.errorMessage}>{this.state.error?.message}</Text>
          <Text style={errorStyles.errorStack}>{this.state.error?.stack}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// This component handles the authentication state and redirects
function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { state, dispatch } = useAuth();

  // Use light theme for consistent appearance
  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#11181C',
      border: '#E2E8F0',
      primary: '#0a7ea4',
    },
  };

  // Simple navigation tracking to prevent rapid navigation changes
  const navigationRef = React.useRef<{
    lastNavigationTime: number;
    lastAuthState: boolean | null;
  }>({ 
    lastNavigationTime: 0,
    lastAuthState: null
  });

  // Central navigation management based on authentication state
  useEffect(() => {
    console.log('[RootLayout] Auth state changed:', { 
      isAuthenticated: state.isAuthenticated, 
      isLoading: state.isLoading,
      hasUser: !!state.user,
      currentSegment: segments[0],
      error: state.error
    });
    
    // Check if there's an active navigation in progress from login or logout
    const isNavigatingFromLogin = typeof window !== 'undefined' && (window as any).__isNavigatingToTabs;
    const isNavigatingToLogin = typeof window !== 'undefined' && (window as any).__isNavigatingToLogin;
    
    if (isNavigatingFromLogin || isNavigatingToLogin) {
      console.log('[RootLayout] Navigation already in progress, skipping root layout navigation');
      return;
    }
    
    // Skip navigation during initial loading
    if (state.isLoading && navigationRef.current.lastAuthState === null) {
      console.log('[RootLayout] Initial loading, skipping navigation');
      return;
    }

    const now = Date.now();
    const timeSinceLastNavigation = now - navigationRef.current.lastNavigationTime;
    
    // Prevent rapid navigation changes (debounce)
    if (timeSinceLastNavigation < 1000) { // 1000ms debounce (increased from 500ms)
      console.log(`[RootLayout] Skipping navigation, last navigation was ${timeSinceLastNavigation}ms ago`);
      return;
    }
    
    // Update navigation tracking
    navigationRef.current.lastNavigationTime = now;
    
    // Only update auth state tracking if it has changed
    if (navigationRef.current.lastAuthState !== state.isAuthenticated) {
      console.log(`[RootLayout] Auth state changed from ${navigationRef.current.lastAuthState} to ${state.isAuthenticated}`);
      navigationRef.current.lastAuthState = state.isAuthenticated;
    }
    
    const inAuthGroup = segments[0] === '(auth)';
    
    // Check for global user reference first
    const hasGlobalUser = typeof window !== 'undefined' && !!(window as any).__currentUser;
    
    // Handle navigation based on authentication state
    if ((state.isAuthenticated && state.user) || hasGlobalUser) {
      // If authenticated and in auth group, redirect to tabs
      if (inAuthGroup) {
        console.log('[RootLayout] Authenticated with user profile, redirecting to tabs');
        // Set the navigation flag to prevent conflicts
        if (typeof window !== 'undefined') {
          (window as any).__isNavigatingToTabs = true;
        }
        router.navigate('/(tabs)');
      } else {
        console.log('[RootLayout] Already in tabs, no navigation needed');
        
        // If we have a global user but not in state, sync them
        if (hasGlobalUser && !state.isAuthenticated) {
          console.log('[RootLayout] Global user exists but not in state, syncing state');
          dispatch({
            type: AuthActionTypes.LOGIN_SUCCESS,
            payload: (window as any).__currentUser
          });
        }
      }
    } else if (!state.isAuthenticated) {
      // Double check sessionStorage before redirecting to login
      let shouldRedirect = true;
      
      if (typeof window !== 'undefined') {
        try {
          const storedUser = sessionStorage.getItem('auth_user');
          const storedToken = sessionStorage.getItem('auth_token_backup');
          
          if (storedUser && storedToken) {
            console.log('[RootLayout] Found auth data in sessionStorage, preventing redirect');
            shouldRedirect = false;
            
            // Set the global user reference
            (window as any).__currentUser = JSON.parse(storedUser);
            
            // Update auth state
            dispatch({
              type: AuthActionTypes.LOGIN_SUCCESS,
              payload: JSON.parse(storedUser)
            });
          }
        } catch (e) {
          console.error('[RootLayout] Error checking sessionStorage:', e);
        }
      }
      
      // If not authenticated and not in auth group, redirect to login
      if (!inAuthGroup && shouldRedirect) {
        console.log('[RootLayout] Not authenticated and not in auth group, redirecting to login');
        router.navigate('/(auth)/login');
      } else {
        console.log('[RootLayout] Already in login, no navigation needed');
      }
    }
  }, [state.isAuthenticated, state.isLoading, state.user, segments, router]);

  const loading = state.isLoading;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text style={{ marginTop: 20, color: '#4A5568' }}>Loading bar-buddy...</Text>
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={theme}>
      <Stack 
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' } // Ensure consistent background color
        }}
      >
        {state.isAuthenticated ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </>
        ) : (
          <Stack.Screen name="login" options={{ headerShown: false }} />
        )}
      </Stack>
      <StatusBar style="dark" /> {/* Use dark text on light background */}
    </NavigationThemeProvider>
  );
}

// Flag to enable diagnostics mode for debugging on physical devices
// Disabled to allow normal app startup to main page
const ENABLE_DIAGNOSTICS_MODE = false;

export default function RootLayout() {
  const [loaded] = useFonts({
    // No custom fonts needed for the prototype
  });
  const [startupError, setStartupError] = useState<Error | null>(null);

  // Early environment check
  useEffect(() => {
    try {
      // Try to load environment config
      const env = getEnvironmentConfig();
      console.log('Environment loaded successfully:', env);
      
      // Check for critical API URLs - use lowercase property names
      // The environment.js file uses lowercase properties
      if (!env.cheeriosApiUrl && !env.CHEERIOS_API_URL) {
        console.warn('Missing Cheerios API URL, will use default cloud URL');
        env.cheeriosApiUrl = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
      }
      
      if (!env.cloudHubApiUrl && !env.CLOUDHUB_API_URL) {
        console.warn('Missing CloudHub API URL, will use default cloud URL');
        env.cloudHubApiUrl = 'https://ch-api-dev-ooifid6utq-uc.a.run.app';
      }
      
      // Log platform info
      console.log(`Platform: ${Platform.OS}, Version: ${Platform.Version}, is mobile: ${Platform.OS !== 'web'}`);
      console.log('API URLs:', {
        cheerios: env.cheeriosApiUrl || env.CHEERIOS_API_URL,
        cloudHub: env.cloudHubApiUrl || env.CLOUDHUB_API_URL
      });
    } catch (error) {
      console.error('Error during startup environment check:', error);
      // Don't crash the app, just log the error
      logErrorToFile(error instanceof Error ? error : new Error(String(error)));
      // Only set startup error for critical failures
      if (error instanceof Error && error.message.includes('critical')) {
        setStartupError(error);
      }
    }
  }, []);

  // If diagnostics mode is enabled, render the diagnostics screen directly
  // This bypasses all other initialization that might be causing crashes
  if (ENABLE_DIAGNOSTICS_MODE && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    try {
      console.log('Starting in diagnostics mode for mobile device');
      // Use dynamic import to avoid issues if the file doesn't exist
      const DiagnosticsScreen = require('./diagnostics').default;
      return (
        <ErrorBoundary>
          <DiagnosticsScreen />
        </ErrorBoundary>
      );
    } catch (error) {
      console.error('Failed to load diagnostics screen:', error);
      // Continue with normal startup if diagnostics fails
    }
  }

  if (!loaded) {
    return null;
  }
  
  // Define styles for error display
  const errorStyles = StyleSheet.create({
    errorContainer: {
      flex: 1,
      padding: 20,
      backgroundColor: '#f8d7da',
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#721c24',
      marginBottom: 10,
    },
    errorMessage: {
      fontSize: 16,
      color: '#721c24',
      marginBottom: 10,
      textAlign: 'center',
    },
    errorStack: {
      fontSize: 12,
      color: '#721c24',
      marginBottom: 20,
      padding: 10,
      backgroundColor: 'rgba(255,255,255,0.5)',
      maxHeight: 200,
    },
    errorNote: {
      fontSize: 14,
      fontStyle: 'italic',
      color: '#721c24',
    },
  });
  
  if (startupError) {
    return (
      <View style={errorStyles.errorContainer}>
        <Text style={errorStyles.errorTitle}>Startup Error</Text>
        <Text style={errorStyles.errorMessage}>{startupError.message}</Text>
        <Text style={errorStyles.errorStack}>{startupError.stack}</Text>
        <Text style={errorStyles.errorNote}>Error details saved to bar_buddy_crash.txt</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
