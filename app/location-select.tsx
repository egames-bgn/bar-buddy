import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ENV from '../modules/config/environment';
// Import CloudHub authentication utilities
const { addCloudHubAuthHeaders } = require('../modules/auth/utils/shared-jwt');
// Import AuthService for user data
import AuthService from '../modules/auth/services/authService';
// Import API Proxy service
import apiProxy from '../modules/api-proxy/services/apiProxyService';
// Import standardized colors
import { Colors } from '../constants/Colors';

// Define the Location interface
interface Location {
  id: string;
  name: string;
  address: string;
  distance?: string;
}

// Define the CloudHub Location interface
interface CloudHubLocation {
  id: number;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  distance: number;
  radius: number;
}

export default function LocationSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo as string || 'share';
  const requireLocation = params.requireLocation === 'true';

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if a token might be expired
  const checkIfTokenExpired = async (token: string): Promise<boolean> => {
    try {
      // Simple check - in a real app, you would decode the JWT and check the exp claim
      // This is a basic implementation that checks if the token is a valid JWT format
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('[Token Check] Invalid token format');
        return true; // Not a valid JWT format, consider it expired
      }
      
      // In a real implementation, you would decode the payload and check exp
      // For now, we'll just assume it's valid if it has the correct format
      return false;
    } catch (error) {
      console.error('[Token Check] Error checking token:', error);
      return true; // Assume expired on error
    }
  };

  // Helper function to refresh the auth token
  const refreshAuthToken = async (): Promise<{success: boolean, token: string | null}> => {
    try {
      // In a real implementation, you would call a token refresh endpoint
      // For now, we'll just return the existing token from storage
      const existingToken = await AsyncStorage.getItem('auth_token');
      
      if (existingToken) {
        // In a real app, you would validate this token with the server
        return { success: true, token: existingToken };
      }
      
      return { success: false, token: null };
    } catch (error) {
      console.error('[Token Refresh] Error refreshing token:', error);
      return { success: false, token: null };
    }
  };

  // Helper function to handle token refresh failure
  const handleTokenRefreshFailure = async (): Promise<void> => {
    try {
      // Clear the auth token
      await AsyncStorage.removeItem('auth_token');
      
      // In a real app, you would redirect to the login screen
      // For now, we'll just log the action
      console.log('[Token Refresh] Cleared auth token due to refresh failure');
    } catch (error) {
      console.error('[Token Refresh] Error handling refresh failure:', error);
    }
  };

  // Function to fetch nearby locations from CloudHub API
  const fetchNearbyLocations = async () => {
    // Create a log collection for Android debugging
    const debugLogs: string[] = [];
    const logDebug = (message: string, data: any = null) => {
      const logEntry = data ? `${message} ${JSON.stringify(data)}` : message;
      console.log(logEntry);
      debugLogs.push(logEntry);
    };
    try {
      setLoading(true);
      setError(null);
      
      // Debug logging is now handled at the function level
      
      // Use Carlsbad, CA coordinates
      const latitude = 33.1581;
      const longitude = -117.3506;
      
      logDebug(`[ANDROID DEBUG] Fetching nearby locations at: ${latitude}, ${longitude}`);
      logDebug(`[ANDROID DEBUG] Current timestamp: ${new Date().toISOString()}`);
      
      // Get environment information
      const { useProxy } = ENV.config;
      const platform = ENV.currentEnvironment;
      logDebug('[ANDROID DEBUG] Environment:', { useProxy, platform });
      
      // Get auth token from AsyncStorage - this is now used consistently across all platforms
      let authToken = await AsyncStorage.getItem('auth_token');
      
      if (!authToken) {
        logDebug('[ANDROID DEBUG] No auth token found, redirecting to login');
        throw new Error('Authentication required. Please log in first.');
      }
      
      // Check if token might be expired (simple check based on JWT structure)
      // A proper implementation would decode the JWT and check the expiration claim
      const isTokenPotentiallyExpired = await checkIfTokenExpired(authToken);
      
      if (isTokenPotentiallyExpired) {
        logDebug('[ANDROID DEBUG] Token appears to be expired, attempting to refresh');
        // Attempt to refresh the token or re-login
        const refreshResult = await refreshAuthToken();
        
        if (refreshResult.success && refreshResult.token) {
          authToken = refreshResult.token;
          logDebug('[ANDROID DEBUG] Token refreshed successfully');
        } else {
          logDebug('[ANDROID DEBUG] Token refresh failed, redirecting to login');
          // Force logout and redirect to login
          await handleTokenRefreshFailure();
          throw new Error('Session expired. Please log in again.');
        }
      }
      
      // At this point, authToken is guaranteed to be non-null
      if (authToken) {
        logDebug('[ANDROID DEBUG] Auth token available:', { length: authToken.length, prefix: authToken.substring(0, 10) + '...' });
      } else {
        throw new Error('Authentication required. Please log in first.');
      }
      
      // Prepare base headers
      const baseHeaders = {
        'Content-Type': 'application/json',
      };
      
      // Add CloudHub authentication headers (JWT and platform API key)
      const headers = await addCloudHubAuthHeaders(baseHeaders, authToken);
      logDebug('[ANDROID DEBUG] Headers for CloudHub API:', {
        contentType: headers['Content-Type'],
        authHeaderLength: headers['Authorization'] ? headers['Authorization'].length : 0,
        platformApiKey: headers['X-Platform-API-Key'] ? 'Present' : 'Missing',
        authToken: headers['Auth-Token'] ? 'Present' : 'Missing'
      });
      
      // Use apiProxy service for consistent endpoint handling across platforms
      // This matches the pattern used by the buddies service
      // Ensure the endpoint path is correct for both web and direct API calls
      const endpoint = '/cloudhub/network/nearby_sites/';
      logDebug('[ANDROID DEBUG] Using apiProxy for nearby locations with endpoint:', { endpoint });
      
      // Prepare request body with correct parameter casing
      const requestBody = {
        latitude,
        longitude,
        max_sites: 30,
        isMockLocationFlag: false
      };
      
      // Log the request body for debugging
      logDebug('[ANDROID DEBUG] Request body:', requestBody);
      
      logDebug('[ANDROID DEBUG] Making nearby locations request with apiProxy:', { 
        endpoint, 
        method: 'POST',
        body: requestBody
      });

      try {
        // Make the API call using apiProxy service (same approach as buddies service)
        const response = await apiProxy.post(endpoint, requestBody);
        
        logDebug('[ANDROID DEBUG] API response received:', { 
          status: response.status,
          headers: response.headers
        });
        
        // Check if response is OK (status code 200-299)
        if (response.status < 200 || response.status >= 300) {
          logDebug('[ANDROID DEBUG] Error response body:', { body: response.data });
          throw new Error(`API error: ${response.status} `);
        }
        
        // Axios already parses JSON for us, so we can use response.data directly
        const data = response.data as any; // Type assertion to avoid TypeScript errors
        logDebug('[ANDROID DEBUG] Nearby locations data received:', { 
          dataType: typeof data,
          hasData: !!data,
          hasSites: !!(data && data.sites),
          sitesIsArray: !!(data && data.sites && Array.isArray(data.sites)),
          sitesCount: data && data.sites && Array.isArray(data.sites) ? data.sites.length : 0
        });
        
        // Handle different response formats
        let locationsData: any[] = [];
        
        if (Array.isArray(data)) {
          // If the response is directly an array of locations
          locationsData = data;
          logDebug('[ANDROID DEBUG] Using direct array response format');
        } else if (data && data.sites && Array.isArray(data.sites)) {
          // If the response has a 'sites' property containing an array
          locationsData = data.sites;
          logDebug('[ANDROID DEBUG] Using nested sites array response format');
        } else {
          logDebug('[ANDROID DEBUG] Invalid response format - no locations data found');
          // Return empty array instead of throwing to prevent crashes
          setLocations([]);
          setLoading(false);
          return;
        }
        
        // We don't need to process the locations twice, so let's just create the final transformed locations
        const transformedLocations: Location[] = locationsData.map((site: any) => ({
          id: site.id.toString(),
          name: site.name,
          address: `${site.city}, ${site.state}`,
          distance: `${site.distance.toFixed(1)} miles`
        }));
        
        logDebug(`[ANDROID DEBUG] Transformed ${transformedLocations.length} nearby locations`);
        setLocations(transformedLocations);
        
      } catch (fetchError: any) {
        logDebug('[ANDROID DEBUG] Fetch error:', { message: fetchError.message, stack: fetchError.stack });
        throw fetchError;
      }
      
    } catch (error: any) {
      logDebug('[ANDROID DEBUG] Error fetching nearby locations:', { 
        message: error.message, 
        stack: error.stack 
      });
      setError(`Failed to load nearby locations: ${error.message}`);
      setLocations([]);
    } finally {
      // Log all debug information to console in one big chunk for easy retrieval
      console.log('======= ANDROID DEBUG LOG SUMMARY =======');
      console.log(debugLogs.join('\n'));
      console.log('======= END DEBUG LOG SUMMARY =======');
      
      // Also try to save logs to AsyncStorage for later retrieval
      try {
        AsyncStorage.setItem('nearby_locations_debug_log', JSON.stringify(debugLogs));
      } catch (e) {
        console.log('Failed to save debug logs to AsyncStorage');
      }
      
      setLoading(false);
    }
  };
  
  // Fetch locations when component mounts
  useEffect(() => {
    fetchNearbyLocations();
  }, []);

  // Filter locations based on search query
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle location selection
  const handleSelectLocation = (location: Location) => {
    // Set a small timeout to ensure state is properly updated before navigation
    // This helps prevent the issue where location selection requires two attempts on Android
    setTimeout(() => {
      // Use replace instead of push to ensure a clean navigation back
      router.replace({
        pathname: returnTo as any, // Cast to any to resolve TypeScript error
        params: { 
          selectedLocationId: location.id,
          selectedLocationName: location.name,
          timestamp: Date.now() // Add timestamp to ensure params are seen as new
        }
      });
    }, 100); // Small delay to ensure proper processing
  };

  // Handle "Hide Location" option
  const handleHideLocation = () => {
    // Set a small timeout to ensure state is properly updated before navigation
    // This helps prevent the issue where location selection requires two attempts on Android
    setTimeout(() => {
      // Use replace instead of push to ensure a clean navigation back
      router.replace({
        pathname: returnTo as any, // Cast to any to resolve the TypeScript error
        params: {
          locationHidden: 'true',
          timestamp: Date.now() // Add timestamp to ensure params are seen as new
        }
      });
    }, 100); // Small delay to ensure proper processing
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {!requireLocation ? (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={styles.placeholder} />
      </View>
      
      {requireLocation && (
        <View style={styles.requiredBanner}>
          <Ionicons name="information-circle" size={24} color="#fff" />
          <Text style={styles.requiredBannerText}>
            You must select a location or choose to hide your location to continue
          </Text>
        </View>
      )}
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search locations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* Hide location option */}
      <TouchableOpacity 
        style={styles.hideLocationButton}
        onPress={handleHideLocation}
      >
        <Ionicons name="eye-off-outline" size={24} color="#666" />
        <Text style={styles.hideLocationText}>Hide My Location</Text>
      </TouchableOpacity>
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Nearby locations list */}
      <Text style={styles.sectionTitle}>Nearby Locations</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2f95dc" />
          <Text style={styles.loadingText}>Finding nearby locations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchNearbyLocations}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLocations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.locationItem}
              onPress={() => handleSelectLocation(item)}
            >
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={20} color="#2f95dc" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{item.name}</Text>
                <Text style={styles.locationAddress}>{item.address}</Text>
              </View>
              {item.distance && (
                <Text style={styles.locationDistance}>{item.distance}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={40} color="#999" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No locations match your search' : 'No nearby locations found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  requiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    padding: 15,
    marginBottom: 10,
  },
  requiredBannerText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  placeholder: {
    width: 34, // Same width as back button for centering
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  hideLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  hideLocationText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 15,
    marginHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.lightText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: Colors.tint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.lightText,
  },
  locationDistance: {
    fontSize: 14,
    color: Colors.tint,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
  },
});
