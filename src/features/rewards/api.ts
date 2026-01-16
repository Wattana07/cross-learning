import { supabase } from '@/lib/supabaseClient'
import type { UserWallet, UserStreak, PointTransaction, PointRule } from '@/lib/database.types'

// Get wallet info
export async function getMyWallet(): Promise<UserWallet | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_wallet')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected
    console.error('Error fetching wallet:', error)
    throw error
  }

  // If no wallet exists, return default values
  if (!data) {
    return null
  }

  return data
}

// Get streak info
export async function getMyStreak(): Promise<UserStreak | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching streak:', error)
    throw error
  }

  return data
}

// Get my point transactions
export async function getMyTransactions(limit = 50): Promise<PointTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get point rules (public, all users can see)
export async function getPointRules(): Promise<PointRule[]> {
  const { data, error } = await supabase
    .from('point_rules')
    .select('*')
    .eq('is_active', true)
    .order('points', { ascending: false })

  if (error) throw error
  return data || []
}

// Complete episode and award points (via Edge Function)
export async function completeEpisode(episodeId: string): Promise<{
  ok: boolean
  gainedEpisodePoints?: number
  gainedSubjectPoints?: number
  gainedStreakPoints?: number
  currentStreak?: number
  maxStreak?: number
  reason?: string
  error?: string
}> {
  try {
    const { data, error } = await supabase.functions.invoke('complete-episode', {
      body: { episodeId },
    })

    if (error) {
      console.error('Error calling complete-episode function:', error)
      return { ok: false, error: error.message }
    }

    return data as {
      ok: boolean
      gainedEpisodePoints?: number
      gainedSubjectPoints?: number
      gainedStreakPoints?: number
      currentStreak?: number
      maxStreak?: number
      reason?: string
    }
  } catch (error: any) {
    console.error('Error completing episode:', error)
    return { ok: false, error: error.message || 'Unknown error' }
  }
}

