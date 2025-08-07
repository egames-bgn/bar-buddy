import apiProxyService from './apiProxyService';

/**
 * Social Service
 * 
 * This service handles API calls related to social features like likes and comments
 */
class SocialService {
  private static instance: SocialService;

  private constructor() {}

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * Toggle like on a post
   * @param postId The ID of the post to like/unlike
   * @param userId The ID of the user performing the action
   * @returns Promise with like status (true = liked, false = unliked)
   */
  public async toggleLike(postId: number, userId: number): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('UserID', userId.toString());
      params.append('PostID', postId.toString());

      const response = await apiProxyService.post(`/barbuddies/likes/toggle/?${params.toString()}`);
      console.log('[DEBUG] SocialService - Toggle like response:', JSON.stringify(response));

      if (response && response.data) {
        // Return the like status (true = liked, false = unliked)
        return response.data.LikeStatus === 1;
      }
      return false;
    } catch (error: any) {
      console.error(`[SocialService] Toggle like failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get likes for a post
   * @param postId The ID of the post to get likes for
   * @param userId Optional user ID to check if the user has liked the post
   * @returns Promise with like data
   */
  public async getLikes(postId: number, userId?: number): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('PostID', postId.toString());
      if (userId) {
        params.append('UserID', userId.toString());
      }

      const response = await apiProxyService.get(`/barbuddies/likes/?${params.toString()}`);
      console.log('[DEBUG] SocialService - Get likes response:', JSON.stringify(response));

      if (response && response.data) {
        return response.data;
      }
      return { likeCount: 0, userHasLiked: false, users: [] };
    } catch (error: any) {
      console.error(`[SocialService] Get likes failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a comment to a post
   * @param postId The ID of the post to comment on
   * @param userId The ID of the user commenting
   * @param commentText The text of the comment
   * @returns Promise with the created comment data
   */
  public async addComment(postId: number, userId: number, commentText: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('UserID', userId.toString());
      params.append('PostID', postId.toString());
      
      const response = await apiProxyService.post(`/barbuddies/comments/?${params.toString()}`, {
        CommentText: commentText
      });
      console.log('[DEBUG] SocialService - Add comment response:', JSON.stringify(response));

      if (response && response.data) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      console.error(`[SocialService] Add comment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comments for a post
   * @param postId The ID of the post to get comments for
   * @param limit Optional limit for pagination
   * @param offset Optional offset for pagination
   * @returns Promise with comments data
   */
  public async getComments(postId: number, limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('PostID', postId.toString());
      params.append('Limit', limit.toString());
      params.append('Offset', offset.toString());

      const response = await apiProxyService.get(`/barbuddies/comments/?${params.toString()}`);
      console.log('[DEBUG] SocialService - Get comments response:', JSON.stringify(response));

      if (response && response.data) {
        return response.data;
      }
      return { comments: [], totalComments: 0 };
    } catch (error: any) {
      console.error(`[SocialService] Get comments failed: ${error.message}`);
      throw error;
    }
  }
}

export default SocialService.getInstance();
