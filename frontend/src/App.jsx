import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import ChatDashboardView from './views/ChatDashboardView'
import LoginView from './views/LoginView'

function App() {
  const { loading, user, isAuthenticated, setUser, signOut } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogout = async () => {
    try {
      setIsSubmitting(true)
      await signOut()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="rounded-3xl border border-cyan-200/70 bg-white/80 px-8 py-6 text-center shadow-xl backdrop-blur">
          <p className="text-lg font-semibold text-slate-700">Checking your SyncTalk session...</p>
        </div>
      </main>
    )
  }

  if (isAuthenticated && user) {
    return <ChatDashboardView user={user} onLogout={handleLogout} isSubmitting={isSubmitting} />
  }

  return <LoginView onAuthSuccess={setUser} />
}

export default App
