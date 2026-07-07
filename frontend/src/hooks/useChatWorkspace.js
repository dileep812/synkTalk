import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function useChatWorkspace({ user, parentSocket, friends: initialFriends, friendsLoading: initialLoading, friendsError: initialError }) {
  const [friends, setFriends] = useState(initialFriends || []);
  const [friendsLoading, setFriendsLoading] = useState(initialFriends ? (initialLoading ?? false) : true);
  const [friendsError, setFriendsError] = useState(initialFriends ? (initialError ?? '') : '');
  const [searchTerm, setSearchTerm] = useState('');

  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [inputText, setInputText] = useState('');
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);

  // Sync state if initialFriends/loading/error variables are updated from parent context
  useEffect(() => {
    if (initialFriends) {
      setFriends(initialFriends);
    }
  }, [initialFriends]);

  useEffect(() => {
    if (initialFriends && initialLoading !== undefined) {
      setFriendsLoading(initialLoading);
    }
  }, [initialLoading, initialFriends]);

  useEffect(() => {
    if (initialFriends && initialError !== undefined) {
      setFriendsError(initialError);
    }
  }, [initialError, initialFriends]);

  // 1. Establish/Fallback socket connection
  useEffect(() => {
    if (parentSocket) {
      socketRef.current = parentSocket;
    } else {
      socketRef.current = io(API_BASE_URL, {
        withCredentials: true,
        autoConnect: true
      });
    }

    return () => {
      if (!parentSocket && socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [parentSocket]);

  // 2. Fetch friends on mount (skipped if shared connections list is passed by parent)
  useEffect(() => {
    if (initialFriends) return;

    const fetchFriends = async () => {
      try {
        setFriendsLoading(true);
        setFriendsError('');
        const response = await fetch(`${API_BASE_URL}/users/friends`, {
          credentials: 'include',
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch friends list.');
        setFriends(data.friends || []);
      } catch (err) {
        setFriendsError(err.message || 'Could not load friends.');
      } finally {
        setFriendsLoading(false);
      }
    };
    fetchFriends();
  }, [initialFriends]);

  // 3. Load historical message log when active friend changes (LIMITED TO 10 ITEMS)
  useEffect(() => {
    if (!activeFriend) return;

    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);
        setMessagesError('');
        shouldScrollToBottomRef.current = true; // Force bottom alignment on new chat open

        // CRITICAL: Request limited subset from API to trigger your cursor engine
        const response = await fetch(`${API_BASE_URL}/messages/${activeFriend._id}?limit=10`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch message history.');

        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);

        // Notify read receipt on window open
        if (socketRef.current) {
          socketRef.current.emit('message:read_receipt', { chatWithUserId: activeFriend._id });
        }
      } catch (err) {
        setMessagesError(err.message || 'Could not load chat history.');
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [activeFriend]);

  // Reset typing state, reset active friend unread count, and cleanup timeout on active friend change
  useEffect(() => {
    setIsFriendTyping(false);
    shouldScrollToBottomRef.current = true;

    if (activeFriend) {
      setFriends((prevFriends) =>
        prevFriends.map((friend) =>
          friend._id === activeFriend._id ? { ...friend, unreadCount: 0 } : friend
        )
      );
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeFriend]);

  // 4. Handle incoming real-time messages and typing status via socket
  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessageReceived = (newMessage) => {
      const senderId = typeof newMessage.sender === 'object' ? newMessage.sender._id : newMessage.sender;

      if (activeFriend && senderId === activeFriend._id) {
        shouldScrollToBottomRef.current = true;
        setMessages((prev) => [...prev, newMessage]);
        // Emit read receipt immediately since we are viewing this chat actively
        socketRef.current.emit('message:read_receipt', { chatWithUserId: activeFriend._id });
      } else {
        // Increment unread count for this sender in the friends list (capping at 10)
        setFriends((prevFriends) =>
          prevFriends.map((friend) => {
            if (friend._id === senderId) {
              const currentUnread = friend.unreadCount || 0;
              return {
                ...friend,
                unreadCount: Math.min(10, currentUnread + 1)
              };
            }
            return friend;
          })
        );
      }
    };

    const handleMessageSent = (confirmedMessage) => {
      setMessages((prev) => {
        const index = prev.findIndex(
          (msg) => msg._id.toString().startsWith('optimistic-') && msg.text === confirmedMessage.text
        );
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = confirmedMessage;
          return updated;
        }
        return [...prev, confirmedMessage];
      });
    };

    const handleTypingStatus = (data) => {
      if (activeFriend && data.senderId === activeFriend._id) {
        setIsFriendTyping(data.isTyping);
      }
    };

    const handleStatusUpdate = (data) => {
      setMessages((prev) => 
        prev.map((msg) => 
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    };

    const handleMessagesMarkedRead = (data) => {
      if (activeFriend && data.readerId === activeFriend._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.recipient === activeFriend._id ? { ...msg, status: 'read' } : msg
          )
        );
      }
    };

    socketRef.current.on('message:received', handleMessageReceived);
    socketRef.current.on('message:sent', handleMessageSent);
    socketRef.current.on('chat:typing_status', handleTypingStatus);
    socketRef.current.on('message:status_update', handleStatusUpdate);
    socketRef.current.on('messages:marked_read', handleMessagesMarkedRead);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('message:received', handleMessageReceived);
        socketRef.current.off('message:sent', handleMessageSent);
        socketRef.current.off('chat:typing_status', handleTypingStatus);
        socketRef.current.off('message:status_update', handleStatusUpdate);
        socketRef.current.off('messages:marked_read', handleMessagesMarkedRead);
      }
    };
  }, [activeFriend]);

  // 5. Auto-scroll to bottom ref hook
  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  // Fetch older messages for pagination
  const fetchMoreMessages = async () => {
    if (!activeFriend || !nextCursor || isFetchingMore) return;
    
    const container = timelineContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    try {
      setIsFetchingMore(true);
      shouldScrollToBottomRef.current = false; // Block down scrolling on append

      const response = await fetch(`${API_BASE_URL}/messages/${activeFriend._id}?cursor=${nextCursor}&limit=10`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch more messages.');

      const newMsgs = data.messages || [];
      
      setMessages((prev) => [...newMsgs, ...prev]);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);

      // Lock view translation to prevent page jumping
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - oldScrollHeight;
        }
      });

    } catch (err) {
      console.error('[useChatWorkspace] fetchMoreMessages Error:', err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleScroll = async () => {
    const container = timelineContainerRef.current;
    if (!container) return;

    // Trigger lazy load when user reaches the top boundary threshold
    if (container.scrollTop <= 5 && hasMore && !isFetchingMore && nextCursor) {
      await fetchMoreMessages();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);

    if (socketRef.current && activeFriend) {
      if (!value.trim()) {
        socketRef.current.emit('chat:typing', { receiverId: activeFriend._id, isTyping: false });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        return;
      }

      socketRef.current.emit('chat:typing', { receiverId: activeFriend._id, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && activeFriend) {
          socketRef.current.emit('chat:typing', { receiverId: activeFriend._id, isTyping: false });
        }
      }, 2000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeFriend) return;

    const text = inputText.trim();
    const receiverId = activeFriend._id;

    const optimisticMessage = {
      _id: `optimistic-${Date.now()}`,
      sender: user.id || user._id,
      receiver: receiverId,
      text,
      status: 'sent',
      timestamp: new Date().toISOString()
    };

    shouldScrollToBottomRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');

    if (socketRef.current) {
      socketRef.current.emit('message:send', { receiverId, text });
      socketRef.current.emit('chat:typing', { receiverId, isTyping: false });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    friends,
    friendsLoading,
    friendsError,
    searchTerm,
    setSearchTerm,
    filteredFriends,
    activeFriend,
    setActiveFriend,
    messages,
    messagesLoading,
    messagesError,
    isFetchingMore,
    isFriendTyping,
    inputText,
    handleInputChange,
    handleSendMessage,
    timelineContainerRef,
    handleScroll,
    messagesEndRef,
    socketRef
  };
}
