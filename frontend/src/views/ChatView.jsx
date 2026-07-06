import { useEffect, useState } from 'react'
import ActionButton from '../components/ActionButton'
import { searchUsers } from '../services/userService'

function ChatView({ user, onLogout, isSubmitting }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const debounceId = setTimeout(async () => {
      try {
        setUsersLoading(true)
        setUsersError('')
        const data = await searchUsers({ search: searchTerm, page: 1, signal: controller.signal })
        setUsers(data.users || [])
      } catch (error) {
        if (error.name === 'AbortError') return
        setUsersError(error.message)
      } finally {
        setUsersLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(debounceId)
    }
  }, [searchTerm])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center p-4 sm:p-8">
      <section className="relative w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-cyan-200/70 blur-2xl"></div>
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-amber-200/70 blur-2xl"></div>

        <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={user.profileImage}
              alt="Profile avatar"
              className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">SyncTalk Active Session</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                Welcome, {user.username}
              </h1>
              <p className="mt-2 text-slate-600">{user.email}</p>
            </div>
          </div>

          <div className="w-full sm:w-40">
            <ActionButton type="button" variant="secondary" onClick={onLogout} disabled={isSubmitting} className="!w-full">
              {isSubmitting ? 'Logging out...' : 'Log out'}
            </ActionButton>
          </div>
        </div>

        <div className="relative mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">User Directory</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                All Users
              </h2>
              <p className="mt-1 text-sm text-slate-600">Search by username or email. Results update as you type.</p>
            </div>

            <div className="w-full sm:w-80">
              <label htmlFor="user-search" className="mb-2 block text-sm font-semibold text-slate-700">
                Search users
              </label>
              <input
                id="user-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Type a username or email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              />
            </div>
          </div>

          {usersError && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{usersError}</p>}

          {usersLoading ? (
            <p className="mt-5 text-sm font-medium text-slate-600">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="mt-5 text-sm font-medium text-slate-600">No users found for this search.</p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {users.map((directoryUser) => (
                <li
                  key={directoryUser.email}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <img
                    src={directoryUser.profileImage}
                    alt={`${directoryUser.username} avatar`}
                    className="h-12 w-12 rounded-xl border border-slate-200 bg-white p-1"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{directoryUser.username}</p>
                    <p className="text-sm text-slate-600">{directoryUser.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

export default ChatView
