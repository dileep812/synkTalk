import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSessionUser, logout } from '../services/authService'
import { disconnectSocket } from '../services/socketService'

const AuthContext = createContext(undefined)

function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await getSessionUser()
        if (response.authenticated && response.user) {
          setUser(response.user)
        }
      } catch {
        // Guest users are valid app state.
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    const handleUnauthorized = () => {
      disconnectSocket()
      setUser(null)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  const signOut = async () => {
    disconnectSocket()
    await logout()
    setUser(null)
  }

  const value = useMemo(
    () => ({
      loading,
      user,
      isAuthenticated: Boolean(user),
      setUser,
      signOut,
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export { AuthProvider, useAuth }
