import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, RefreshControl } from 'react-native';
import logger from '../../modules/utils/logger';
import { getEnvironmentConfig } from '../config/environment';

/**
 * Debug Log Screen Component
 * Displays application logs and environment information for debugging
 */
const DebugLogScreen: React.FC = () => {
  const [logs, setLogs] = useState<string>('Loading logs...');
  const [refreshing, setRefreshing] = useState(false);
  const [envConfig, setEnvConfig] = useState<any>({});

  // Load logs and environment config
  const loadData = async () => {
    setRefreshing(true);
    try {
      // Get logs
      const logContent = await logger.getLogs();
      setLogs(logContent);
      
      // Get environment config
      const config = getEnvironmentConfig();
      setEnvConfig(config);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Share logs
  const shareLogs = async () => {
    try {
      const logPath = await logger.exportLogs();
      if (logPath) {
        await Share.share({
          title: 'bar-buddy Debug Logs',
          message: `bar-buddy Debug Logs\n\nEnvironment: ${JSON.stringify(envConfig, null, 2)}\n\n${logs}`,
        });
      }
    } catch (error) {
      console.error('Failed to share logs:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>bar-buddy Debug Logs</Text>
        <TouchableOpacity style={styles.shareButton} onPress={shareLogs}>
          <Text style={styles.shareButtonText}>Share Logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.envContainer}>
        <Text style={styles.sectionTitle}>Environment Configuration:</Text>
        <ScrollView style={styles.envScroll} horizontal>
          <Text style={styles.envText}>
            {JSON.stringify(envConfig, null, 2)}
          </Text>
        </ScrollView>
      </View>

      <Text style={styles.sectionTitle}>Application Logs:</Text>
      <ScrollView 
        style={styles.logContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        <Text style={styles.logText}>{logs}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  envContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 5,
    maxHeight: 150,
  },
  envScroll: {
    maxHeight: 120,
  },
  envText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#263238',
    borderRadius: 5,
    padding: 10,
  },
  logText: {
    color: '#eee',
    fontFamily: 'monospace',
    fontSize: 11,
  },
});

export default DebugLogScreen;
