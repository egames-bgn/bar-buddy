import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Simple tab icon component
const TabIcon = ({ name, color }: { name: string; color: string }) => {
  const icons: { [key: string]: string } = {
    home: '🏠',
    profile: '👤',
    buddies: '👥',
    share: '📷',
  };
  
  return (
    <Text style={{ fontSize: 20, color }}>
      {icons[name] || '?'}
    </Text>
  );
};

// Define styles for the tab layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarStyle: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.divider,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 80 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
    paddingTop: 5,
  },
  androidTabBarStyle: {
    height: 70,
    paddingBottom: 15,
    marginBottom: Platform.OS === 'android' ? 48 : 0, // Add margin for Android navigation bar
  }
});

export default function TabLayout() {
  console.log('[TabLayout] Rendering tab layout');
  
  // Calculate navigation bar height (approximate)
  const navBarHeight = Platform.OS === 'android' ? 48 : 0;
  
  return (
    <SafeAreaProvider>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tint,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBarStyle,
          ...(Platform.OS === 'android' ? styles.androidTabBarStyle : {}),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: -3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: 'Buddies',
          tabBarIcon: ({ color }) => <TabIcon name="buddies" color={color} />,
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: 'Share',
          tabBarIcon: ({ color }) => <TabIcon name="share" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
    </SafeAreaProvider>
  );
}
