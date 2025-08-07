import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '@/modules/auth/hooks/useAuth';

interface WelcomePageProps {
  userName: string;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ userName }) => {
  const { logout } = useAuth();
  
  // Get user information from global state if available
  const globalUser = typeof window !== 'undefined' ? (window as any).__currentUser : null;
  const playerId = globalUser?.player_id;

  return (
    <>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome {userName},</ThemedText>
        <UserAvatar 
          playerId={playerId} 
          size={40} 
          showFallbackEmoji={true}
          fallbackEmoji="👋"
          style={styles.avatar}
        />
      </ThemedView>
      <ThemedView style={styles.welcomeMessage}>
        <ThemedText type="subtitle">Your direct connection to the Buzztime Game Network.</ThemedText>
      </ThemedView>
      <ThemedView style={styles.descriptionContainer}>
        <ThemedText>
          Stay in the loop with real-time notifications when your buddies are playing, get updates on events and player standings, and share your Buzztime gaming moments at your favorite venues.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepsContainer}>
        <ThemedText type="subtitle">Getting Started</ThemedText>
        
        <ThemedView style={styles.stepItem}>
          <ThemedText type="defaultSemiBold">Step 1: Connect with Buddies</ThemedText>
          <ThemedText>
            Tap the Buddies tab to find and connect with other Buzztime players at your favorite venues.
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.stepItem}>
          <ThemedText type="defaultSemiBold">Step 2: Share Your Moments</ThemedText>
          <ThemedText>
            Tap the Share tab to post pictures and updates about your Buzztime gaming experiences.
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.stepItem}>
          <ThemedText type="defaultSemiBold">Step 3: Stay Connected</ThemedText>
          <ThemedText>
            Return to the Home tab for updates, notifications, and to see what your buddies are up to.
          </ThemedText>
        </ThemedView>
      </ThemedView>
      
      <ThemedView style={styles.logoutContainer}>
        <Button 
          mode="text" 
          icon="logout" 
          onPress={logout}
          textColor="#666"
        >
          Logout
        </Button>
      </ThemedView>
    </>
  );
};

const styles = StyleSheet.create({
  logoutContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  stepsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  stepItem: {
    marginBottom: 16,
    gap: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeMessage: {
    marginTop: 8,
    marginBottom: 16,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A1CEDC',
  },
});
