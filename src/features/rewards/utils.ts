import { supabase } from '@/lib/supabaseClient'
import { completeEpisode } from './api'

/**
 * Award points retroactively for all completed episodes that don't have transactions
 * Use this when points system was added after episodes were already completed
 */
export async function awardRetroactivePoints(): Promise<{
  totalAwarded: number
  errors: string[]
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get all published episodes
  const { data: episodes, error: epsError } = await supabase
    .from('episodes')
    .select('id')
    .eq('status', 'published')

  if (epsError) throw epsError
  if (!episodes || episodes.length === 0) {
    return { totalAwarded: 0, errors: [] }
  }

  const episodeIds = episodes.map((e) => e.id)

  // Get user progress for all episodes
  const { data: progressData, error: progressError } = await supabase
    .from('user_episode_progress')
    .select('episode_id, completed_at, watched_percent')
    .eq('user_id', user.id)
    .in('episode_id', episodeIds)

  if (progressError) throw progressError

  // Get existing transactions
  const { data: transactions, error: txError } = await supabase
    .from('point_transactions')
    .select('ref_id')
    .eq('user_id', user.id)
    .eq('rule_key', 'episode_complete')
    .eq('ref_type', 'episode')
    .in('ref_id', episodeIds)

  if (txError) throw txError

  const awardedEpisodeIds = new Set(transactions?.map((t) => t.ref_id) || [])

  // Find completed episodes without transactions
  const completedEpisodes = (progressData || []).filter((p) => {
    const isCompleted = p.completed_at !== null || (p.watched_percent ?? 0) >= 90
    return isCompleted && !awardedEpisodeIds.has(p.episode_id)
  })

  if (completedEpisodes.length === 0) {
    return { totalAwarded: 0, errors: [] }
  }

  // Award points for each episode
  let totalAwarded = 0
  const errors: string[] = []

  for (const progress of completedEpisodes) {
    try {
      console.log(`Awarding points for episode ${progress.episode_id}...`)
      const result = await completeEpisode(progress.episode_id)
      if (result.ok) {
        totalAwarded++
        const totalPoints = (result.gainedEpisodePoints || 0) + 
                           (result.gainedSubjectPoints || 0) + 
                           (result.gainedStreakPoints || 0)
        console.log(`✅ Awarded ${totalPoints} points for episode ${progress.episode_id}`)
      } else {
        errors.push(`Episode ${progress.episode_id}: ${result.reason || result.error}`)
      }
    } catch (error: any) {
      errors.push(`Episode ${progress.episode_id}: ${error.message || 'Unknown error'}`)
    }
  }

  return { totalAwarded, errors }
}

