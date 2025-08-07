import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Service
 * 
 * Provides a unified storage interface using AsyncStorage for all platforms
 * This ensures consistent behavior across web and native platforms
 */
class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Store a value using AsyncStorage
   */
  public async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      console.log(`[StorageService] Stored ${key} in AsyncStorage`);
    } catch (e) {
      console.error(`[StorageService] Failed to store ${key} in AsyncStorage:`, e);
    }
  }

  /**
   * Retrieve a stored value from AsyncStorage
   */
  public async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(`[StorageService] Retrieved ${key} from AsyncStorage: ${value ? 'exists' : 'not found'}`);
      return value;
    } catch (e) {
      console.error(`[StorageService] Failed to retrieve ${key} from AsyncStorage:`, e);
      return null;
    }
  }

  /**
   * Remove a stored value from AsyncStorage
   */
  public async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`[StorageService] Removed ${key} from AsyncStorage`);
    } catch (e) {
      console.error(`[StorageService] Failed to remove ${key} from AsyncStorage:`, e);
    }
  }
}

export default StorageService.getInstance();
