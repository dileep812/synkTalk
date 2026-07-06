import React from 'react';
import ActionButton from './ActionButton';

function ConnectionsTab({
  searchInput,
  setSearchInput,
  myConnections,
  loading,
  error,
  actionLoadingKey,
  runAction,
  removeConnectionRequest
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 self-start">
        <label htmlFor="dashboard-search-conn" className="block text-sm font-semibold text-slate-700">
          Find connections
        </label>
        <input
          id="dashboard-search-conn"
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by username or email"
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        />
        <p className="mt-3 text-xs text-slate-600">
          Type to filter locally
        </p>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          Your Connections
        </h2>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {loading ? (
          <p className="mt-4 text-sm font-medium text-slate-600 animate-pulse">Loading connections...</p>
        ) : myConnections.length === 0 ? (
          <p className="mt-4 text-sm font-medium text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            {searchInput.trim() ? `No connections found for "${searchInput}".` : 'No connections yet.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {myConnections.map((targetUser) => {
              const rowKey = targetUser._id || targetUser.id || targetUser.email;
              const targetId = targetUser._id || targetUser.id;
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
                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => runAction(`remove-${targetId}`, 'removeConnectionRequest', targetId, () => removeConnectionRequest(targetId))}
                      disabled={!!actionLoadingKey}
                      className="!w-auto px-4 py-2"
                    >
                      {actionLoadingKey === `remove-${targetId}` ? 'Removing...' : 'Remove'}
                    </ActionButton>
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

export default ConnectionsTab;
