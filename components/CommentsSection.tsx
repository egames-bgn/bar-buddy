import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { Button, Divider } from 'react-native-paper';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { CommentItem, Comment } from './CommentItem';
import socialService from '@/modules/api-proxy/services/socialService';

// Define the props for the CommentsSection component
interface CommentsSectionProps {
  postId: number;
  userId: number;
  onClose?: () => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, userId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Fetch comments
  const fetchComments = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      setError(null);
      const currentOffset = reset ? 0 : offset;

      const response = await socialService.getComments(postId, limit, currentOffset);
      
      if (response) {
        if (reset) {
          setComments(response.comments || []);
        } else {
          setComments(prevComments => [...prevComments, ...(response.comments || [])]);
        }
        
        setTotalComments(response.totalComments || 0);
        setOffset(currentOffset + (response.comments?.length || 0));
      }
    } catch (err: any) {
      setError(`Failed to load comments: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postId, offset]);

  // Load comments on mount
  useEffect(() => {
    fetchComments(true);
  }, [fetchComments]);

  // Handle submitting a new comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      await socialService.addComment(postId, userId, commentText.trim());
      
      // Clear the input and refresh comments
      setCommentText('');
      fetchComments(true);
    } catch (err: any) {
      setError(`Failed to post comment: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle loading more comments
  const handleLoadMore = () => {
    if (loadingMore || comments.length >= totalComments) return;
    fetchComments();
  };

  // Render a comment item
  const renderCommentItem = ({ item }: { item: Comment }) => (
    <CommentItem comment={item} />
  );

  // Render the footer (loading indicator when loading more)
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <ThemedView style={styles.loadingMore}>
        <ActivityIndicator size="small" />
        <ThemedText style={styles.loadingText}>Loading more comments...</ThemedText>
      </ThemedView>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          No comments yet. Be the first to comment!
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Comments ({totalComments})</ThemedText>
        {onClose && (
          <Button icon="close" compact onPress={onClose}>Close</Button>
        )}
      </View>
      
      {error && (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      )}
      
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={comments}
          renderItem={renderCommentItem}
          keyExtractor={(item) => item.CommentID.toString()}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          style={styles.commentsList}
        />
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={1000}
          editable={!submitting}
        />
        <Button
          mode="contained"
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
          loading={submitting}
        >
          Post
        </Button>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsList: {
    flex: 1,
  },
  divider: {
    marginVertical: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  loader: {
    marginVertical: 20,
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
    textAlign: 'center',
    opacity: 0.7,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
});
