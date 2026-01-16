import { supabase } from './supabaseClient'
import { logger } from './logger'
import type { Profile } from './database.types'

// Get current user's profile
export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

// Update current user's profile
export async function updateMyProfile(updates: {
  full_name?: string
  department?: string
  avatar_path?: string
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) throw error
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
}

// Sign out
export async function signOut(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.auth.signOut()
  if (error) {
    await logger.error('user_logout', {
      errorMessage: error.message,
    })
    throw error
  }
  // Log successful logout
  if (user) {
    await logger.success('user_logout', {
      details: { email: user.email }
    })
  }
}

// Get wallet info
export async function getMyWallet() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_wallet')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching wallet:', error)
    throw error
  }
  return data
}

// Get streak info
export async function getMyStreak() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching streak:', error)
    throw error
  }
  return data
}

// Get my point transactions
export async function getMyTransactions(limit = 20) {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

