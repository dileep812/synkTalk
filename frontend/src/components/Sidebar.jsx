import React from 'react';
import { MessageSquare, Users, LogOut, MessageCircle, User, Search, Inbox } from 'lucide-react';

function Sidebar({ currentView, setCurrentView, hasUnread, pendingCount, user, onLogout }) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800 shrink-0">
      {/* Brand Logo Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SyncTalk
          </h2>
          <span className="text-xs text-slate-500 font-medium uppercase tracking-[0.15em]">
            Workspace
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {/* 1. Messages Button */}
        <button
          onClick={() => setCurrentView('messages')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
            currentView === 'messages'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5" />
            <span>Messages</span>
          </div>

          {/* Conditional Green Unread Notification Dot */}
          {hasUnread && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
        </button>

        {/* 2. Global Search Button */}
        <button
          onClick={() => setCurrentView('search')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
            currentView === 'search'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <Search className="h-5 w-5" />
          <span>Global Search</span>
        </button>

        {/* 3. Pending Requests Button */}
        <button
          onClick={() => setCurrentView('requests')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
            currentView === 'requests'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5" />
            <span>Pending Requests</span>
          </div>

          {/* Conditional Pending Requests Count Badge */}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        {/* 4. My Connections Button */}
        <button
          onClick={() => setCurrentView('connections')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
            currentView === 'connections'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <Users className="h-5 w-5" />
          <span>My Connections</span>
        </button>

        {/* 5. My Profile Button */}
        <button
          onClick={() => setCurrentView('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
            currentView === 'settings'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <User className="h-5 w-5" />
          <span>My Profile</span>
        </button>
      </nav>

      {/* User Session Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <button
          onClick={() => setCurrentView('settings')}
          className="w-full flex items-center gap-3 mb-4 p-2 rounded-xl text-left hover:bg-slate-800/40 transition-all duration-200 group"
          title="Edit Profile Settings"
        >
          <img
            src={user?.profileImage || '/placeholder-avatar.png'}
            alt={`${user?.username || 'User'}'s avatar`}
            className="h-10 w-10 rounded-xl border border-slate-800 object-cover bg-slate-800 group-hover:ring-2 group-hover:ring-cyan-500 transition-all duration-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition-all duration-200">
              {user?.username || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || ''}
            </p>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 text-xs font-semibold tracking-wider transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
