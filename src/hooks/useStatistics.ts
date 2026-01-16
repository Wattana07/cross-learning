import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { getMyWallet, getMyStreak } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { getLevelFromPoints, getProgressToNextLevel } from '@/lib/utils'

// Fetch wallet data
async function fetchWallet() {
  try {
    const wallet = await getMyWallet()
    return wallet || { total_points: 0, level: 1 }
  } catch {
    return { total_points: 0, level: 1 }
  }
}

// Fetch streak data
async function fetchStreak() {
  try {
    const streak = await getMyStreak()
    return streak || { current_streak: 0, max_streak: 0 }
  } catch {
    return { current_streak: 0, max_streak: 0 }
  }
}

// Fetch activity data (optimized single query)
async function fetchActivityData(userId: string) {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Single query to get all progress in last 30 days
  const { data, error } = await supabase
    .from('user_episode_progress')
    .select('updated_at')
    .eq('user_id', userId)
    .gte('updated_at', thirtyDaysAgo.toISOString())

  if (error) throw error

  // Group by 10-day periods
  const periods = [0, 0, 0]
  const periodSize = 10 * 24 * 60 * 60 * 1000 // 10 days in ms

  data?.forEach((item) => {
    const itemDate = new Date(item.updated_at).getTime()
    const daysAgo = (today.getTime() - itemDate) / (24 * 60 * 60 * 1000)
    
    if (daysAgo <= 10) {
      periods[2]++
    } else if (daysAgo <= 20) {
      periods[1]++
    } else if (daysAgo <= 30) {
      periods[0]++
    }
  })

  return periods
}

export function useStatistics() {
  const { user } = useAuthContext()

  // Fetch wallet and streak in parallel
  const { data: wallet } = useQuery({
    queryKey: ['statistics', 'wallet', user?.id],
    queryFn: fetchWallet,
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const { data: streak } = useQuery({
    queryKey: ['statistics', 'streak', user?.id],
    queryFn: fetchStreak,
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const { data: activityData = [0, 0, 0] } = useQuery({
    queryKey: ['statistics', 'activity', user?.id],
    queryFn: () => fetchActivityData(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const totalPoints = wallet?.total_points || 0
  const level = wallet?.level || getLevelFromPoints(totalPoints)
  const progressPercent = getProgressToNextLevel(totalPoints)
  const currentStreak = streak?.current_streak || 0

  return {
    wallet,
    streak,
    activityData,
    totalPoints,
    level,
    progressPercent,
    currentStreak,
  }
}

