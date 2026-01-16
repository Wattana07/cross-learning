import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getMyProfile, signIn as authSignIn, signOut as authSignOut } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/database.types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isAuthenticated: false,
  })

  // Fetch profile when user changes
  const fetchProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setState({
        user: null,
        profile: null,
        loading: false,
        isAdmin: false,
        isAuthenticated: false,
      })
      return
    }

    try {
      const profile = await getMyProfile()
      setState({
        user,
        profile,
        loading: false,
        isAdmin: profile?.role === 'admin',
        isAuthenticated: true,
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      setState({
        user,
        profile: null,
        loading: false,
        isAdmin: false,
        isAuthenticated: true,
      })
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchProfile(session?.user ?? null)
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            loading: false,
            isAdmin: false,
            isAuthenticated: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      await authSignIn(email, password)
      // Profile will be fetched by onAuthStateChange
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }))
      throw error
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      await authSignOut()
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }))
      throw error
    }
  }, [])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await fetchProfile(state.user)
    }
  }, [state.user, fetchProfile])

  return {
    ...state,
    signIn,
    signOut,
    refreshProfile,
  }
}

