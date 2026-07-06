import React from 'react';
import FriendsSidebar from './FriendsSidebar';
import ChatArea from './ChatArea';
import ChatFallback from './ChatFallback';
import { useChatWorkspace } from '../hooks/useChatWorkspace';

function ChatWorkspace({ user, parentSocket }) {
  const {
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
    messagesEndRef
  } = useChatWorkspace({ user, parentSocket });

  return (
    <div className="flex-1 flex h-screen bg-slate-50 overflow-hidden">
      <FriendsSidebar
        friendsLoading={friendsLoading}
        friendsError={friendsError}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredFriends={filteredFriends}
        activeFriend={activeFriend}
        setActiveFriend={setActiveFriend}
      />
      {activeFriend ? (
        <ChatArea
          user={user}
          activeFriend={activeFriend}
          setActiveFriend={setActiveFriend}
          messages={messages}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          isFetchingMore={isFetchingMore}
          isFriendTyping={isFriendTyping}
          inputText={inputText}
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          timelineContainerRef={timelineContainerRef}
          handleScroll={handleScroll}
          messagesEndRef={messagesEndRef}
        />
      ) : (
        <ChatFallback />
      )}
    </div>
  );
}

export default ChatWorkspace;
