import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import locationService from '../modules/location/services/locationService';

interface LocationDisplayProps {
  showControls?: boolean;
}

/**
 * LocationDisplay Component
 * 
 * Displays the current location coordinates and provides controls to toggle between
 * real and mocked location (when showControls is true)
 */
export default function LocationDisplay({ showControls = true }: LocationDisplayProps) {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [useRealLocation, setUseRealLocation] = useState(false);
  const [formattedCoords, setFormattedCoords] = useState('');
  
  // Update location when component mounts and when useRealLocation changes
  useEffect(() => {
    locationService.setUseRealLocation(useRealLocation);
    updateLocation();
    
    // Set up interval to periodically update location
    const intervalId = setInterval(updateLocation, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [useRealLocation]);
  
  // Update location from service
  const updateLocation = async () => {
    try {
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);
      
      // Get formatted coordinates
      setFormattedCoords(locationService.getFormattedCoordinates());
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };
  
  // Toggle between real and mocked location
  const toggleLocationMode = () => {
    setUseRealLocation(!useRealLocation);
  };
  
  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Getting location...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current Location</Text>
      <Text style={styles.coordinates}>
        Latitude: {location.coords.latitude.toFixed(6)}
      </Text>
      <Text style={styles.coordinates}>
        Longitude: {location.coords.longitude.toFixed(6)}
      </Text>
      <Text style={styles.formattedCoords}>{formattedCoords}</Text>
      
      {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.button, useRealLocation ? styles.activeButton : styles.inactiveButton]} 
            onPress={toggleLocationMode}
          >
            <Text style={styles.buttonText}>
              {useRealLocation ? 'Using Real Location' : 'Using Mocked Location'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.note}>
            {useRealLocation 
              ? 'Using device GPS coordinates' 
              : 'Using mocked coordinates (Oceanside Pier, CA)'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  coordinates: {
    fontSize: 16,
    marginBottom: 4,
    color: '#444',
  },
  formattedCoords: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  controlsContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginVertical: 8,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  inactiveButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
