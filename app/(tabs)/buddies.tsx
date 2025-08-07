import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Text, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import buddiesService, { Buddy, BuddyRequest, PaginationInfo } from '../../modules/buddies/services/buddiesService';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';


// Global state cache for buddies screen
const getGlobalBuddiesState = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).__buddiesScreenState = (window as any).__buddiesScreenState || {};
};

export default function BuddiesScreen() {
  const { state } = useAuth();
  const isAuthenticated = state.isAuthenticated;
  const pathname = usePathname();
  
  // Reference to track if this is the initial render
  const isInitialRender = useRef(true);
  
  // Get cached state if available
  const cachedState = getGlobalBuddiesState();
  
  // State for buddies list and pagination
  const [buddies, setBuddies] = useState<Buddy[]>(cachedState?.buddies || []);
  const [loading, setLoading] = useState<boolean>(isInitialRender.current);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>(cachedState?.activeTab || 'all');
  const [pendingRequests, setPendingRequests] = useState<BuddyRequest[]>(cachedState?.pendingRequests || []);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [nearbyOnly, setNearbyOnly] = useState<boolean>(false);
  
  // State for pagination
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // State for UI feedback
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  
  // Track user IDs that have already been sent buddy requests
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // State for potential buddies modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [potentialBuddies, setPotentialBuddies] = useState<Buddy[]>([]);
  const [loadingPotentialBuddies, setLoadingPotentialBuddies] = useState<boolean>(false);
  const [potentialBuddiesError, setPotentialBuddiesError] = useState<string | null>(null);
  const [potentialBuddiesSearchQuery, setPotentialBuddiesSearchQuery] = useState<string>('');
  const [debouncedPotentialBuddiesQuery, setDebouncedPotentialBuddiesQuery] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  
  // Debounce potential buddies search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPotentialBuddiesQuery(potentialBuddiesSearchQuery);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [potentialBuddiesSearchQuery]);
  
  // Fetch potential buddies when search query changes
  useEffect(() => {
    if (modalVisible) {
      fetchPotentialBuddies();
    }
  }, [debouncedPotentialBuddiesQuery]);
  
  // Track if we've already tried to fetch buddies with no results
  const [noResultsFound, setNoResultsFound] = useState<boolean>(false);
  
  // Reset and load buddies when search query or nearby filter changes
  useEffect(() => {
    console.log('Search query or filter changed - resetting state');
    setBuddies([]);
    setNextCursor(undefined);
    setHasMore(true);
    setNoResultsFound(false); // Reset no results flag on filter change
    
    // Add a small delay before fetching to prevent rapid consecutive calls
    const timer = setTimeout(() => {
      fetchBuddies(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [debouncedQuery, nearbyOnly]);
  
  // Effect to handle tab changes and refresh buddies list when needed
  useEffect(() => {
    // When switching to the All Buddies tab, check if we need to refresh
    if (activeTab === 'all') {
      // Get the global state to check if we've recently accepted a buddy request
      const globalState = getGlobalBuddiesState();
      const lastAcceptedAt = globalState?.lastAcceptedAt || 0;
      
      // If we've accepted a buddy request in the last 5 seconds, refresh the list
      if (Date.now() - lastAcceptedAt < 5000) {
        console.log('[BuddiesScreen] Recently accepted buddy request detected, refreshing buddies list');
        setNoResultsFound(false);
        fetchBuddies(true);
        
        // Reset the timestamp to prevent multiple refreshes
        if (globalState) globalState.lastAcceptedAt = 0;
      }
    }
  }, [activeTab]);

  // Cache state for tab navigation persistence
  useEffect(() => {
    // Skip first render to avoid overriding cached state
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    // Update global state cache
    const globalState = getGlobalBuddiesState();
    if (globalState) {
      globalState.buddies = buddies;
      globalState.activeTab = activeTab;
      globalState.pendingRequests = pendingRequests;
      globalState.lastUpdated = Date.now();
    }
  }, [buddies, activeTab, pendingRequests]);
  
  // Initial data load
  useEffect(() => {
    // If we have cached data and it's recent (less than 5 minutes old), don't refetch
    const cachedState = getGlobalBuddiesState();
    const isCacheValid = cachedState?.lastUpdated && 
      (Date.now() - cachedState.lastUpdated < 5 * 60 * 1000) && 
      cachedState.buddies?.length > 0;
    
    if (isAuthenticated && !isCacheValid) {
      console.log('[BuddiesScreen] No valid cache, fetching fresh data');
      fetchBuddies(true);
      fetchPendingRequests();
    } else if (isCacheValid) {
      console.log('[BuddiesScreen] Using cached data from', new Date(cachedState.lastUpdated));
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // Reference to track the last time we focused this screen
  const lastFocusTimeRef = useRef<number>(0);
  
  // Reference to track the last time we fetched pending requests
  const lastPendingRequestsFetchRef = useRef<number>(0);
  const FETCH_DEBOUNCE_TIME = 500; // 500ms debounce time
  
  // Handle tab focus events
  useFocusEffect(
    useCallback(() => {
      console.log('[BuddiesScreen] Tab focused');
      const now = Date.now();
      
      // Check if we're returning from another screen (more than 1 second since last focus)
      const isReturningFromAnotherScreen = now - lastFocusTimeRef.current > 1000;
      console.log(`[BuddiesScreen] Time since last focus: ${now - lastFocusTimeRef.current}ms`);
      
      // Update the last focus time
      lastFocusTimeRef.current = now;
      
      // Only fetch pending requests if enough time has passed since the last fetch
      if (isAuthenticated && activeTab === 'requests') {
        const timeSinceLastFetch = now - lastPendingRequestsFetchRef.current;
        if (timeSinceLastFetch > FETCH_DEBOUNCE_TIME) {
          console.log(`[BuddiesScreen] Refreshing pending requests on focus (${timeSinceLastFetch}ms since last fetch)`);
          fetchPendingRequests();
          lastPendingRequestsFetchRef.current = now;
        } else {
          console.log(`[BuddiesScreen] Skipping fetch, only ${timeSinceLastFetch}ms since last fetch (debounce: ${FETCH_DEBOUNCE_TIME}ms)`);
        }
      }
      
      // If we have no data but we're authenticated, fetch it
      if (isAuthenticated && buddies.length === 0 && !loading && !noResultsFound) {
        console.log('[BuddiesScreen] Tab focused with no data, fetching');
        fetchBuddies(true);
      }
      // If we're returning from another screen and on the All Buddies tab, refresh the list
      // This handles the case where a buddy request was accepted while we were away
      else if (isAuthenticated && isReturningFromAnotherScreen && activeTab === 'all' && !loading) {
        console.log('[BuddiesScreen] Returning from another screen, refreshing buddies list');
        setNoResultsFound(false); // Reset this flag to ensure we can fetch
        fetchBuddies(true);
      }
      
      return () => {
        console.log('[BuddiesScreen] Tab unfocused');
      };
    }, [isAuthenticated, buddies.length, loading, noResultsFound, activeTab])
  );

  // Function to fetch potential buddies
  const fetchPotentialBuddies = async () => {
    try {
      setLoadingPotentialBuddies(true);
      setPotentialBuddiesError(null);
      
      const result = await buddiesService.getPotentialBuddies({
        limit: 20,
        searchQuery: debouncedPotentialBuddiesQuery
      });
      
      console.log('[BuddiesScreen] Fetched potential buddies:', result);
      setPotentialBuddies(result.buddies);
    } catch (error) {
      console.error('[BuddiesScreen] Error fetching potential buddies:', error);
      setPotentialBuddiesError('Failed to load potential buddies');
    } finally {
      setLoadingPotentialBuddies(false);
    }
  };

  // Track if a fetch is in progress to prevent duplicate calls
  const isFetchingRef = useRef(false);
  
  // Function to fetch buddies from API
  const fetchBuddies = async (refresh: boolean = false) => {
    // Prevent multiple simultaneous fetch calls
    if (isFetchingRef.current || (loading && !refresh)) {
      console.log('[BuddiesScreen] Fetch already in progress, skipping');
      return;
    }
    
    // If we've already tried to fetch buddies and got no results, don't try again
    // unless it's a manual refresh or filter change (which resets noResultsFound)
    if (noResultsFound && !refresh && !nextCursor) {
      console.log('[BuddiesScreen] No results found previously, skipping fetch');
      return;
    }
    
    // Check if we have a recently accepted buddy request
    const globalState = getGlobalBuddiesState();
    const recentlyAcceptedBuddy = globalState?.lastAcceptedBuddyId;
    const lastAcceptedAt = globalState?.lastAcceptedAt || 0;
    const isRecentAcceptance = Date.now() - lastAcceptedAt < 10000; // Within last 10 seconds
    
    if (recentlyAcceptedBuddy && isRecentAcceptance) {
      console.log(`[BuddiesScreen] Recently accepted buddy detected: ${recentlyAcceptedBuddy}, will force refresh`);
    }
    
    try {
      console.log(`[BuddiesScreen] Starting buddy fetch, refresh=${refresh}, activeTab=${activeTab}`);
      isFetchingRef.current = true;
      
      if (refresh) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Prepare options for the API call
      const options: {
        searchQuery?: string;
        nearbyOnly?: boolean;
        onlineOnly?: boolean;
        cursor?: string;
        limit?: number;
        forceRefresh?: boolean;
      } = {
        searchQuery: debouncedQuery,
        limit: 20,
        forceRefresh: refresh // Set forceRefresh based on the refresh parameter
      };
      
      // Only include cursor for pagination (not on refresh)
      if (!refresh && nextCursor) {
        options.cursor = nextCursor;
      }
      
      // Set nearbyOnly filter if enabled
      if (nearbyOnly) {
        options.nearbyOnly = true;
      }
      
      console.log('[BuddiesScreen] Fetching buddies with options:', options);
      
      // Use the appropriate service method based on the active tab
      let result;
      // Note: activeTab is defined as 'all' | 'requests' type, so we need to check for 'all' only
      if (activeTab === 'all') {
        // Use the new getCurrentBuddies method for the All Buddies tab with current user ID
        const currentUserId = state.user?.id;
        console.log(`[BuddiesScreen] Using current user ID for buddies: ${currentUserId}`);
        
        // Check if we need to force refresh (e.g., after accepting a buddy request)
        const globalState = getGlobalBuddiesState();
        const recentlyAcceptedBuddy = globalState?.lastAcceptedBuddyId;
        const lastAcceptedAt = globalState?.lastAcceptedAt || 0;
        const isRecentAcceptance = Date.now() - lastAcceptedAt < 10000; // Within last 10 seconds
        
        // Add forceRefresh option if we're doing a refresh or if we recently accepted a buddy
        if (refresh || (recentlyAcceptedBuddy && isRecentAcceptance)) {
          console.log('[BuddiesScreen] Using forceRefresh option for getCurrentBuddies');
          options.forceRefresh = true;
        }
        
        result = await buddiesService.getCurrentBuddies(currentUserId, options);
      } else {
        // For backward compatibility, keep using getBuddies for other cases
        result = await buddiesService.getBuddies(options);
      }
      
      console.log(`[BuddiesScreen] Fetched ${result.buddies.length} buddies:`, 
        result.buddies.map(b => ({ id: b.id, name: b.name })));
      
      // Check if we got an empty result
      if (result.buddies.length === 0 && refresh) {
        console.log('[BuddiesScreen] No buddies found, marking as no results');
        setNoResultsFound(true);
      } else if (result.buddies.length > 0) {
        console.log('[BuddiesScreen] Buddies found, clearing noResultsFound flag');
        setNoResultsFound(false);
      }
      
      // Update state with new data
      if (refresh) {
        console.log('[BuddiesScreen] Replacing buddies list with new data');
        setBuddies(result.buddies);
      } else {
        // Append new buddies to existing list
        console.log('[BuddiesScreen] Appending new buddies to existing list');
        setBuddies(prevBuddies => [...prevBuddies, ...result.buddies]);
      }
      
      // Update pagination state
      setNextCursor(result.pagination.nextCursor);
      setHasMore(!!result.pagination.nextCursor);
      
      // If we had a recently accepted buddy, clear that flag now
      if (recentlyAcceptedBuddy && isRecentAcceptance && globalState) {
        console.log('[BuddiesScreen] Clearing recently accepted buddy flag');
        globalState.lastAcceptedBuddyId = undefined;
        globalState.lastAcceptedAt = 0;
      }
      
    } catch (error) {
      console.error('[BuddiesScreen] Error fetching buddies:', error);
      // Mark as no results on error to prevent retries
      setNoResultsFound(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      
      // Reset the fetching flag after a short delay to prevent rapid consecutive calls
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 1000);
    }
  };

  // Function to fetch pending buddy requests
  const fetchPendingRequests = async () => {
    try {
      // Update the last fetch timestamp
      lastPendingRequestsFetchRef.current = Date.now();
      
      // Use the existing auth state from the useAuth hook
      // Check if user is authenticated
      if (!state.user || !state.user.id) {
        console.error('[BuddiesScreen] Cannot fetch buddy requests: User not authenticated');
        return;
      }
      
      const currentUserId = state.user.id;
      console.log(`[BuddiesScreen] Fetching pending buddy requests for user ${currentUserId}`);
      
      // Set loading state
      setLoading(true);
      
      // Call the new getPendingBuddyRequests method
      const result = await buddiesService.getPendingBuddyRequests(currentUserId, {
        viewType: 'RECEIVED',
        status: 'PENDING',
        limit: 50
      });
      
      console.log(`[BuddiesScreen] Fetched ${result.requests.length} pending requests`);
      setPendingRequests(result.requests);
    } catch (error) {
      console.error('[BuddiesScreen] Error fetching pending requests:', error);
      // Show error in snackbar
      setSnackbarMessage('Failed to load buddy requests');
      setSnackbarVisible(true);
      // Set empty requests array to prevent undefined errors
      setPendingRequests([]);
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchBuddies(true);
    fetchPendingRequests();
  };

  // Handle tab change
  const handleTabChange = (tab: 'all' | 'requests') => {
    console.log(`[BuddiesScreen] Switching to tab: ${tab}`);
    setActiveTab(tab);
    
    // Update cached state
    const globalState = getGlobalBuddiesState();
    if (globalState) {
      console.log(`[BuddiesScreen] Updating global state activeTab to: ${tab}`);
      globalState.activeTab = tab;
      
      // Check if we should refresh buddies (e.g., after accepting a request)
      if (tab === 'all' && globalState.shouldRefreshBuddies) {
        console.log('[BuddiesScreen] shouldRefreshBuddies flag detected, will force refresh');
        globalState.shouldRefreshBuddies = false; // Reset the flag
      }
    }
    
    // Reset the noResultsFound flag when switching tabs
    // This ensures we always try to fetch data when switching tabs
    console.log('[BuddiesScreen] Resetting noResultsFound flag during tab change');
    setNoResultsFound(false);
    
    // Clear existing data when switching tabs to avoid showing stale data
    if (tab === 'all') {
      console.log('[BuddiesScreen] Clearing buddies list before fetching new data');
      setBuddies([]);
    }
    
    // Get current time to check debounce
    const now = Date.now();
    const timeSinceLastFetch = now - lastPendingRequestsFetchRef.current;
    
    // Fetch appropriate data based on selected tab with debouncing
    if (tab === 'requests') {
      if (timeSinceLastFetch > FETCH_DEBOUNCE_TIME) {
        console.log(`[BuddiesScreen] Fetching pending requests for Requests tab (${timeSinceLastFetch}ms since last fetch)`);
        fetchPendingRequests();
      } else {
        console.log(`[BuddiesScreen] Skipping fetch on tab change, only ${timeSinceLastFetch}ms since last fetch`);
      }
    } else {
      // Always force a refresh when switching to the All Buddies tab
      // This ensures we see newly accepted buddy requests
      console.log('[BuddiesScreen] Forcing refresh of buddies list for All Buddies tab');
      setTimeout(() => {
        // Small timeout to ensure state updates have propagated
        fetchBuddies(true);
      }, 100);
    }
  };

  // Send buddy request
  const sendBuddyRequest = async (userId: string) => {
    try {
      // Prevent duplicate requests
      if (sentRequests.has(userId)) {
        setSnackbarMessage('Buddy request already sent');
        setSnackbarVisible(true);
        return;
      }

      // Get current user ID from auth context
      if (!state.user || !state.user.id) {
        console.error('[BuddiesScreen] Cannot send buddy request: User not authenticated or missing ID');
        setSnackbarMessage('Please log in to send buddy requests');
        setSnackbarVisible(true);
        return;
      }

      const currentUserId = state.user.id;
      console.log(`[BuddiesScreen] Sending buddy request from ${currentUserId} to ${userId}`);

      // Pass both user IDs to the service method
      const success = await buddiesService.sendBuddyRequest(userId, currentUserId);

      if (success) {
        // Add to sent requests set
        setSentRequests((prev) => new Set(prev).add(userId));

        // Show success message
        setSnackbarMessage('Buddy request sent successfully');
        setSnackbarVisible(true);
        console.log('[BuddiesScreen] Buddy request sent successfully');
      }
    } catch (error) {
      console.error('[BuddiesScreen] Error sending buddy request:', error);
      setSnackbarMessage('Failed to send buddy request');
      setSnackbarVisible(true);
    }
  };

  // Handle end reached (for infinite scrolling)
  const handleEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      console.log('[BuddiesScreen] End reached, loading more buddies');
      fetchBuddies(false);
    }
  };

  // Handle search query change
  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Render buddy item
  const renderBuddyItem = ({ item }: { item: Buddy }) => {
    return (
      <TouchableOpacity style={styles.buddyItem}>
        <View style={styles.buddyAvatar}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{ width: 50, height: 50, borderRadius: 25 }}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.buddyInfo}>
          <Text style={styles.buddyName}>{item.name}</Text>
          <Text style={styles.buddyStatus}>{item.status}</Text>
          {item.location && (
            <Text style={styles.buddyLocation}>
              <Ionicons name="location-outline" size={12} color="#666" /> {item.location}
            </Text>
          )}
          <Text style={styles.buddyLastActive}>Last active: {item.lastActive}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render potential buddy item
  const renderPotentialBuddyItem = ({ item }: { item: Buddy }) => {
    const isRequestSent = sentRequests.has(item.id);

    return (
      <TouchableOpacity style={styles.buddyItem}>
        <View style={styles.buddyAvatar}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{ width: 50, height: 50, borderRadius: 25 }}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.buddyInfo}>
          <Text style={styles.buddyName}>{item.name}</Text>
          <Text style={styles.buddyStatus}>{item.status}</Text>
          {item.location && (
            <Text style={styles.buddyLocation}>
              <Ionicons name="location-outline" size={12} color="#666" /> {item.location}
            </Text>
          )}
          <Text style={styles.buddyLastActive}>Last active: {item.lastActive}</Text>
        </View>
        <TouchableOpacity
          style={[styles.connectButton, isRequestSent && styles.disabledButton]}
          onPress={() => sendBuddyRequest(item.id)}
          disabled={isRequestSent}
        >
          <Text style={styles.connectButtonText}>
            {isRequestSent ? 'Request Sent' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render request item
  const renderRequestItem = ({ item }: { item: BuddyRequest }) => {
    // Handle accepting a buddy request
    const handleAccept = async () => {
      if (!state.user || !state.user.id) {
        console.error('[BuddiesScreen] Cannot accept buddy request: User not authenticated');
        return;
      }

      console.log(`[BuddiesScreen] Accepting buddy request for ID: ${item.id}`);
      const currentUserId = state.user.id;
      const success = await buddiesService.acceptBuddyRequest(item.id, currentUserId, '');

      if (success) {
        console.log(`[BuddiesScreen] Successfully accepted buddy request for ID: ${item.id}`);
        // Remove the request from the list
        setPendingRequests((prev: BuddyRequest[]) => prev.filter((req: BuddyRequest) => req.id !== item.id));
        setSnackbarMessage('Buddy request accepted');
        setSnackbarVisible(true);

        // Reset the noResultsFound flag to ensure we can fetch buddies
        console.log('[BuddiesScreen] Resetting noResultsFound flag after accepting buddy');
        setNoResultsFound(false);
        
        // Store the accepted buddy ID to ensure it appears in the All Buddies tab
        const globalState = getGlobalBuddiesState();
        if (globalState) {
          console.log(`[BuddiesScreen] Storing accepted buddy ID: ${item.id} in global state`);
          globalState.lastAcceptedBuddyId = item.id;
          globalState.lastAcceptedAt = Date.now();
          globalState.shouldRefreshBuddies = true;
        }
        
        // Directly switch to All Buddies tab and refresh the buddies list
        console.log('[BuddiesScreen] Switching to All Buddies tab after accepting request');
        handleTabChange('all');
      } else {
        console.error('[BuddiesScreen] Failed to accept buddy request');
        setSnackbarMessage('Failed to accept buddy request');
        setSnackbarVisible(true);
      }
    };

    // Handle rejecting a buddy request
    const handleReject = async () => {
      if (!state.user || !state.user.id) {
        console.error('[BuddiesScreen] Cannot reject buddy request: User not authenticated');
        return;
      }

      const currentUserId = state.user.id;
      const success = await buddiesService.rejectBuddyRequest(item.id, currentUserId, '');

      if (success) {
        // Remove the request from the list
        setPendingRequests((prev: BuddyRequest[]) => prev.filter((req: BuddyRequest) => req.id !== item.id));
        setSnackbarMessage('Buddy request rejected');
        setSnackbarVisible(true);
      } else {
        setSnackbarMessage('Failed to reject buddy request');
        setSnackbarVisible(true);
      }
    };

    return (
      <View style={styles.requestItem}>
        <View style={styles.buddyAvatar}>
          {item.senderAvatarUrl ? (
            <Image
              source={{ uri: item.senderAvatarUrl }}
              style={{ width: 50, height: 50, borderRadius: 25 }}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.senderName ? item.senderName.charAt(0).toUpperCase() : '?'}
            </Text>
          )}
        </View>
        
        <View style={styles.buddyInfo}>
          <Text style={styles.buddyName}>{item.senderName}</Text>
          <Text style={styles.buddyStatus}>{item.message}</Text>
          <Text style={styles.buddyLastActive}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.requestButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]} 
            onPress={handleAccept}
          >
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]} 
            onPress={handleReject}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    if (activeTab === 'requests') {
      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2f95dc" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        );
      }

      if (pendingRequests.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>
              When someone sends you a buddy request, it will appear here.
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      );
    }
    
    // Nearby tab has been removed
    
    // Default tab (all)
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2f95dc" />
          <Text style={styles.loadingText}>Loading buddies...</Text>
        </View>
      );
    }
    
    if (buddies.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No buddies yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first buddy by tapping the "+ Add Buddy" button below.
          </Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={buddies}
        renderItem={renderBuddyItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Buddies</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search buddies..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={onChangeSearch}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => handleTabChange('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Buddies</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => handleTabChange('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          setModalVisible(true);
          fetchPotentialBuddies();
        }}
      >
        <Text style={styles.addButtonText}>+ Add Buddy</Text>
      </TouchableOpacity>

      {/* Potential Buddies Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Add Buddy</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
            
          {/* Search bar for potential buddies */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search buddies..."
              placeholderTextColor="#999"
              value={potentialBuddiesSearchQuery}
              onChangeText={setPotentialBuddiesSearchQuery}
            />
            {potentialBuddiesSearchQuery ? (
              <TouchableOpacity
                onPress={() => setPotentialBuddiesSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingPotentialBuddies ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2f95dc" />
              <Text style={styles.loadingText}>Loading potential buddies...</Text>
            </View>
          ) : potentialBuddiesError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{potentialBuddiesError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchPotentialBuddies}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : potentialBuddies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No potential buddies found</Text>
            </View>
          ) : (
            <FlatList
              data={potentialBuddies}
              renderItem={renderPotentialBuddyItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={loadingPotentialBuddies} onRefresh={fetchPotentialBuddies} />
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.tint,
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  searchPlaceholder: {
    color: '#999',
    marginLeft: 10,
  },
  searchBar: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.tint,
  },
  tabText: {
    color: Colors.lightText,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  buddyItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  buddyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buddyInfo: {
    flex: 1,
  },
  buddyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    color: Colors.text,
  },
  buddyStatus: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  buddyLastActive: {
    fontSize: 12,
    color: Colors.lightText,
  },
  messageButton: {
    backgroundColor: Colors.tint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  messageButtonText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: Colors.tint,
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 80, // Increased to avoid navigation bar overlap
    left: 15,
    right: 15,
    zIndex: 10,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Added missing styles for request items
  requestItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  requestButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 12,
  },
  rejectButtonText: {
    color: Colors.white,
  },
  // Loading and empty state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.lightText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightText,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
  // Connect button styles
  connectButton: {
    backgroundColor: Colors.tint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: Colors.disabledButton,
  },
  connectButtonText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 12,
  },
  buddyLocation: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    backgroundColor: Colors.tint,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  closeButton: {
    padding: 5,
  },
  retryButton: {
    backgroundColor: Colors.tint,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});
