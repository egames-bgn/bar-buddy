import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './ThemedText';
import { getAvatarUrl } from '@/modules/common/utils/imageUtils';

interface UserAvatarProps {
  playerId?: string | number | null;
  size?: number;
  showFallbackEmoji?: boolean;
  fallbackEmoji?: string;
  style?: any;
}

/**
 * UserAvatar component that displays a user's avatar
 * Falls back to emoji or nothing if no avatar exists
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  playerId,
  size = 40,
  showFallbackEmoji = true,
  fallbackEmoji = '👋',
  style,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    if (playerId) {
      const url = getAvatarUrl(playerId, false);
      setAvatarUrl(url);
      setImageLoaded(false);
      setImageError(false);
    } else {
      setAvatarUrl(null);
      setImageLoaded(false);
      setImageError(true);
    }
  }, [playerId]);

  const containerStyle = {
    ...styles.container,
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  };

  const renderFallback = () => {
    if (!showFallbackEmoji) return null;
    
    return (
      <View style={containerStyle}>
        <ThemedText style={styles.emoji}>{fallbackEmoji}</ThemedText>
      </View>
    );
  };

  if (!avatarUrl || imageError) {
    return renderFallback();
  }

  return (
    <Image
      source={{ uri: avatarUrl }}
      style={containerStyle}
      contentFit="cover"
      transition={300}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageError(true)}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#A1CEDC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 18,
    textAlign: 'center',
  },
});
