import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWorkspace from '../components/ChatWorkspace';
import ConnectionsTab from '../components/ConnectionsTab';
import PendingRequestsTab from '../components/PendingRequestsTab';
import GlobalSearchTab from '../components/GlobalSearchTab';
import { useDashboardConnections } from '../hooks/useDashboardConnections';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function ChatDashboardView({ user, onLogout, isSubmitting }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [hasUnread, setHasUnread] = useState(false);
  const socketRef = useRef(null);

  const {
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
  } = useDashboardConnections();

  // Sync currentView reference for socket event closures
  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
    if (currentView === 'messages') {
      setHasUnread(false);
    }
  }, [currentView]);

  // Establish persistent socket connection on view mount
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true
    });

    socketRef.current.on('message:received', (message) => {
      if (currentViewRef.current !== 'messages') {
        setHasUnread(true);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        hasUnread={hasUnread}
        user={user}
        onLogout={onLogout}
      />

      {/* Main content pane */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {currentView === 'messages' ? (
          <ChatWorkspace user={user} parentSocket={socketRef.current} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <main className="mx-auto w-full max-w-5xl">
              <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur-xl sm:p-8">
                {/* Header without duplicate user profile details and logout button */}
                <header className="flex flex-col gap-2 border-b border-slate-200 pb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">SyncTalk Dashboard</p>
                  <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Welcome back, {user?.username || 'User'}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">Manage connections and network invites below.</p>
                </header>

                {/* Horizontal Navigation Tabs */}
                <nav className="flex border-b border-slate-200 mt-6 mb-6">
                  <button
                    onClick={() => setActiveTab('connections')}
                    className={`pb-3 text-sm font-semibold tracking-wider transition-all duration-200 border-b-2 mr-6 relative ${
                      activeTab === 'connections'
                        ? 'border-cyan-600 text-cyan-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    My Connections
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 text-sm font-semibold tracking-wider transition-all duration-200 border-b-2 mr-6 relative flex items-center ${
                      activeTab === 'requests'
                        ? 'border-cyan-600 text-cyan-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pending Requests
                    {pendingCount > 0 && (
                      <span className="ml-2 px-2.5 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`pb-3 text-sm font-semibold tracking-wider transition-all duration-200 border-b-2 relative ${
                      activeTab === 'search'
                        ? 'border-cyan-600 text-cyan-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Global Search
                  </button>
                </nav>

                {/* Tab Content Areas */}
                <div>
                  {activeTab === 'requests' ? (
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
                  ) : activeTab === 'connections' ? (
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
                  ) : (
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