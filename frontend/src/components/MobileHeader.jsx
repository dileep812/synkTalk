import React from 'react';
import { MessageCircle, LogOut } from 'lucide-react';

function MobileHeader({ currentView, setCurrentView, user, onLogout, isSubmitting }) {
  const getHeaderInfo = () => {
    switch (currentView) {
      case 'messages':
        return {
          title: 'SyncTalk',
          subtitle: 'Messages & Chats',
        };
      case 'search':
        return {
          title: 'Global Search',
          subtitle: 'Find & Connect',
        };
      case 'requests':
        return {
          title: 'Invitations',
          subtitle: 'Pending Requests',
        };
      case 'connections':
        return {
          title: 'Friends',
          subtitle: 'My Connections',
        };
      case 'settings':
        return {
          title: 'My Profile',
          subtitle: 'Account & Sessions',
        };
      default:
        return {
          title: 'SyncTalk',
          subtitle: 'Workspace',
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <header className="md:hidden sticky top-0 z-40 w-full border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            onClick={() => setCurrentView('messages')}
            className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition-transform"
          >
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              {title}
            </h1>
            <p className="text-[10px] font-medium text-slate-400 leading-none">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('settings')}
            className="p-0.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all"
            title="Profile & Settings"
          >
            <img
              src={user?.profileImage || '/placeholder-avatar.png'}
              alt={user?.username || 'User'}
              className="h-7 w-7 rounded-lg object-cover border border-slate-200"
            />
          </button>
          {currentView === 'settings' && (
            <button
              onClick={onLogout}
              disabled={isSubmitting}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg active:scale-90 transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default MobileHeader;
