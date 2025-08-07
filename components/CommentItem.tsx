import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { ThemedText } from './ThemedText';
import { UserAvatar } from './UserAvatar';

// Define the comment interface
export interface Comment {
  CommentID: number;
  PostID: number;
  UserID: number;
  Username: string;
  CommentText: string;
  CreatedDate: string;
  Status: string;
}

// Define the props for the CommentItem component
interface CommentItemProps {
  comment: Comment;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  // Format the time ago string
  const timeAgo = formatDistanceToNow(new Date(comment.CreatedDate), { addSuffix: true });

  return (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <UserAvatar playerId={comment.UserID} size={32} />
        <View style={styles.commentHeaderText}>
          <ThemedText type="subtitle" style={styles.username}>
            {comment.Username}
          </ThemedText>
          <ThemedText type="small" style={styles.timeAgo}>
            {timeAgo}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.commentText}>
        {comment.CommentText}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentHeaderText: {
    marginLeft: 8,
    flex: 1,
  },
  username: {
    fontSize: 14,
  },
  timeAgo: {
    opacity: 0.7,
    fontSize: 12,
  },
  commentText: {
    marginLeft: 40, // Align with the username text
    fontSize: 14,
  },
});
