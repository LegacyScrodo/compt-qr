import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser } from '../types'
import { api } from '../api'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  setUser: (u: AuthUser | null) => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, setUser: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
