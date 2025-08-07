import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import storageService from '../../modules/api-proxy/services/storageService';
import apiProxyService from '../../modules/api-proxy/services/apiProxyService';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';

// Storage keys
const LOCATION_PREFERENCE_KEY = 'user_location_preference';
const LOCATION_ID_KEY = 'user_selected_location_id';
const LOCATION_NAME_KEY = 'user_selected_location_name';

export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedTab, setSelectedTab] = useState('checkin');
  const [selectedLocation, setSelectedLocation] = useState('No location selected');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocationPreference, setHasLocationPreference] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [checkInText, setCheckInText] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  
  // Get auth context to access user data
  const { state: authState } = useAuth();
  
  // Request camera and media library permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and media library permissions to use this feature.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      console.log('[ShareScreen] Opening camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        console.log('[ShareScreen] Photo taken:', selectedUri);
        setPhotoUri(selectedUri);
      }
    } catch (error) {
      console.error('[ShareScreen] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Select a photo from the gallery
  const selectPhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      console.log('[ShareScreen] Opening image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        console.log('[ShareScreen] Photo selected:', selectedUri);
        setPhotoUri(selectedUri);
      }
    } catch (error) {
      console.error('[ShareScreen] Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };
  
  // Log auth state on component mount
  useEffect(() => {
    if (authState.user) {
      console.log('[ShareScreen] User authenticated:', {
        id: authState.user.id,
        playerId: authState.user.player_id
      });
    } else {
      console.warn('[ShareScreen] No authenticated user found');
    }
  }, [authState.user]);

  // Check if user has set a location preference
  useEffect(() => {
    async function checkLocationPreference() {
      try {
        setIsLoading(true);
        
        // Check if user has set a location preference
        const locationPreference = await storageService.getItem(LOCATION_PREFERENCE_KEY);
        const locationId = await storageService.getItem(LOCATION_ID_KEY);
        const locationName = await storageService.getItem(LOCATION_NAME_KEY);
        
        console.log('[ShareScreen] Location preference:', locationPreference);
        console.log('[ShareScreen] Location ID:', locationId);
        console.log('[ShareScreen] Location name:', locationName);
        
        // If we have a valid location ID and name, consider it as a selected location
        // even if the preference key is missing (for backward compatibility)
        if ((locationPreference === 'selected' || !locationPreference) && locationId && locationName) {
          // User has selected a location
          setSelectedLocationId(locationId);
          setSelectedLocation(locationName);
          setHasLocationPreference(true);
          
          // Ensure the preference is properly set
          if (!locationPreference) {
            await storageService.setItem(LOCATION_PREFERENCE_KEY, 'selected');
            console.log('[ShareScreen] Setting missing location preference to selected');
          }
        } else if (locationPreference === 'hidden') {
          // User has chosen to hide their location
          setSelectedLocation('Location hidden');
          setSelectedLocationId(null);
          setHasLocationPreference(true);
        } else {
          // User has not set a location preference
          setHasLocationPreference(false);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('[ShareScreen] Error checking location preference:', error);
        setIsLoading(false);
        setHasLocationPreference(false);
      }
    }
    
    checkLocationPreference();
  }, []);
  
  // Handle location selection from the location-select screen
  useEffect(() => {
    // Debug logging to help diagnose issues
    console.log('[ShareScreen] Params received:', {
      selectedLocationId: params.selectedLocationId,
      selectedLocationName: params.selectedLocationName,
      locationHidden: params.locationHidden,
      timestamp: params.timestamp
    });
    
    // More robust check for location selection parameters
    // Use a more explicit check to handle different parameter formats on different platforms
    const hasLocationSelection = 
      params.selectedLocationId !== undefined && 
      params.selectedLocationId !== null && 
      params.selectedLocationId !== '' &&
      params.selectedLocationName !== undefined && 
      params.selectedLocationName !== null && 
      params.selectedLocationName !== '';
    
    if (hasLocationSelection) {
      const locationId = String(params.selectedLocationId);
      const locationName = String(params.selectedLocationName);
      
      console.log('[ShareScreen] Processing location selection:', { locationId, locationName });
      
      // Update state immediately
      setSelectedLocationId(locationId);
      setSelectedLocation(locationName);
      setHasLocationPreference(true);
      
      // Save to storage with improved error handling
      (async () => {
        try {
          // Save all items in sequence to ensure consistency
          await Promise.all([
            storageService.setItem(LOCATION_PREFERENCE_KEY, 'selected'),
            storageService.setItem(LOCATION_ID_KEY, locationId),
            storageService.setItem(LOCATION_NAME_KEY, locationName)
          ]);
          
          console.log('[ShareScreen] Location selected and saved:', locationName);
        } catch (error) {
          console.error('[ShareScreen] Error saving location preference:', error);
          // Show an error alert to the user
          Alert.alert(
            'Error',
            'Failed to save your location preference. Please try again.',
            [{ text: 'OK' }]
          );
        }
      })();
    } else if (params.locationHidden === 'true') {
      // User has chosen to hide their location
      console.log('[ShareScreen] Processing hidden location preference');
      
      // Update state immediately
      setSelectedLocation('Location hidden');
      setSelectedLocationId(null);
      setHasLocationPreference(true);
      
      // Save to storage with improved error handling
      (async () => {
        try {
          // Save preference first, then remove other items
          await storageService.setItem(LOCATION_PREFERENCE_KEY, 'hidden');
          await Promise.all([
            storageService.removeItem(LOCATION_ID_KEY),
            storageService.removeItem(LOCATION_NAME_KEY)
          ]);
          
          console.log('[ShareScreen] Location hidden preference saved');
        } catch (error) {
          console.error('[ShareScreen] Error saving location preference:', error);
          // Show an error alert to the user
          Alert.alert(
            'Error',
            'Failed to save your location preference. Please try again.',
            [{ text: 'OK' }]
          );
        }
      })();
    }
  }, [params.selectedLocationId, params.selectedLocationName, params.locationHidden, params.timestamp]);

  
  // Navigate to location selection screen
  const handleChangeLocation = () => {
    router.push({
      pathname: '/location-select',
      params: { returnTo: '/(tabs)/share' }
    });
  };
  
  // Handle share button press
  const handleShare = async () => {
    if (!checkInText || isSharing) return;
    
    if (!authState.user || !authState.user.id) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }
    
    setIsSharing(true);
    
    try {
      console.log('[ShareScreen] Sharing check-in...');
      
      // Determine if location is hidden
      const isLocationHidden = selectedLocation === 'Location hidden';
      
      // Prepare payload for API - match parameter names exactly as expected by stored procedure
      const payload = {
        UserID: authState.user.id, // This is what the BuddyPostView.post method expects
        PostType: 'checkin',
        PostContent: checkInText,
        LocationID: isLocationHidden ? null : selectedLocationId,
        LocationName: isLocationHidden ? null : selectedLocation,
        IsLocationHidden: isLocationHidden ? 1 : 0, // Backend expects 1/0 instead of true/false
        PhotoURL: null,
        PhotoStoragePath: null
      };
      
      console.log('[ShareScreen] Sending payload:', payload);
      
      // Call the API
      const response = await apiProxyService.post('/barbuddies/posts/', payload);
      
      console.log('[ShareScreen] Response:', JSON.stringify(response));
      
      // More robust response checking - consider any non-error response as success
      // if the API doesn't return the expected format
      if (response) {
        // Check for explicit success property first
        const isSuccess = 
          (typeof response === 'object' && 'success' in response && response.success === true) ||
          // Or check for any indication of success in the response
          (typeof response === 'object' && !('error' in response)) ||
          // Or if response is just a status code or simple value
          (typeof response !== 'object');
        
        if (isSuccess) {
          // Clear the check-in text
          setCheckInText('');
          
          // Show success message with more visibility
          // Navigate to home tab immediately after successful share
          console.log('[ShareScreen] Navigating to home tab after successful share');
          
          // Use a timeout to ensure the navigation happens after the state updates
          setTimeout(() => {
            // Try multiple navigation methods for robustness
            try {
              // First attempt - replace current route with tabs
              router.replace('/(tabs)');
              
              // Second attempt - use different navigation method
              setTimeout(() => {
                try {
                  // Use index as the target
                  router.navigate({pathname: '/(tabs)'});
                } catch (navError) {
                  console.error('[ShareScreen] Second navigation attempt failed:', navError);
                }
              }, 100);
            } catch (navError) {
              console.error('[ShareScreen] First navigation attempt failed:', navError);
            }
          }, 300);
          
          // Show success message
          Alert.alert('Success', 'Your check-in has been shared!');
          
          console.log('[ShareScreen] Post shared successfully!');
          return;
        }
      }
      
      // If we get here, the response didn't indicate success
      console.error('[ShareScreen] API response did not indicate success:', response);
      throw new Error('API returned unsuccessful or unrecognized response');
    } catch (error) {
      console.error('[ShareScreen] Error sharing check-in:', error);
      Alert.alert('Error', 'Failed to share your check-in. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };
  
  // If still loading, show a loading indicator
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }
  
  // If user hasn't set a location preference, redirect to location selection
  if (!hasLocationPreference) {
    console.log('[ShareScreen] No location preference found, redirecting to location selection');
    return <Redirect href="/location-select?returnTo=/(tabs)/share&requireLocation=true" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share a Moment</Text>
      </View>
      
      <View style={styles.tabsContainer}>
        <View style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Check-in</Text>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.locationContainer}>
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={24} color="#2f95dc" />
            <Text style={styles.locationLabel}>{selectedLocation}</Text>
          </View>
          <TouchableOpacity style={styles.changeLocationButton} onPress={handleChangeLocation}>
            <Text style={styles.changeLocationText}>Change</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.checkinSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>What are you doing here?</Text>
            <TextInput
              style={[styles.textInput, styles.activityInput]}
              placeholder="Tell us about your experience at this location..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={checkInText}
              onChangeText={setCheckInText}
            />
          </View>
        </View>
        
        {/* Score tab has been removed */}
      </ScrollView>
      
      <TouchableOpacity 
        style={[styles.shareButton, (!checkInText || isSharing || !authState.user) && styles.disabledButton]} 
        onPress={handleShare}
        disabled={!checkInText || isSharing || !authState.user}
      >
        {isSharing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.shareButtonText}>Share</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.lightText,
  },
  header: {
    backgroundColor: Colors.tint,
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.tint,
  },
  tabText: {
    fontWeight: '500',
    color: Colors.lightText,
  },
  activeTabText: {
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  photoSection: {
    flex: 1,
  },
  cameraPlaceholder: {
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: Colors.lightText,
    fontSize: 16,
    marginTop: 10,
  },
  photoContainer: {
    height: 250,
    borderRadius: 10,
    marginBottom: 15,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: Colors.tint,
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
  },
  galleryButton: {
    backgroundColor: '#5856d6', // Using the original color since secondary is not in our palette
    marginLeft: 10,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  changeLocationButton: {
    backgroundColor: Colors.tint,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  changeLocationText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 14,
  },
  checkinSection: {
    flex: 1,
  },
  shareButton: {
    backgroundColor: Colors.tint,
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 80, // Increased to avoid navigation bar overlap
    left: 15,
    right: 15,
    zIndex: 10,
  },
  shareButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  disabledButton: {
    backgroundColor: Colors.disabledButton,
    opacity: 0.7,
  },
  activityInput: {
    minHeight: 150,
  },
});
