import React, { useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { HomeContent } from '@/components/HomeContent';
import { getDisplayName } from '@/modules/common/utils/imageUtils';
import { Colors } from '@/constants/Colors';

// Global state cache for home screen
const getGlobalHomeState = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).__homeScreenState = (window as any).__homeScreenState || {};
};

export default function HomeScreen() {
  // Get user information from auth context
  const { state, logout } = useAuth();
  const pathname = usePathname();
  const isInitialRender = useRef(true);
  
  // Cache state for tab navigation persistence
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    // Update global state cache
    const globalState = getGlobalHomeState();
    if (globalState) {
      globalState.lastUpdated = Date.now();
    }
  }, []);
  
  // Handle tab focus events
  useFocusEffect(
    React.useCallback(() => {
      console.log('[HomeScreen] Tab focused');
      
      return () => {
        console.log('[HomeScreen] Tab unfocused');
      };
    }, [])
  );
  
  // Check for global user reference first (single source of truth)
  const globalUser = typeof window !== 'undefined' ? (window as any).__currentUser : null;
  
  // Use global user reference if available, otherwise fall back to state.user
  const user = globalUser || state.user;
  
  // Debug auth state and user sources
  console.log('[HomeScreen] Auth state:', {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    hasStateUser: !!state.user,
    hasGlobalUser: !!globalUser,
    usingGlobalUser: !!globalUser && globalUser !== state.user
  });
  
  if (globalUser && (!state.user || globalUser.id !== state.user.id)) {
    console.log('[HomeScreen] Using global user reference instead of state.user');
  }
  
  const userName = getDisplayName(user);
  const playerId = user?.player_id;
  
  console.log('[HomeScreen] User data:', {
    userName,
    playerId,
    displayName: user?.display_name,
    mobileDisplayName: user?.mobile_display_name
  });

  return (
    <ParallaxScrollView
      headerBackgroundColor={Colors.headerBackground}
      headerImage={
        <Image
          source={require('@/assets/images/BTLogo512.png')}
          style={styles.logo}
          contentFit="contain"
        />
      }>
      <HomeContent userId={playerId} userName={userName} />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  logo: {
    height: 178,
    width: 178,
    bottom: 0,
    position: 'absolute',
    left: '50%',
    marginLeft: -89, // Half of the width to center it
  },
});
