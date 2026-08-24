import React from 'react';
import { MessageSquare, Search, Inbox, Users, User } from 'lucide-react';

function MobileBottomNav({ currentView, setCurrentView, hasUnread, pendingCount }) {
  const tabs = [
    {
      id: 'messages',
      label: 'Chats',
      icon: MessageSquare,
      badge: hasUnread ? 'dot' : null,
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      badge: null,
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'connections',
      label: 'Friends',
      icon: Users,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Profile',
      icon: User,
      badge: null,
    },
  ];

  return (
    <nav className="md:hidden sticky bottom-0 z-40 w-full border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-cyan-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 h-0.5 w-6 rounded-full bg-cyan-600" />
              )}

              <div className="relative">
                <div
                  className={`p-1 rounded-lg transition-all ${
                    isActive ? 'bg-cyan-50 text-cyan-600' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {tab.badge === 'dot' && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                  </span>
                )}

                {typeof tab.badge === 'number' && (
                  <span className="absolute -top-1 -right-2 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm border border-white">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
