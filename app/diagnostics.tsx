import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { addCloudHubAuthHeaders } from '../modules/auth/utils/jwtUtils';
import { getEnvironmentConfig } from '../modules/config/environment';

/**
 * DiagnosticsScreen component for debugging app startup issues on physical devices
 * This screen loads with minimal dependencies and provides detailed environment information
 */
export default function DiagnosticsScreen() {
  const [envInfo, setEnvInfo] = useState<any>('Loading...');
  const [apiStatus, setApiStatus] = useState<Record<string, string>>({
    cheerios: 'Not tested',
    cloudHub: 'Not tested',
    proxy: 'Not tested',
  });
  const [logs, setLogs] = useState<string>('Loading logs...');

  useEffect(() => {
    // Load environment info
    loadEnvironmentInfo();
    
    // Load crash logs if they exist
    loadCrashLogs();
  }, []);

  // Load environment configuration
  const loadEnvironmentInfo = () => {
    try {
      const config = getEnvironmentConfig();
      setEnvInfo({
        platform: Platform.OS,
        version: Platform.Version,
        apiProxyUrl: config?.apiProxyUrl || 'Not set',
        cheeriosApiUrl: config?.cheeriosApiUrl || 'Not set',
        cloudHubApiUrl: config?.cloudHubApiUrl || 'Not set',
        useProxy: config?.useProxy,
        // Remove the environment property that doesn't exist in EnvironmentConfig
        environmentType: typeof config === 'object' ? Object.prototype.toString.call(config) : 'Unknown',
      });
    } catch (error) {
      setEnvInfo({
        error: `Failed to load environment: ${error instanceof Error ? error.message : String(error)}`,
        platform: Platform.OS,
        version: Platform.Version,
      });
    }
  };

  // Load crash logs from the device
  const loadCrashLogs = async () => {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const crashLogPath = `${FileSystem.documentDirectory}bar_buddy_latest_crash.txt`;
        const info = await FileSystem.getInfoAsync(crashLogPath);
        
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(crashLogPath);
          setLogs(content);
        } else {
          setLogs('No crash logs found.');
        }
      } else {
        setLogs('Logs only available on mobile devices.');
      }
    } catch (error) {
      setLogs(`Error loading logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test API connectivity
  const testApiEndpoint = async (type: 'cheerios' | 'cloudHub' | 'proxy') => {
    setApiStatus(prev => ({ ...prev, [type]: 'Testing...' }));
    
    try {
      let url = '';
      let endpoint = '';
      // All tests will use GET for simplicity
      let data = {};
      
      // Configure endpoint based on API type
      if (type === 'cheerios') {
        url = envInfo.cheeriosApiUrl;
        // Use the known working endpoint for Cheerios
        endpoint = '/barbuddies/test/';
        console.log(`Testing Cheerios API at: ${url}${endpoint}`);
      } else if (type === 'cloudHub') {
        // For CloudHub, we need to use the proxy to handle JWT and platform API key
        // On mobile, the app would handle this directly, but for diagnostics we use the proxy
        url = envInfo.useProxy ? envInfo.apiProxyUrl : envInfo.cloudHubApiUrl;
        endpoint = '/cloudhub/auth/buzztime_login/';
        data = {
          email: 'fhankin@buzztime.com',
          password: 'BUZZ',
          device_id: 'mobile-diagnostics',
          invite_token: ''
        };
        console.log(`Testing CloudHub API authentication at: ${url}${endpoint}`);
        console.log(`Using ${envInfo.useProxy ? 'proxy' : 'direct'} connection`);
        setApiStatus(prev => ({ 
          ...prev, 
          [type]: 'Testing CloudHub API authentication...' 
        }));
      } else if (type === 'proxy') {
        url = envInfo.apiProxyUrl;
        endpoint = '/health';
      }
      
      if (!url) {
        setApiStatus(prev => ({ ...prev, [type]: 'URL not configured' }));
        return;
      }
      
      // Add timeout to prevent hanging
      const fullUrl = `${url}${endpoint}`;
      let response;
      
      // Determine request method based on API type
      if (type === 'cloudHub') {
        // CloudHub API uses POST for authentication
        if (!envInfo.useProxy && Platform.OS !== 'web') {
          // For direct CloudHub API calls on mobile, use our JWT utility
          console.log('Using direct CloudHub API call with JWT authentication');
          let headers: Record<string, string> = { 
            'Content-Type': 'application/json',
            'x-client-type': 'mobile-client'
          };
          
          // Add JWT and platform API key headers for direct CloudHub API calls
          // Use the same method as the rest of the app
          headers = await addCloudHubAuthHeaders(headers);
          
          response = await axios.post(fullUrl, data, { 
            timeout: 5000,
            headers: headers
          });
        } else {
          // For web or when using proxy
          response = await axios.post(fullUrl, data, { 
            timeout: 5000,
            headers: { 
              'Content-Type': 'application/json',
              'x-client-type': 'mobile-client'
            }
          });
        }
      } else {
        // Other APIs use GET
        response = await axios.get(fullUrl, { 
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // For CloudHub API, show more detailed response
      if (type === 'cloudHub' && response.data) {
        setApiStatus(prev => ({ 
          ...prev, 
          [type]: `Status: ${response.status} ${response.statusText || ''} - ${JSON.stringify(response.data)}` 
        }));
      } else {
        setApiStatus(prev => ({ 
          ...prev, 
          [type]: `Status: ${response.status} ${response.statusText || ''}` 
        }));
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // For CloudHub API, show more detailed error response
          if (type === 'cloudHub' && error.response.data) {
            errorMessage = `Status: ${error.response.status} ${error.response.statusText || ''} - ${JSON.stringify(error.response.data)}`;
          } else {
            errorMessage = `Status: ${error.response.status} ${error.response.statusText || ''}`;
          }
          console.log(`API error response for ${type}:`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
            url: error.config?.url
          });
        } else if (error.request) {
          errorMessage = 'No response received (timeout or network error)';
          console.log(`API request error for ${type}:`, {
            request: error.request,
            config: error.config
          });
        } else {
          errorMessage = error.message;
          console.log(`API error for ${type}:`, error.message);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        console.log(`Non-Axios error for ${type}:`, error);
      }
      
      setApiStatus(prev => ({ ...prev, [type]: `Error: ${errorMessage}` }));
    }
  };

  // Clear crash logs
  const clearLogs = async () => {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const crashLogPath = `${FileSystem.documentDirectory}bar_buddy_crash.txt`;
        const latestCrashPath = `${FileSystem.documentDirectory}bar_buddy_latest_crash.txt`;
        
        await FileSystem.writeAsStringAsync(crashLogPath, '', { encoding: FileSystem.EncodingType.UTF8 });
        await FileSystem.writeAsStringAsync(latestCrashPath, '', { encoding: FileSystem.EncodingType.UTF8 });
        
        setLogs('Logs cleared.');
      }
    } catch (error) {
      setLogs(`Error clearing logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>bar-buddy Diagnostics</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Environment Information</Text>
        <Text style={styles.monospace}>{JSON.stringify(envInfo, null, 2)}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>API Connectivity Tests</Text>
        <View style={styles.buttonRow}>
          <Button title="Test Cheerios" onPress={() => testApiEndpoint('cheerios')} />
          <Button title="Test CloudHub" onPress={() => testApiEndpoint('cloudHub')} />
          <Button title="Test Proxy" onPress={() => testApiEndpoint('proxy')} />
        </View>
        <Text style={styles.label}>Cheerios API: {apiStatus.cheerios}</Text>
        <Text style={styles.label}>CloudHub API: {apiStatus.cloudHub}</Text>
        <Text style={styles.label}>Proxy API: {apiStatus.proxy}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Crash Logs</Text>
        <Button title="Clear Logs" onPress={clearLogs} />
        <Text style={[styles.monospace, styles.logs]}>{logs}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginVertical: 4,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  logs: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    height: 200,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
});
