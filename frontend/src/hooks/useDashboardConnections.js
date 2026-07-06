import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebounce from './useDebounce';
import {
  getFriends,
  handleConnectionRequest,
  searchUsers,
  sendConnectionRequest,
  withdrawConnectionRequest,
  removeConnectionRequest,
} from '../services/userService';

export function useDashboardConnections() {
  const [activeTab, setActiveTab] = useState('connections');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [friendsRecords, setFriendsRecords] = useState([]);
  const [searchRecords, setSearchRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingKey, setActionLoadingKey] = useState('');

  // Keeps tracking references to cancel race conditions cleanly across re-renders
  const abortControllerFriendsRef = useRef(null);
  const abortControllerSearchRef = useRef(null);

  /**
   * Fetches the user's friends list (both accepted and pending connection requests).
   */
  const fetchFriends = useCallback(async (silent = false) => {
    if (abortControllerFriendsRef.current) {
      abortControllerFriendsRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerFriendsRef.current = controller;

    try {
      if (!silent) setLoading(true);
      setError('');
      const data = await getFriends({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setFriendsRecords(data.friends || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(`[useDashboardConnections | fetchFriends] Error:`, err);
      setError(err.message || 'Could not load connections.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Fetches the directory users list using the global search debounced value.
   */
  const fetchSearch = useCallback(async (silent = false) => {
    if (abortControllerSearchRef.current) {
      abortControllerSearchRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerSearchRef.current = controller;

    try {
      if (!silent) setLoading(true);
      setError('');
      const data = await searchUsers({ 
        page: 1, 
        search: debouncedSearch.trim() 
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSearchRecords(data.users || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(`[useDashboardConnections | fetchSearch] Error:`, err);
      setError(err.message || 'Could not load search directory.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [debouncedSearch]);

  /**
   * Consolidated helper for state synchronization used by connection actions.
   */
  const refreshList = useCallback(async (silent = false) => {
    if (activeTab === 'search') {
      await Promise.all([
        fetchFriends(silent),
        fetchSearch(silent)
      ]);
    } else {
      await fetchFriends(silent);
    }
  }, [activeTab, fetchFriends, fetchSearch]);

  // Fetch friends list if tab changes
  useEffect(() => {
    fetchFriends();
  }, [activeTab, fetchFriends]);

  // Fetch search directory if we are on 'search' tab and debouncedSearch query changes
  useEffect(() => {
    if (activeTab === 'search') {
      fetchSearch();
    }
  }, [activeTab, debouncedSearch, fetchSearch]);

  // Clear search input when switching tabs
  useEffect(() => {
    setSearchInput('');
  }, [activeTab]);

  // Cleanup hook executing abort tasks on early unmounting states
  useEffect(() => {
    return () => {
      if (abortControllerFriendsRef.current) {
        abortControllerFriendsRef.current.abort();
      }
      if (abortControllerSearchRef.current) {
        abortControllerSearchRef.current.abort();
      }
    };
  }, []);

  // Filtered lists computed via useMemo (locally on connections/requests tabs)
  const myConnections = useMemo(() => {
    const list = friendsRecords.filter(r => r.relationship?.status === 'accepted');
    if (!searchInput.trim() || activeTab !== 'connections') return list;
    const query = searchInput.toLowerCase().trim();
    return list.filter(user => 
      user.username.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [friendsRecords, searchInput, activeTab]);

  const totalPendingRequests = useMemo(() => {
    return friendsRecords.filter(r => r.relationship?.status === 'pending' && !r.relationship?.amISender);
  }, [friendsRecords]);

  const pendingRequests = useMemo(() => {
    const list = friendsRecords.filter(r => r.relationship?.status === 'pending' && !r.relationship?.amISender);
    if (!searchInput.trim() || activeTab !== 'requests') return list;
    const query = searchInput.toLowerCase().trim();
    return list.filter(user => 
      user.username.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [friendsRecords, searchInput, activeTab]);

  const pendingCount = useMemo(() => {
    return totalPendingRequests.length;
  }, [totalPendingRequests]);

  /**
   * Encapsulates state mutations safely during connection interactions.
   */
  const runAction = async (loadingKey, actionFunctionName, targetUserId, actionPayloadThunk) => {
    if (actionLoadingKey) return; // Debounce action execution to prevent double clicks

    try {
      setActionLoadingKey(loadingKey);
      setError('');
      
      const result = await actionPayloadThunk();

      // OPTIMISTIC LOCAL STATE UPDATE:
      const updateRecords = (recordsList) => {
        return recordsList.map(record => {
          const recId = record._id || record.id;
          if (recId.toString() !== targetUserId.toString()) return record;

          let newRel = { ...record.relationship };

          if (actionFunctionName === 'sendConnectionRequest') {
            newRel = {
              status: 'pending',
              requestId: result?.request?._id || null,
              amISender: true
            };
          } else if (actionFunctionName === 'withdrawConnectionRequest') {
            newRel = {
              status: 'none',
              requestId: null,
              amISender: false
            };
          } else if (actionFunctionName === 'handleConnectionRequest_Accept') {
            newRel = {
              ...newRel,
              status: 'accepted'
            };
          } else if (actionFunctionName === 'handleConnectionRequest_Reject') {
            newRel = {
              status: 'none',
              requestId: null,
              amISender: false
            };
          } else if (actionFunctionName === 'removeConnectionRequest') {
            newRel = {
              status: 'none',
              requestId: null,
              amISender: false
            };
          }

          return { ...record, relationship: newRel };
        });
      };

      // Apply the updates to our local states immediately!
      setSearchRecords(prev => updateRecords(prev));
      setFriendsRecords(prev => updateRecords(prev));

      // Trigger silent background synchronization (no global loading screen)
      await refreshList(true); 

    } catch (actionError) {
      console.error(`[useDashboardConnections | runAction] Error:`, actionError);
      setError(actionError.message || 'Action failed. Please retry.');
    } finally {
      setActionLoadingKey('');
    }
  };

  return {
    activeTab,
    setActiveTab,
    searchInput,
    setSearchInput,
    debouncedSearch,
    myConnections,
    pendingRequests,
    pendingCount,
    searchRecords,
    loading,
    error,
    actionLoadingKey,
    runAction,
    removeConnectionRequest,
    sendConnectionRequest,
    withdrawConnectionRequest,
    handleConnectionRequest,
  };
}
