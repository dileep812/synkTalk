import React from 'react';
import { Search, Loader2, AlertCircle, User } from 'lucide-react';

function FriendsSidebar({
  friendsLoading,
  friendsError,
  searchTerm,
  setSearchTerm,
  filteredFriends,
  activeFriend,
  setActiveFriend
}) {
  return (
    <div className={`w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 ${activeFriend ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
      {/* Search header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <h1 className="text-xl font-bold text-slate-800 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
          Messages
        </h1>
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* Friends scrolling list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {friendsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Syncing friends...</span>
          </div>
        ) : friendsError ? (
          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-4 m-2 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{friendsError}</p>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="text-center py-12 text-slate-400 px-4">
            <User className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No friends found</p>
            <p className="text-xs text-slate-500 mt-1">Connect with users in the search tab to start messaging.</p>
          </div>
        ) : (
          filteredFriends.map((friend) => {
            const isActive = activeFriend?._id === friend._id;
            return (
              <button
                key={friend._id}
                onClick={() => setActiveFriend(friend)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 text-left ${
                  isActive 
                    ? 'bg-cyan-50/70 border-l-4 border-cyan-600 shadow-sm' 
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <img
                  src={friend.profileImage || '/placeholder-avatar.png'}
                  alt={`${friend.username} avatar`}
                  className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate text-sm">
                    {friend.username}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {friend.email}
                  </p>
                </div>
                {friend.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[20px] h-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-cyan-600 rounded-full select-none shadow-sm">
                    {friend.unreadCount > 9 ? '9+' : friend.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default FriendsSidebar;
