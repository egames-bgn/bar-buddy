import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { UserStories } from './UserStories';
import apiProxyService from '@/modules/api-proxy/services/apiProxyService';
import { WelcomePage } from '@/components/WelcomePage';

interface HomeContentProps {
  userId: number;
  userName: string;
}

export const HomeContent: React.FC<HomeContentProps> = ({ userId, userName }) => {
  const [hasBuddies, setHasBuddies] = useState<boolean>(false);
  const [hasStories, setHasStories] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Define the expected response structures
        interface BuddiesResponse {
          buddies?: Array<any>;
        }
        
        interface StoriesResponse {
          stories?: Array<any>;
        }
        
        // Check if user has buddies
        console.log('[DEBUG] Requesting buddies with URL:', `/barbuddies/user_buddies/?UserID=${userId}`);
        const buddiesResponse = await apiProxyService.get(`/barbuddies/user_buddies/?UserID=${userId}`);
        console.log('[DEBUG] Buddies API response:', JSON.stringify(buddiesResponse));
        
        // The API returns an array with two elements:
        // - First element is an array of buddy objects
        // - Second element is an array with pagination info
        const responseData = buddiesResponse?.data;
        console.log('[DEBUG] Buddies data:', JSON.stringify(responseData));
        
        // Check if the first element of the array exists and has items
        const buddiesList = Array.isArray(responseData) && responseData.length > 0 ? responseData[0] : [];
        console.log('[DEBUG] Buddies list:', JSON.stringify(buddiesList));
        
        const hasBuddies = Array.isArray(buddiesList) && buddiesList.length > 0;
        console.log('[DEBUG] Has buddies:', hasBuddies);
        setHasBuddies(hasBuddies);

        // Always fetch stories (for testing purposes)
        try {
          console.log(`[DEBUG] Requesting stories with URL: /barbuddies/stories/?UserID=${userId}`);
          const storiesResponse = await apiProxyService.get(`/barbuddies/stories/?UserID=${userId}`);
          console.log('[DEBUG] Stories API raw response:', JSON.stringify(storiesResponse));
          
          // Handle both response formats
          const responseData = storiesResponse?.data;
          console.log('[DEBUG] Stories response data:', JSON.stringify(responseData));
          
          let storiesList = [];
          
          if (Array.isArray(responseData)) {
            // Array format: [stories[], pagination[]]
            storiesList = responseData.length > 0 ? responseData[0] : [];
            console.log('[DEBUG] Stories list (array format):', JSON.stringify(storiesList));
          } else if (responseData && typeof responseData === 'object') {
            // Object format: { stories: [], pagination: {} }
            storiesList = responseData.stories || [];
            console.log('[DEBUG] Stories list (object format):', JSON.stringify(storiesList));
          }
          
          const hasStories = Array.isArray(storiesList) && storiesList.length > 0;
          console.log('[DEBUG] Has stories:', hasStories);
          setHasStories(hasStories);
        } catch (error) {
          console.error('Error fetching stories:', error);
          setHasStories(false);
        }
      } catch (err) {
        console.error('Error checking user status:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      checkUserStatus();
    }
  }, [userId]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading your content...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="subtitle" style={styles.errorText}>
          {error}
        </ThemedText>
      </ThemedView>
    );
  }

  // Show stories if stories are available
  // Otherwise show the welcome page
  if (hasStories) {
    return <UserStories userId={userId} />;
  } else {
    return <WelcomePage userName={userName} />;
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
  },
});
