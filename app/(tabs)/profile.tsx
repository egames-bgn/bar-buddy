import { StyleSheet, Alert, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import AuthService from '@/modules/auth/services/authService';
import { getAvatarUrl } from '@/modules/common/utils/imageUtils';
import { Colors } from '@/constants/Colors';

// Format date to be more human-readable (remove time portion)
const formatDate = (dateString: string): string => {
  try {
    // Parse the date string
    const date = new Date(dateString);
    // Format as MM/DD/YYYY
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original if parsing fails
  }
};

// Format points to be more human-readable
const formatPoints = (points: number): string => {
  return points.toLocaleString();
};

export default function ProfileScreen() {
  const router = useRouter();
  const { state, logout } = useAuth();
  const user = state.user;
  
  // User information

  // Get user display name from profile
  const displayName = user?.display_name || user?.mobile_display_name || user?.displayName || 'User';
  
  // Get site information if available
  const siteId = user?.site_id;

  const handleLogout = async () => {
    try {
      console.log('[Profile] Logging out user using useAuth hook');
      await logout(); // Use the logout function from useAuth hook instead of direct service call
      // No need to navigate manually, the logout function will handle it
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
      console.error('[Profile] Logout error:', error);
    }
  };

  // Get player ID for avatar
  const playerId = user?.player_id;
  
  return (
    <ParallaxScrollView
      headerBackgroundColor={Colors.tint}
      headerImage={
        playerId ? (
          <Image
            source={{ uri: getAvatarUrl(playerId) || '' }}
            style={styles.avatar}
            contentFit="contain"
          />
        ) : (
          <IconSymbol
            size={178}
            color={Colors.white}
            name="person.fill"
            style={styles.avatar}
          />
        )
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Profile</ThemedText>
      </ThemedView>
      
      <ThemedText type="subtitle" style={styles.welcomeText}>
        Welcome, {displayName}!
      </ThemedText>

      <ThemedText style={styles.buzzTimeText}>
        Visit Buzztime.com to update you profile
      </ThemedText>

      <ThemedView style={styles.sectionContainer}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>User Information</ThemedText>
        
        <ThemedView style={styles.infoContainer}>
          <ThemedText type="defaultSemiBold">Email:</ThemedText>
          <ThemedText>{user?.email || 'Not available'}</ThemedText>
        </ThemedView>
        

        
        {siteId && (
          <ThemedView style={styles.infoContainer}>
            <ThemedText type="defaultSemiBold">Site ID:</ThemedText>
            <ThemedText>{siteId}</ThemedText>
          </ThemedView>
        )}
        
        {user?.birth_date && (
          <ThemedView style={styles.infoContainer}>
            <ThemedText type="defaultSemiBold">Birth Date:</ThemedText>
            <ThemedText>{formatDate(user.birth_date)}</ThemedText>
          </ThemedView>
        )}
        
        {user?.player_plus_points !== undefined && (
          <ThemedView style={styles.infoContainer}>
            <ThemedText type="defaultSemiBold">Player Plus Points:</ThemedText>
            <ThemedText>{formatPoints(user.player_plus_points)}</ThemedText>
          </ThemedView>
        )}
        

        
        <ThemedText 
          type="link" 
          style={styles.logoutLink}
          onPress={handleLogout}
        >
          logout
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    height: 178,
    width: 178,
    bottom: 0,
    position: 'absolute',
    left: '50%',
    marginLeft: -89, // Half of the width to center it
    backgroundColor: 'transparent',
  },

  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  welcomeText: {
    marginBottom: 8,
  },
  buzzTimeText: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  logoutLink: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.tint,
  },
  logoutText: {
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: Colors.tint,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});
