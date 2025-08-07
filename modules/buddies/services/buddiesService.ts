import apiProxy from '../../api-proxy/services/apiProxyService';
import AuthService from '../../auth/services/authService';

export interface Buddy {
  id: string;
  name: string;
  status: string;
  lastActive: string;
  avatarUrl?: string;
  location?: string;
}

export interface BuddyRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  receiverId: string;
  status: string;
  createdAt: string;
  message?: string;
}

export interface PaginationInfo {
  nextCursor?: string;
  totalCount?: number;
  hasMore?: boolean;
}

class BuddiesService {
  private static instance: BuddiesService;
  private lastGetCurrentBuddiesCall: number = 0;
  private throttleTimeMs: number = 2000; // 2 seconds throttle
  private pendingGetCurrentBuddiesPromise: Promise<{ buddies: Buddy[]; pagination: PaginationInfo }> | null = null;

  private constructor() {}

  public static getInstance(): BuddiesService {
    if (!BuddiesService.instance) {
      BuddiesService.instance = new BuddiesService();
    }
    return BuddiesService.instance;
  }

  /**
   * Get all buddies for the current user
   */
  public async getBuddies(options: { searchQuery?: string; nearbyOnly?: boolean; cursor?: string; limit?: number } = {}): Promise<{ buddies: Buddy[]; pagination: PaginationInfo }> {
    try {
      const { searchQuery, nearbyOnly, cursor, limit = 20 } = options;
      console.log('[Buddies Service] Fetching buddies with options:', options);
      
      // Use the new user_buddies endpoint to get current buddies
      const params: Record<string, string> = { 
        UserID: '123',  // Required parameter
        Limit: limit.toString() // Default limit
      };
      
      // Add optional parameters
      if (searchQuery) {
        params.SearchQuery = searchQuery;
      }
      
      if (nearbyOnly) {
        params.NearbyOnly = '1';
        params.MaxDistanceKm = '25'; // Default distance
      }
      
      if (cursor) {
        params.Cursor = cursor;
      }
      
      const response = await apiProxy.get('/barbuddies/user_buddies/', { params });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`[Buddies Service] Received data with ${response.data.length} items`);
        
        // Handle the expected format from Cheerios API
        // From the view code, we know the response is formatted as [users[], pagination[]]  
        if (response.data.length >= 1 && Array.isArray(response.data[0])) {
          const users = response.data[0];
          console.log(`[Buddies Service] Found ${users.length} buddies in the response`);
          
          // Extract pagination info if available
          let paginationInfo: PaginationInfo = {};
          if (response.data.length > 1 && Array.isArray(response.data[1]) && response.data[1].length > 0) {
            const paginationData = response.data[1][0];
            paginationInfo = {
              nextCursor: paginationData.nextCursor,
              totalCount: paginationData.totalCount,
              hasMore: !!paginationData.nextCursor
            };
          }
          
          const buddies = users.map((buddy: any) => ({
            id: buddy.id?.toString() || '',
            name: buddy.display_name || buddy.username || 'Unknown',
            status: buddy.status || 'Offline',
            lastActive: buddy.LastPlayDate || 'Unknown',
            avatarUrl: buddy.avatar_url || undefined,
            location: buddy.location || 'Unknown'
          }));
          
          return { 
            buddies, 
            pagination: paginationInfo 
          };
        } else {
          // Handle direct array format (fallback)
          console.log('[Buddies Service] Response format is not nested arrays, using direct mapping');
          const buddies = response.data.map((buddy: any) => ({
            id: buddy.id?.toString() || '',
            name: buddy.display_name || buddy.username || 'Unknown',
            status: buddy.status || 'Offline',
            lastActive: buddy.LastPlayDate || 'Unknown',
            avatarUrl: buddy.avatar_url || undefined,
            location: buddy.location || 'Unknown'
          }));
          
          return { 
            buddies, 
            pagination: { hasMore: false } 
          };
        }
      }
      
      console.warn('[Buddies Service] No buddies data received or invalid format');
      return { buddies: [], pagination: { hasMore: false } };
    } catch (error) {
      console.error('[Buddies Service] Error fetching buddies:', error);
      // Return empty array on error instead of using fake data
      return { buddies: [], pagination: { hasMore: false } };
    }
  }

  /**
   * Send a buddy request to another user
   * @param userId The ID of the user to send the buddy request to
   * @param currentUserId The ID of the current user sending the request
   */
  public async sendBuddyRequest(userId: string, currentUserId: string): Promise<boolean> {
    try {
      console.log(`[Buddies Service] Sending buddy request from user ${currentUserId} to user ${userId}`);
      
      // Use the BuddyRequestView API endpoint
      const response = await apiProxy.post('/barbuddies/buddy_request/', { 
        CurrentUserID: currentUserId,
        TargetUserID: userId 
      });
      
      console.log(`[Buddies Service] Buddy request response status: ${response.status}`);
      if (response.data) {
        console.log(`[Buddies Service] Buddy request response data:`, response.data);
      }
      
      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error('[Buddies Service] Error sending buddy request:', error);
      return false;
    }
  }
  
  /**
   * Get pending buddy requests for a user
   * @param userId The ID of the user to get buddy requests for
   * @param options Options for filtering and pagination
   */
  public async getPendingBuddyRequests(
    userId: string,
    options: {
      viewType?: 'ALL' | 'SENT' | 'RECEIVED';
      status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALL';
      cursor?: string;
      limit?: number;
    } = {}
  ): Promise<{ requests: BuddyRequest[]; pagination: PaginationInfo }> {
    try {
      console.log(`[Buddies Service] Getting buddy requests for user ${userId}`);
      
      const { cursor, limit = 20, viewType = 'RECEIVED', status = 'PENDING' } = options;
      
      // Use the BuddyRequestView API endpoint with GetRequests request type
      // Prepare parameters for the API call
      const requestData: Record<string, any> = {
        CurrentUserID: userId,
        RequestType: 'GetRequests',
        ViewType: viewType,
        Status: status,
        Limit: limit
      };

      // Add optional parameters
      if (cursor) {
        requestData.cursor = cursor;
      }

      // Send parameters directly in the request body, not nested in a params object
      const response = await apiProxy.post('/barbuddies/buddy_request/', requestData);
      
      console.log(`[Buddies Service] Buddy requests response status: ${response.status}`);
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch buddy requests: ${response.status}`);
      }
      
      // Extract buddy requests and pagination info from response
      const responseData = response.data || {};
      // Type assertion to help TypeScript understand the structure
      const typedResponseData = responseData as { requests?: BuddyRequest[], pagination?: PaginationInfo };
      const requests = typedResponseData.requests || [];
      const pagination = typedResponseData.pagination || {};
      
      console.log(`[Buddies Service] Received ${requests.length} buddy requests`);
      
      // Map the buddy requests to our BuddyRequest interface
      const mappedRequests: BuddyRequest[] = requests.map((request: any) => ({
        id: request.RequestID || request.id || request.requestId,
        senderId: request.SenderID || request.senderId,
        senderName: request.SenderName || request.senderName,
        senderAvatarUrl: request.SenderAvatarUrl || request.senderAvatarUrl,
        receiverId: request.ReceiverID || request.receiverId,
        status: request.Status || request.status,
        createdAt: request.RequestDate || request.createdAt,
        message: request.Message || request.message
      }));
      
      return {
        requests: mappedRequests,
        pagination: {
          nextCursor: pagination.nextCursor,
          hasMore: pagination.hasMore || false,
          totalCount: pagination.totalCount || 0
        }
      };
    } catch (error) {
      console.error('[Buddies Service] Error getting buddy requests:', error);
      return { requests: [], pagination: { nextCursor: undefined, hasMore: false, totalCount: 0 } };
    }
  }

  /**
   * Accept a buddy request
   * @param requestId The ID of the buddy request to accept
   * @param currentUserId The ID of the current user responding to the request
   * @param responseMessage Optional message to include with the response
   */
  public async acceptBuddyRequest(requestId: string, currentUserId: string, responseMessage?: string): Promise<boolean> {
    try {
      console.log(`[Buddies Service] Accepting buddy request ${requestId} by user ${currentUserId}`);
      
      // Use the BuddyRequestView API endpoint with RespondToRequest request type
      const response = await apiProxy.post('/barbuddies/buddy_request/', { 
        CurrentUserID: currentUserId,
        RequestType: 'RespondToRequest',
        RequestID: requestId,
        Action: 'ACCEPT',
        ResponseMessage: responseMessage || ''
      });
      
      console.log(`[Buddies Service] Accept buddy request response status: ${response.status}`);
      if (response.data) {
        console.log(`[Buddies Service] Accept buddy request response data:`, response.data);
      }
      
      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error('[Buddies Service] Error accepting buddy request:', error);
      return false;
    }
  }

  /**
   * Reject a buddy request
   * @param requestId The ID of the buddy request to reject
   * @param currentUserId The ID of the current user responding to the request
   * @param responseMessage Optional message to include with the response
   */
  public async rejectBuddyRequest(requestId: string, currentUserId: string, responseMessage?: string): Promise<boolean> {
    try {
      console.log(`[Buddies Service] Rejecting buddy request ${requestId} by user ${currentUserId}`);
      
      // Use the BuddyRequestView API endpoint with RespondToRequest request type
      const response = await apiProxy.post('/barbuddies/buddy_request/', { 
        CurrentUserID: currentUserId,
        RequestType: 'RespondToRequest',
        RequestID: requestId,
        Action: 'REJECT',
        ResponseMessage: responseMessage || ''
      });
      
      console.log(`[Buddies Service] Reject buddy request response status: ${response.status}`);
      if (response.data) {
        console.log(`[Buddies Service] Reject buddy request response data:`, response.data);
      }
      
      return response.status === 200;
    } catch (error) {
      console.error('[Buddies Service] Error rejecting buddy request:', error);
      return false;
    }
  }

  /**
   * Get potential buddies that the user can connect with
   */
  public async getPotentialBuddies(options: { searchQuery?: string; nearbyOnly?: boolean; cursor?: string; limit?: number } = {}): Promise<{ buddies: Buddy[]; pagination: PaginationInfo }> {
    try {
      const { searchQuery, nearbyOnly, cursor, limit = 20 } = options;
      console.log('[Buddies Service] Fetching potential buddies with options:', options);
      
      // Use the correct endpoint from the Cheerios service
      const params: Record<string, string> = { 
        CurrentUserID: '123',  // Required parameter
        Limit: limit.toString(), // Default limit
        PotentialOnly: '1' // This indicates we want potential buddies, not existing ones
      };
      
      // Add optional parameters
      if (searchQuery) {
        params.SearchQuery = searchQuery;
      }
      
      if (nearbyOnly) {
        params.NearbyOnly = '1';
        params.MaxDistanceKm = '25'; // Default distance
      }
      
      if (cursor) {
        params.Cursor = cursor;
      }
      
      const response = await apiProxy.get('/barbuddies/potential_buddies/', { params });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`[Buddies Service] Received potential buddies data with ${response.data.length} items`);
        
        // Handle the expected format from Cheerios API
        if (response.data.length >= 1 && Array.isArray(response.data[0])) {
          const users = response.data[0];
          console.log(`[Buddies Service] Found ${users.length} potential buddies in the response`);
          
          // Extract pagination info if available
          let paginationInfo: PaginationInfo = {};
          if (response.data.length > 1 && Array.isArray(response.data[1]) && response.data[1].length > 0) {
            const paginationData = response.data[1][0];
            paginationInfo = {
              nextCursor: paginationData.nextCursor,
              totalCount: paginationData.totalCount,
              hasMore: !!paginationData.nextCursor
            };
          }
          
          const buddies = users.map((buddy: any) => ({
            id: buddy.id?.toString() || '',
            name: buddy.display_name || buddy.username || 'Unknown',
            status: buddy.status || 'Offline',
            lastActive: buddy.LastPlayDate || 'Unknown',
            avatarUrl: buddy.avatar_url || undefined,
            location: buddy.location || 'Unknown'
          }));
          
          return { 
            buddies, 
            pagination: paginationInfo 
          };
        } else {
          // Handle direct array format (fallback)
          console.log('[Buddies Service] Response format is not nested arrays, using direct mapping');
          const buddies = response.data.map((buddy: any) => ({
            id: buddy.id?.toString() || '',
            name: buddy.display_name || buddy.username || 'Unknown',
            status: buddy.status || 'Offline',
            lastActive: buddy.LastPlayDate || 'Unknown',
            avatarUrl: buddy.avatar_url || undefined,
            location: buddy.location || 'Unknown'
          }));
          
          return { 
            buddies, 
            pagination: { hasMore: false } 
          };
        }
      }
      
      console.warn('[Buddies Service] No potential buddies data received or invalid format');
      return { buddies: [], pagination: { hasMore: false } };
    } catch (error) {
      console.error('[Buddies Service] Error fetching potential buddies:', error);
      // Return empty array on error instead of using fake data
      return { buddies: [], pagination: { hasMore: false } };
    }
  }

  /**
   * Get current buddies for the user
   * @param userId The ID of the user to get buddies for (defaults to current user from auth)
   * @param options Options for filtering and pagination
   */
  public async getCurrentBuddies(
    userId?: string,
    options: { 
      searchQuery?: string; 
      onlineOnly?: boolean; 
      cursor?: string; 
      limit?: number;
      forceRefresh?: boolean; 
    } = {}
  ): Promise<{ buddies: Buddy[]; pagination: PaginationInfo }> {
    const { forceRefresh = false } = options;
    
    // Log the call with options
    console.log(`[Buddies Service] getCurrentBuddies called with forceRefresh=${forceRefresh}`, options);
    
    // Implement throttling to prevent excessive API calls, but allow bypass with forceRefresh
    const now = Date.now();
    const timeSinceLastCall = now - this.lastGetCurrentBuddiesCall;
    
    // If we have a pending promise and we're within the throttle time, and not forcing refresh,
    // return the existing promise
    if (!forceRefresh && this.pendingGetCurrentBuddiesPromise && timeSinceLastCall < this.throttleTimeMs) {
      console.log(`[Buddies Service] Throttling getCurrentBuddies call. Last call was ${timeSinceLastCall}ms ago`);
      return this.pendingGetCurrentBuddiesPromise;
    }
    
    // Update the last call time
    this.lastGetCurrentBuddiesCall = now;
    
    // Create a new promise for this request
    this.pendingGetCurrentBuddiesPromise = this._fetchCurrentBuddies(userId, options);
    
    try {
      // Wait for the promise to resolve
      const result = await this.pendingGetCurrentBuddiesPromise;
      console.log(`[Buddies Service] getCurrentBuddies returned ${result.buddies.length} buddies`);
      return result;
    } catch (error) {
      console.error('[Buddies Service] Error in getCurrentBuddies:', error);
      // Return empty result on error to prevent retries
      return { buddies: [], pagination: { hasMore: false } };
    } finally {
      // Clear the pending promise after it resolves or rejects
      // If forceRefresh is true, clear immediately to allow subsequent calls
      const clearDelay = forceRefresh ? 0 : this.throttleTimeMs;
      setTimeout(() => {
        this.pendingGetCurrentBuddiesPromise = null;
      }, clearDelay);
    }
  }
  
  /**
   * Internal method to fetch current buddies
   * @param userId The ID of the user to get buddies for
   * @param options Options for filtering and pagination
   */
  private async _fetchCurrentBuddies(
    userId?: string,
    options: { searchQuery?: string; onlineOnly?: boolean; cursor?: string; limit?: number } = {}
  ): Promise<{ buddies: Buddy[]; pagination: PaginationInfo }> {
    try {
      const { searchQuery, onlineOnly, cursor, limit = 20 } = options;
      console.log('[Buddies Service] Fetching current buddies with options:', options);
      
      // Get current user ID from auth if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const currentUser = await AuthService.getCurrentUser();
        currentUserId = currentUser?.id;
        
        if (!currentUserId) {
          console.error('[Buddies Service] No user ID available for getCurrentBuddies');
          return { buddies: [], pagination: { hasMore: false } };
        }
      }
      
      console.log(`[Buddies Service] Fetching buddies for user ID: ${currentUserId}`);
      
      // Use the user_buddies endpoint to get current buddies with GET request only
      // The POST request was failing with 405 Method Not Allowed
      
      // Use the user_buddies endpoint to get current buddies with GET request
      // IMPORTANT: The backend expects 'UserID' with capital 'ID'
      const params: Record<string, string> = { 
        UserID: currentUserId,  // Use actual user ID with correct capitalization
        Limit: limit.toString() // Default limit
      };
      
      // Try with numeric UserID (no quotes) in case the backend expects a number
      if (currentUserId && !isNaN(Number(currentUserId))) {
        params.UserID = Number(currentUserId).toString();
      }
      
      // Add optional parameters
      if (searchQuery) {
        params.SearchQuery = searchQuery;
      }
      
      if (onlineOnly) {
        params.OnlineOnly = '1';
      }
      
      if (cursor) {
        params.Cursor = cursor;
      }
      
      console.log('[Buddies Service] Sending GET request with params:', params);
      const response = await apiProxy.get('/barbuddies/user_buddies/', { params });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`[Buddies Service] Received data with ${response.data.length} items`);
        
        // Handle the expected format from Cheerios API
        // From the view code, we know the response is formatted as [users[], pagination[]]  
        if (response.data.length >= 1 && Array.isArray(response.data[0])) {
          const users = response.data[0];
          console.log(`[Buddies Service] Found ${users.length} current buddies in the response`);
          
          // Extract pagination info if available
          let paginationInfo: PaginationInfo = {};
          if (response.data.length > 1 && Array.isArray(response.data[1]) && response.data[1].length > 0) {
            const paginationData = response.data[1][0];
            paginationInfo = {
              nextCursor: paginationData.nextCursor,
              totalCount: paginationData.totalCount,
              hasMore: !!paginationData.nextCursor
            };
          }
          
          const buddies = users.map((buddy: any) => ({
            id: buddy.id?.toString() || '',
            name: buddy.fullName || buddy.username || 'Unknown',
            status: buddy.isOnline ? 'Online' : 'Offline',
            lastActive: buddy.lastPlayDate || buddy.lastUpdated || 'Unknown',
            avatarUrl: buddy.avatarUrl || undefined,
            location: buddy.location || 'Unknown'
          }));
          
          return { 
            buddies, 
            pagination: paginationInfo 
          };
        } else {
          // Handle direct array format (fallback)
          console.log('[Buddies Service] Response format is not nested arrays, using direct mapping');
          const buddies = response.data.map((buddy: any) => ({
            id: buddy.id?.toString() || '',
            name: buddy.fullName || buddy.username || 'Unknown',
            status: buddy.isOnline ? 'Online' : 'Offline',
            lastActive: buddy.lastPlayDate || buddy.lastUpdated || 'Unknown',
            avatarUrl: buddy.avatarUrl || undefined,
            location: buddy.location || 'Unknown'
          }));
          
          return { 
            buddies, 
            pagination: { hasMore: false } 
          };
        }
      }
      
      console.warn('[Buddies Service] No current buddies data received or invalid format');
      return { buddies: [], pagination: { hasMore: false } };
    } catch (error) {
      console.error('[Buddies Service] Error fetching current buddies:', error);
      
      // If we get a 500 error, try one more approach - use a different endpoint
      try {
        console.log('[Buddies Service] Attempting to fetch buddies using potential_buddies endpoint as fallback');
        const fallbackResponse = await apiProxy.get('/barbuddies/potential_buddies/', {
          params: {
            UserID: userId,
            Limit: (options.limit || 20).toString(),
            ViewType: 'BUDDIES' // Try to get only existing buddies
          }
        });
        
        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          console.log(`[Buddies Service] Fallback request succeeded with ${fallbackResponse.data.length} items`);
          return this.processBuddiesResponse(fallbackResponse.data);
        }
      } catch (fallbackError) {
        console.error('[Buddies Service] Fallback request also failed:', fallbackError);
      }
      
      // Return empty array on error
      return { buddies: [], pagination: { hasMore: false } };
    }
  }
  
  /**
   * Helper method to process buddies response data
   * @param data The response data from the API
   */
  private processBuddiesResponse(data: any[]): { buddies: Buddy[]; pagination: PaginationInfo } {
    // Handle the expected format from Cheerios API
    // From the view code, we know the response is formatted as [users[], pagination[]]  
    if (data.length >= 1 && Array.isArray(data[0])) {
      const users = data[0];
      console.log(`[Buddies Service] Found ${users.length} current buddies in the response`);
      
      // Extract pagination info if available
      let paginationInfo: PaginationInfo = {};
      if (data.length > 1 && Array.isArray(data[1]) && data[1].length > 0) {
        const paginationData = data[1][0];
        paginationInfo = {
          nextCursor: paginationData.nextCursor,
          totalCount: paginationData.totalCount,
          hasMore: !!paginationData.nextCursor
        };
      }
      
      const buddies = users.map((buddy: any) => ({
        id: buddy.id?.toString() || '',
        name: buddy.fullName || buddy.username || buddy.display_name || 'Unknown',
        status: buddy.isOnline ? 'Online' : 'Offline',
        lastActive: buddy.lastPlayDate || buddy.lastUpdated || 'Unknown',
        avatarUrl: buddy.avatarUrl || buddy.avatar_url || undefined,
        location: buddy.location || 'Unknown'
      }));
      
      return { 
        buddies, 
        pagination: paginationInfo 
      };
    } else {
      // Handle direct array format (fallback)
      console.log('[Buddies Service] Response format is not nested arrays, using direct mapping');
      const buddies = data.map((buddy: any) => ({
        id: buddy.id?.toString() || '',
        name: buddy.fullName || buddy.username || buddy.display_name || 'Unknown',
        status: buddy.isOnline ? 'Online' : 'Offline',
        lastActive: buddy.lastPlayDate || buddy.lastUpdated || 'Unknown',
        avatarUrl: buddy.avatarUrl || buddy.avatar_url || undefined,
        location: buddy.location || 'Unknown'
      }));
      
      return { 
        buddies, 
        pagination: { hasMore: false } 
      };
    }
  }

  /**
   * Get pending buddy requests
   */
  public async getPendingRequests(): Promise<BuddyRequest[]> {
    try {
      console.log('[Buddies Service] Fetching pending buddy requests');
      // Based on the Cheerios API, we need to use the buddy_request endpoint with RequestType
      // Using proper case parameter names as expected by the backend API
      const response = await apiProxy.post('/barbuddies/buddy_request/', {
        CurrentUserID: '123',
        RequestType: 'GetRequests',
        ViewType: 'ALL',
        Status: 'PENDING',
        Limit: 20
      });
      
      console.log(`[Buddies Service] Pending requests response status: ${response.status}`);
      
      // Type assertion to handle the response data structure
      interface RequestsResponse {
        requests?: BuddyRequest[];
      }
      
      const responseData = response.data as RequestsResponse;
      
      if (responseData && responseData.requests && Array.isArray(responseData.requests)) {
        console.log(`[Buddies Service] Received ${responseData.requests.length} pending requests`);
        return responseData.requests;
      } else if (response.data && Array.isArray(response.data)) {
        console.log(`[Buddies Service] Received ${response.data.length} pending requests (array format)`);
        return response.data as BuddyRequest[];
      }
      
      console.warn('[Buddies Service] No pending requests data received or invalid format');
      return [];
    } catch (error) {
      console.error('[Buddies Service] Error fetching pending requests:', error);
      return [];
    }
  }
}

export default BuddiesService.getInstance();
