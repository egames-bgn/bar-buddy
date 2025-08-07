import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, RefreshControl, View, Modal, TouchableOpacity } from 'react-native';
import { Card, Button, Divider, Badge } from 'react-native-paper';
import { Image } from 'expo-image';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { UserAvatar } from './UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import apiProxyService from '@/modules/api-proxy/services/apiProxyService';
import socialService from '@/modules/api-proxy/services/socialService';
import { CommentsSection } from './CommentsSection';

// Define the story interface
interface Story {
  PostID: number;
  UserID: number;
  Username: string;
  PostType: string;
  PostContent: string;
  LocationID: string;
  LocationName: string;
  IsLocationHidden: boolean;
  PhotoURL: string | null;
  CreatedDate: string;
  ModifiedDate: string | null;
  Status: string;
  // Added for likes functionality
  likeCount?: number;
  userHasLiked?: boolean;
}

// Define the pagination interface
interface Pagination {
  nextCursor: string | null;
  hasMore: boolean;
}

// Define the props for the UserStories component
interface UserStoriesProps {
  userId: number;
}

export const UserStories: React.FC<UserStoriesProps> = ({ userId }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ nextCursor: null, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [likesLoading, setLikesLoading] = useState<{[key: number]: boolean}>({});

  // Function to load likes for stories
  const loadLikesForStories = useCallback(async (storyList: Story[]) => {
    try {
      const storiesWithLikes = await Promise.all(
        storyList.map(async (story) => {
          try {
            const likeData = await socialService.getLikes(story.PostID, userId);
            return {
              ...story,
              likeCount: likeData.likeCount || 0,
              userHasLiked: likeData.userHasLiked || false
            };
          } catch (error) {
            console.error(`[UserStories] Error loading likes for post ${story.PostID}:`, error);
            return {
              ...story,
              likeCount: 0,
              userHasLiked: false
            };
          }
        })
      );
      return storiesWithLikes;
    } catch (error) {
      console.error('[UserStories] Error loading likes:', error);
      return storyList;
    }
  }, [userId]);

  // Function to fetch stories
  const fetchStories = useCallback(async (cursor: string | null = null, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (!cursor) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      // Build the query parameters
      const params = new URLSearchParams();
      params.append('UserID', userId.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }
      params.append('limit', '10');

      // Make the API request
      const response = await apiProxyService.get(`/barbuddies/stories/?${params.toString()}`);
      console.log('[DEBUG] UserStories - API response:', JSON.stringify(response));

      if (response && response.data) {
        let newStories: Story[] = [];
        let paginationData: Pagination = { nextCursor: null, hasMore: false };
        
        // Handle both response formats
        const responseData = response.data;
        console.log('[DEBUG] UserStories - Response data:', JSON.stringify(responseData));
        
        if (Array.isArray(responseData)) {
          // Array format: [stories[], pagination[]]
          // Extract stories from the first element of the array
          newStories = Array.isArray(responseData) && responseData.length > 0 ? responseData[0] : [];
          console.log('[DEBUG] UserStories - Stories from array format:', JSON.stringify(newStories));
          
          // Extract pagination from the second element of the array
          if (Array.isArray(responseData) && responseData.length > 1 && 
              Array.isArray(responseData[1]) && responseData[1].length > 0) {
            paginationData = {
              nextCursor: responseData[1][0].nextCursor,
              hasMore: responseData[1][0].hasMore
            };
          }
        } else {
          // Object format: { stories: [], pagination: {} }
          newStories = (responseData as any).stories || [];
          console.log('[DEBUG] UserStories - Stories from object format:', JSON.stringify(newStories));
          
          if ((responseData as any).pagination) {
            paginationData = {
              nextCursor: (responseData as any).pagination.nextCursor,
              hasMore: (responseData as any).pagination.hasMore
            };
          }
        }
        
        console.log('[DEBUG] UserStories - Extracted stories:', JSON.stringify(newStories));
        console.log('[DEBUG] UserStories - Pagination:', JSON.stringify(paginationData));
        
        if (refresh || !cursor) {
          // Replace all stories if refreshing or initial load
          const storiesWithLikes = await loadLikesForStories(newStories);
          setStories(storiesWithLikes);
        } else {
          // Append new stories if loading more
          const storiesWithLikes = await loadLikesForStories(newStories);
          setStories(prev => [...prev, ...storiesWithLikes]);
        }
        
        setPagination(paginationData);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Failed to load stories. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userId]);

  // Initial load of stories
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Handle refresh
  const handleRefresh = () => {
    fetchStories(null, true);
  };
  
  // Handle like button press
  const handleLike = async (postId: number) => {
    try {
      // Set loading state for this specific post
      setLikesLoading(prev => ({ ...prev, [postId]: true }));
      
      // Toggle the like status
      const isLiked = await socialService.toggleLike(postId, userId);
      
      // Update the stories array with the new like status
      setStories(prevStories => 
        prevStories.map(story => {
          if (story.PostID === postId) {
            const currentLikeCount = story.likeCount || 0;
            const newLikeCount = isLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1);
            
            return {
              ...story,
              likeCount: newLikeCount,
              userHasLiked: isLiked
            };
          }
          return story;
        })
      );
    } catch (error) {
      console.error(`[UserStories] Error toggling like for post ${postId}:`, error);
    } finally {
      // Clear loading state for this post
      setLikesLoading(prev => ({ ...prev, [postId]: false }));
    }
  };
  
  // Handle comment button press
  const handleComment = (postId: number) => {
    setActiveCommentPostId(postId);
  };
  
  // Close comments modal
  const closeComments = () => {
    setActiveCommentPostId(null);
  };

  // Handle loading more stories
  const handleLoadMore = () => {
    if (pagination.hasMore && pagination.nextCursor && !loadingMore) {
      fetchStories(pagination.nextCursor);
    }
  };

  // Render a story item
  const renderStoryItem = ({ item }: { item: Story }) => {
    const timeAgo = formatDistanceToNow(new Date(item.CreatedDate), { addSuffix: true });
    const isLiked = item.userHasLiked || false;
    const likeCount = item.likeCount || 0;
    const isLikeLoading = likesLoading[item.PostID] || false;
    
    return (
      <Card style={styles.storyCard}>
        <Card.Content>
          <View style={styles.storyHeader}>
            <UserAvatar playerId={item.UserID} size={40} />
            <View style={styles.storyHeaderText}>
              <ThemedText type="subtitle">{item.Username}</ThemedText>
              <ThemedText type="small" style={styles.timeAgo}>{timeAgo}</ThemedText>
            </View>
          </View>
          
          {!item.IsLocationHidden && item.LocationName && (
            <ThemedText type="small" style={styles.location}>
              at {item.LocationName}
            </ThemedText>
          )}
          
          <ThemedText style={styles.content}>{item.PostContent}</ThemedText>
          
          {item.PhotoURL && (
            <Image
              source={{ uri: item.PhotoURL }}
              style={styles.storyImage}
              contentFit="cover"
            />
          )}
        </Card.Content>
        <Card.Actions>
          <View style={styles.actionContainer}>
            <Button 
              icon={isLiked ? "thumb-up" : "thumb-up-outline"} 
              mode={isLiked ? "contained" : "text"}
              compact={true} 
              loading={isLikeLoading}
              onPress={() => handleLike(item.PostID)}
              style={styles.actionButton}
            >
              {likeCount > 0 ? likeCount.toString() : ""}
            </Button>
            
            <Button 
              icon="comment-outline" 
              onPress={() => handleComment(item.PostID)}
              style={styles.actionButton}
            >
              Comment
            </Button>
          </View>
        </Card.Actions>
      </Card>
    );
  };

  // Render the footer (loading indicator when loading more)
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <ThemedView style={styles.loadingMore}>
        <ActivityIndicator size="small" />
        <ThemedText style={styles.loadingText}>Loading more stories...</ThemedText>
      </ThemedView>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText type="subtitle" style={styles.emptyText}>
          No stories to display
        </ThemedText>
        <ThemedText>
          Connect with more buddies or create your own posts to see stories here.
        </ThemedText>
      </ThemedView>
    );
  };

  // Render error state
  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="subtitle" style={styles.errorText}>
          {error}
        </ThemedText>
        <Button mode="contained" onPress={handleRefresh}>
          Try Again
        </Button>
      </ThemedView>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading stories...</ThemedText>
      </ThemedView>
    );
  }

  // Render the list of stories
  return (
    <>
      <FlatList
        data={stories}
        renderItem={renderStoryItem}
        keyExtractor={(item) => item.PostID.toString()}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />
      
      {/* Comments Modal */}
      <Modal
        visible={activeCommentPostId !== null}
        animationType="slide"
        onRequestClose={closeComments}
      >
        {activeCommentPostId !== null && (
          <CommentsSection 
            postId={activeCommentPostId} 
            userId={userId} 
            onClose={closeComments} 
          />
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 6, // Reduced from 16
    paddingBottom: 30, // Reduced from 80
  },
  storyCard: {
    marginBottom: 6, // Reduced from 16
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyHeaderText: {
    marginLeft: 8,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  timeAgo: {
    opacity: 0.7,
  },
  location: {
    marginBottom: 8,
    opacity: 0.7,
  },
  content: {
    marginBottom: 12,
  },
  storyImage: {
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  divider: {
    marginVertical: 3, // Reduced from 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 8,
  },
  likeCount: {
    marginLeft: 4,
    fontSize: 12,
  },
  commentCount: {
    marginLeft: 4,
    fontSize: 12,
  },
});
