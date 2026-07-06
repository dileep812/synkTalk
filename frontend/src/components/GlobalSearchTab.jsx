import React from 'react';
import ConnectionActions from './ConnectionActions';

function GlobalSearchTab({
  searchInput,
  setSearchInput,
  debouncedSearch,
  searchRecords,
  loading,
  error,
  actionLoadingKey,
  runAction,
  removeConnectionRequest,
  sendConnectionRequest,
  withdrawConnectionRequest,
  handleConnectionRequest
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 self-start">
        <label htmlFor="dashboard-search-global" className="block text-sm font-semibold text-slate-700">
          Find connections
        </label>
        <input
          id="dashboard-search-global"
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by username or email"
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        />
        <p className="mt-3 text-xs text-slate-600">
          Showing directory search results
        </p>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          Search Results
        </h2>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {loading ? (
          <p className="mt-4 text-sm font-medium text-slate-600 animate-pulse">Loading directory...</p>
        ) : searchRecords.length === 0 ? (
          <p className="mt-4 text-sm font-medium text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            {searchInput.trim() ? `No users found for "${debouncedSearch}".` : 'No other users registered yet.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {searchRecords.map((targetUser) => {
              const rowKey = targetUser._id || targetUser.id || targetUser.email;
              return (
                <li
                  key={rowKey}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between transition hover:border-slate-300"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={targetUser.profileImage || '/placeholder-avatar.png'}
                      alt={`${targetUser.username} avatar`}
                      className="h-12 w-12 rounded-xl border border-slate-200 bg-white p-1 object-cover"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{targetUser.username}</p>
                      <p className="text-sm text-slate-600">{targetUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center sm:justify-end">
                    <ConnectionActions
                      targetUser={targetUser}
                      actionLoadingKey={actionLoadingKey}
                      runAction={runAction}
                      removeConnectionRequest={removeConnectionRequest}
                      sendConnectionRequest={sendConnectionRequest}
                      withdrawConnectionRequest={withdrawConnectionRequest}
                      handleConnectionRequest={handleConnectionRequest}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default GlobalSearchTab;
