import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/database.types'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

