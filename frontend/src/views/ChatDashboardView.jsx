import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWorkspace from '../components/ChatWorkspace';
import ConnectionsTab from '../components/ConnectionsTab';
import PendingRequestsTab from '../components/PendingRequestsTab';
import GlobalSearchTab from '../components/GlobalSearchTab';
import ProfileSettingsTab from '../components/ProfileSettingsTab';
import { useDashboardConnections } from '../hooks/useDashboardConnections';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function ChatDashboardView({ user, onLogout, isSubmitting }) {
  const [socket] = useState(() => io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: true
  }));
  const [currentView, setCurrentView] = useState('messages');
  const [hasUnread, setHasUnread] = useState(false);

  const {
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
  } = useDashboardConnections();

  // Sync currentView reference for socket event closures
  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
    if (currentView === 'messages') {
      setHasUnread(false);
    }
  }, [currentView]);

  // Establish persistent socket event listeners on mount
  useEffect(() => {
    socket.on('message:received', (message) => {
      if (currentViewRef.current !== 'messages') {
        setHasUnread(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        hasUnread={hasUnread}
        pendingCount={pendingCount}
        user={user}
        onLogout={onLogout}
        isSubmitting={isSubmitting}
      />

      {/* Main content pane */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {currentView === 'messages' ? (
          <ChatWorkspace
            user={user}
            parentSocket={socket}
            friends={myConnections}
            friendsLoading={loading}
            friendsError={error}
          />
        ) : currentView === 'settings' ? (
          <ProfileSettingsTab />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
            <main className="mx-auto w-full max-w-5xl">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl sm:p-8">
                {/* Dynamic Page Header */}
                <header className="flex flex-col gap-2 border-b border-slate-200 pb-6 mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
                    {currentView === 'search' ? 'Directory Search' : currentView === 'requests' ? 'Network Invitations' : 'Connections Workspace'}
                  </p>
                  <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {currentView === 'search' ? 'Global Directory Search' : currentView === 'requests' ? 'Pending Network Invites' : 'My Network Connections'}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">
                    {currentView === 'search' && 'Search and connect with other SyncTalk users globally.'}
                    {currentView === 'requests' && 'Accept or decline pending incoming invitations.'}
                    {currentView === 'connections' && 'Interact, chat, or manage your established connections.'}
                  </p>
                </header>

                {/* Main Content Component Routing */}
                <div>
                  {currentView === 'requests' && (
                    <PendingRequestsTab
                      searchInput={searchInput}
                      setSearchInput={setSearchInput}
                      pendingRequests={pendingRequests}
                      loading={loading}
                      error={error}
                      actionLoadingKey={actionLoadingKey}
                      runAction={runAction}
                      removeConnectionRequest={removeConnectionRequest}
                      sendConnectionRequest={sendConnectionRequest}
                      withdrawConnectionRequest={withdrawConnectionRequest}
                      handleConnectionRequest={handleConnectionRequest}
                    />
                  )}
                  {currentView === 'connections' && (
                    <ConnectionsTab
                      searchInput={searchInput}
                      setSearchInput={setSearchInput}
                      myConnections={myConnections}
                      loading={loading}
                      error={error}
                      actionLoadingKey={actionLoadingKey}
                      runAction={runAction}
                      removeConnectionRequest={removeConnectionRequest}
                    />
                  )}
                  {currentView === 'search' && (
                    <GlobalSearchTab
                      searchInput={searchInput}
                      setSearchInput={setSearchInput}
                      debouncedSearch={debouncedSearch}
                      searchRecords={searchRecords}
                      loading={loading}
                      error={error}
                      actionLoadingKey={actionLoadingKey}
                      runAction={runAction}
                      removeConnectionRequest={removeConnectionRequest}
                      sendConnectionRequest={sendConnectionRequest}
                      withdrawConnectionRequest={withdrawConnectionRequest}
                      handleConnectionRequest={handleConnectionRequest}
                    />
                  )}
                </div>
              </section>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatDashboardView;