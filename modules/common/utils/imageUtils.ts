/**
 * Image Utilities
 * Handles avatar images and other image-related functionality
 */

// Base URL for avatar images
const AVATAR_BASE_URL = 'https://dev.buzztime.com/images/avatardrop/png';

// Default avatar URL to use when a user doesn't have an avatar
const DEFAULT_AVATAR_URL = 'https://dev.buzztime.com/images/avatardrop/png/default.png';

/**
 * Get avatar URL for a player/user
 * @param playerId - The player ID
 * @param useDefault - Whether to return default avatar if player has no avatar
 * @returns URL to the player's avatar image or default avatar
 */
export const getAvatarUrl = (
  playerId?: string | number | null,
  useDefault: boolean = true
): string | null => {
  if (!playerId) {
    return useDefault ? DEFAULT_AVATAR_URL : null;
  }
  
  // Construct the avatar URL
  return `${AVATAR_BASE_URL}/${playerId}.png`;
};

/**
 * Get display name from user profile
 * Prioritizes mobile_display_name, then display_name
 * @param user - User profile object
 * @param defaultName - Default name to return if no display name is found
 * @returns The appropriate display name
 */
export const getDisplayName = (
  user: any,
  defaultName: string = 'Guest'
): string => {
  if (!user) return defaultName;
  
  // Priority: mobile_display_name > display_name > displayName > name > default
  return user.mobile_display_name || 
         user.display_name || 
         user.displayName || 
         user.name || 
         defaultName;
};
