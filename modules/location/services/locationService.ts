import { Platform } from 'react-native';

/**
 * Location Service
 * 
 * This service handles location-related functionality including:
 * - Getting the current location
 * - Mocking location for development purposes
 * - Calculating distance between locations
 */
class LocationService {
  private static instance: LocationService;
  
  // Default mocked coordinates for Oceanside Pier, CA
  private mockedCoordinates = {
    latitude: 33.176437,
    longitude: -117.321279,
    accuracy: 5,
    altitude: 10,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0
  };

  private useRealLocation: boolean = false;
  
  private constructor() {
    console.log('[Location Service] Initialized');
    
    // In development, we'll use mocked coordinates by default
    if (__DEV__) {
      console.log('[Location Service] Using mocked coordinates in development mode');
      console.log(`[Location Service] Mocked coordinates: ${this.mockedCoordinates.latitude}, ${this.mockedCoordinates.longitude}`);
    } else {
      // In production, we'll use real location by default
      this.useRealLocation = true;
    }
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Get the current location
   * Returns mocked location if in development mode and useRealLocation is false
   */
  public async getCurrentLocation(): Promise<GeolocationPosition> {
    if (this.useRealLocation) {
      try {
        return await this.getRealLocation();
      } catch (error) {
        console.error('[Location Service] Error getting real location:', error);
        return this.getMockedLocation();
      }
    } else {
      return this.getMockedLocation();
    }
  }

  /**
   * Get the real location using the browser's geolocation API
   */
  private getRealLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('[Location Service] Real location obtained:', position.coords);
            resolve(position);
          },
          (error) => {
            console.error('[Location Service] Error getting real location:', error);
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        reject(new Error('Geolocation is not supported by this browser/device'));
      }
    });
  }

  /**
   * Get a mocked location
   */
  private getMockedLocation(): GeolocationPosition {
    const timestamp = new Date().getTime();
    
    // Create a position object that matches the GeolocationPosition interface
    return {
      coords: {
        latitude: this.mockedCoordinates.latitude,
        longitude: this.mockedCoordinates.longitude,
        accuracy: this.mockedCoordinates.accuracy,
        altitude: this.mockedCoordinates.altitude,
        altitudeAccuracy: this.mockedCoordinates.altitudeAccuracy,
        heading: this.mockedCoordinates.heading,
        speed: this.mockedCoordinates.speed
      },
      timestamp
    };
  }

  /**
   * Set whether to use real location or mocked location
   */
  public setUseRealLocation(useReal: boolean): void {
    this.useRealLocation = useReal;
    console.log(`[Location Service] ${useReal ? 'Using real location' : 'Using mocked location'}`);
  }

  /**
   * Set custom mocked coordinates
   */
  public setMockedCoordinates(latitude: number, longitude: number): void {
    this.mockedCoordinates = {
      ...this.mockedCoordinates,
      latitude,
      longitude
    };
    console.log(`[Location Service] Mocked coordinates set to: ${latitude}, ${longitude}`);
  }

  /**
   * Calculate distance between two points in kilometers
   */
  public calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Get formatted coordinates string
   */
  public getFormattedCoordinates(): string {
    const { latitude, longitude } = this.mockedCoordinates;
    
    // Format latitude
    const latDegrees = Math.floor(Math.abs(latitude));
    const latMinutes = Math.floor((Math.abs(latitude) - latDegrees) * 60);
    const latSeconds = ((Math.abs(latitude) - latDegrees - latMinutes / 60) * 3600).toFixed(3);
    const latDirection = latitude >= 0 ? 'N' : 'S';
    
    // Format longitude
    const lonDegrees = Math.floor(Math.abs(longitude));
    const lonMinutes = Math.floor((Math.abs(longitude) - lonDegrees) * 60);
    const lonSeconds = ((Math.abs(longitude) - lonDegrees - lonMinutes / 60) * 3600).toFixed(3);
    const lonDirection = longitude >= 0 ? 'E' : 'W';
    
    return `${latDirection} ${latDegrees}° ${latMinutes}' ${latSeconds}" / ${lonDirection} ${lonDegrees}° ${lonMinutes}' ${lonSeconds}"`;
  }
}

export default LocationService.getInstance();
