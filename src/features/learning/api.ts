import { supabase } from '@/lib/supabaseClient'
import type { Category, Subject, Episode, UserProgress } from '@/lib/database.types'
import { getSubjectCoverUrl } from '@/lib/storage'

// Fetch category by ID
export async function fetchCategory(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error) throw error
  return data
}

// Fetch subjects in category
export async function fetchSubjectsInCategory(categoryId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .order('order_no', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch subject by ID with category info
export async function fetchSubject(id: string): Promise<Subject & { category_name?: string }> {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      categories:category_id (
        name
      )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error) throw error

  return {
    ...data,
    category_name: (data as any).categories?.name,
  }
}

// Fetch episodes in subject (published only)
export async function fetchEpisodesInSubject(subjectId: string): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('status', 'published')
    .order('order_no', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch user progress for episodes
export async function fetchUserProgress(episodeIds: string[]): Promise<UserProgress[]> {
  if (episodeIds.length === 0) return []

  const { data, error } = await supabase
    .from('user_episode_progress')
    .select('*')
    .in('episode_id', episodeIds)

  if (error) throw error
  return data || []
}

// Fetch single episode
export async function fetchEpisode(id: string): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error) throw error
  return data
}

// Save episode progress
export async function saveEpisodeProgress(
  episodeId: string,
  watchedPercent: number,
  lastPosition: number
): Promise<UserProgress> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if progress exists (use maybeSingle to avoid error if not exists)
  const { data: existing, error: checkError } = await supabase
    .from('user_episode_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('episode_id', episodeId)
    .maybeSingle()
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected, ignore it
    console.error('Error checking progress:', checkError)
  }

  const progressData: any = {
    user_id: user.id,
    episode_id: episodeId,
    watched_percent: watchedPercent,
    last_position_seconds: lastPosition,
    updated_at: new Date().toISOString(),
  }

  // Mark as completed if watched >= 90% (or exactly 100%)
  if (watchedPercent >= 90 && !existing?.completed_at) {
    progressData.completed_at = new Date().toISOString()
  }
  
  // Ensure 100% is always marked as completed
  if (watchedPercent >= 100 && !progressData.completed_at) {
    progressData.completed_at = new Date().toISOString()
  }

  if (existing) {
    // Update existing progress using composite key
    const { data, error } = await supabase
      .from('user_episode_progress')
      .update(progressData)
      .eq('user_id', user.id)
      .eq('episode_id', episodeId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new progress
    const { data, error } = await supabase
      .from('user_episode_progress')
      .insert(progressData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Fetch continue watching (episodes with progress but not completed)
export async function fetchContinueWatching(): Promise<
  Array<{
    episode: Episode
    subject: Subject & { category_name?: string }
    progress: UserProgress
  }>
> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get user progress with episodes that are in progress
  const { data: progressData, error: progressError } = await supabase
    .from('user_episode_progress')
    .select(`
      *,
      episodes:episode_id (
        *,
        subjects:subject_id (
          *,
          categories:category_id (
            name
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .is('completed_at', null)
    .gt('watched_percent', 0)
    .order('updated_at', { ascending: false })
    .limit(10)

  if (progressError) throw progressError

  return (progressData || [])
    .map((p: any) => {
      const episode = p.episodes
      const subject = episode?.subjects
      return {
        episode,
        subject: subject
          ? {
              ...subject,
              category_name: subject.categories?.name,
            }
          : null,
        progress: p,
      }
    })
    .filter((item: any) => item.episode && item.subject)
}

// Fetch all published subjects (for course cards)
export async function fetchAllSubjects(): Promise<(Subject & { category_name?: string })[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      categories:category_id (
        name
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error

  return (data || []).map((subject: any) => ({
    ...subject,
    category_name: subject.categories?.name,
  }))
}

// Calculate subject progress
export async function getSubjectProgress(subjectId: string): Promise<{
  totalEpisodes: number
  completedEpisodes: number
  inProgressEpisodes: number
  notStartedEpisodes: number
  progressPercent: number
  hasStarted: boolean
  isCompleted: boolean
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Return default if not authenticated
    const episodes = await fetchEpisodesInSubject(subjectId)
    return {
      totalEpisodes: episodes.length,
      completedEpisodes: 0,
      inProgressEpisodes: 0,
      notStartedEpisodes: episodes.length,
      progressPercent: 0,
      hasStarted: false,
      isCompleted: false,
    }
  }

  // Get all episodes in subject
  const episodes = await fetchEpisodesInSubject(subjectId)
  if (episodes.length === 0) {
    return {
      totalEpisodes: 0,
      completedEpisodes: 0,
      inProgressEpisodes: 0,
      notStartedEpisodes: 0,
      progressPercent: 0,
      hasStarted: false,
      isCompleted: false,
    }
  }

  const episodeIds = episodes.map((e) => e.id)

  // Get user progress for all episodes
  const { data: progressData = [] } = await supabase
    .from('user_episode_progress')
    .select('episode_id, completed_at, watched_percent')
    .eq('user_id', user.id)
    .in('episode_id', episodeIds)

  const progressMap = new Map<string, { completed: boolean; watched: number }>()
  progressData.forEach((p: any) => {
    const isCompleted = p.completed_at !== null || (p.watched_percent ?? 0) >= 90
    progressMap.set(p.episode_id, {
      completed: isCompleted,
      watched: p.watched_percent ?? 0,
    })
  })

  let completedCount = 0
  let inProgressCount = 0

  episodes.forEach((episode) => {
    const progress = progressMap.get(episode.id)
    if (progress) {
      if (progress.completed) {
        completedCount++
      } else if (progress.watched > 0) {
        inProgressCount++
      }
    }
  })

  const notStartedCount = episodes.length - completedCount - inProgressCount
  const progressPercent = episodes.length > 0 ? (completedCount / episodes.length) * 100 : 0

  return {
    totalEpisodes: episodes.length,
    completedEpisodes: completedCount,
    inProgressEpisodes: inProgressCount,
    notStartedEpisodes: notStartedCount,
    progressPercent: Math.round(progressPercent),
    hasStarted: completedCount > 0 || inProgressCount > 0,
    isCompleted: completedCount === episodes.length && episodes.length > 0,
  }
}

// Calculate category progress
export async function getCategoryProgress(categoryId: string): Promise<{
  totalSubjects: number
  completedSubjects: number
  inProgressSubjects: number
  notStartedSubjects: number
  progressPercent: number
  hasStarted: boolean
  isCompleted: boolean
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const subjects = await fetchSubjectsInCategory(categoryId)
    return {
      totalSubjects: subjects.length,
      completedSubjects: 0,
      inProgressSubjects: 0,
      notStartedSubjects: subjects.length,
      progressPercent: 0,
      hasStarted: false,
      isCompleted: false,
    }
  }

  // Get all subjects in category
  const subjects = await fetchSubjectsInCategory(categoryId)
  if (subjects.length === 0) {
    return {
      totalSubjects: 0,
      completedSubjects: 0,
      inProgressSubjects: 0,
      notStartedSubjects: 0,
      progressPercent: 0,
      hasStarted: false,
      isCompleted: false,
    }
  }

  // Calculate progress for each subject
  const subjectProgresses = await Promise.all(
    subjects.map((subject) => getSubjectProgress(subject.id))
  )

  let completedCount = 0
  let inProgressCount = 0

  subjectProgresses.forEach((progress) => {
    if (progress.isCompleted) {
      completedCount++
    } else if (progress.hasStarted) {
      inProgressCount++
    }
  })

  const notStartedCount = subjects.length - completedCount - inProgressCount
  const progressPercent = subjects.length > 0 ? (completedCount / subjects.length) * 100 : 0

  return {
    totalSubjects: subjects.length,
    completedSubjects: completedCount,
    inProgressSubjects: inProgressCount,
    notStartedSubjects: notStartedCount,
    progressPercent: Math.round(progressPercent),
    hasStarted: completedCount > 0 || inProgressCount > 0,
    isCompleted: completedCount === subjects.length && subjects.length > 0,
  }
}

// Optimized batch function to get progress for multiple subjects in one go
export async function getSubjectsProgress(
  subjectIds: string[]
): Promise<Record<string, Awaited<ReturnType<typeof getSubjectProgress>>>> {
  if (subjectIds.length === 0) return {}

  const { data: { user } } = await supabase.auth.getUser()
  const progressMap: Record<string, Awaited<ReturnType<typeof getSubjectProgress>>> = {}

  // Initialize all subjects with default values
  subjectIds.forEach((subjectId) => {
    progressMap[subjectId] = {
      totalEpisodes: 0,
      completedEpisodes: 0,
      inProgressEpisodes: 0,
      notStartedEpisodes: 0,
      progressPercent: 0,
      hasStarted: false,
      isCompleted: false,
    }
  })

  // Fetch all episodes for all subjects in one query
  const { data: allEpisodes = [], error: episodesError } = await supabase
    .from('episodes')
    .select('id, subject_id')
    .in('subject_id', subjectIds)
    .eq('status', 'published')

  if (episodesError) {
    console.error('Error fetching episodes:', episodesError)
    return progressMap
  }

  // Group episodes by subject_id
  const episodesBySubject = new Map<string, string[]>()
  allEpisodes.forEach((episode: any) => {
    if (!episodesBySubject.has(episode.subject_id)) {
      episodesBySubject.set(episode.subject_id, [])
    }
    episodesBySubject.get(episode.subject_id)!.push(episode.id)
  })

  // Update total episodes for each subject
  episodesBySubject.forEach((episodeIds, subjectId) => {
    if (progressMap[subjectId]) {
      progressMap[subjectId].totalEpisodes = episodeIds.length
    }
  })

  if (!user) {
    // If not authenticated, set notStartedEpisodes
    episodesBySubject.forEach((episodeIds, subjectId) => {
      if (progressMap[subjectId]) {
        progressMap[subjectId].notStartedEpisodes = episodeIds.length
      }
    })
    return progressMap
  }

  // Fetch all progress data in one query
  const allEpisodeIds = allEpisodes.map((e: any) => e.id)
  if (allEpisodeIds.length === 0) return progressMap

  const { data: allProgress = [], error: progressError } = await supabase
    .from('user_episode_progress')
    .select('episode_id, completed_at, watched_percent')
    .eq('user_id', user.id)
    .in('episode_id', allEpisodeIds)

  if (progressError) {
    console.error('Error fetching progress:', progressError)
    return progressMap
  }

  // Create progress map for quick lookup
  const episodeProgressMap = new Map<string, { completed: boolean; watched: number }>()
  allProgress.forEach((p: any) => {
    const isCompleted = p.completed_at !== null || (p.watched_percent ?? 0) >= 90
    episodeProgressMap.set(p.episode_id, {
      completed: isCompleted,
      watched: p.watched_percent ?? 0,
    })
  })

  // Calculate progress for each subject
  episodesBySubject.forEach((episodeIds, subjectId) => {
    if (!progressMap[subjectId]) return

    let completedCount = 0
    let inProgressCount = 0

    episodeIds.forEach((episodeId) => {
      const progress = episodeProgressMap.get(episodeId)
      if (progress) {
        if (progress.completed) {
          completedCount++
        } else if (progress.watched > 0) {
          inProgressCount++
        }
      }
    })

    const total = episodeIds.length
    const notStartedCount = total - completedCount - inProgressCount
    const progressPercent = total > 0 ? (completedCount / total) * 100 : 0

    progressMap[subjectId] = {
      totalEpisodes: total,
      completedEpisodes: completedCount,
      inProgressEpisodes: inProgressCount,
      notStartedEpisodes: notStartedCount,
      progressPercent: Math.round(progressPercent),
      hasStarted: completedCount > 0 || inProgressCount > 0,
      isCompleted: completedCount === total && total > 0,
    }
  })

  return progressMap
}

// Get number of learners (users who have started learning) for multiple subjects
export async function getSubjectsLearnerCounts(
  subjectIds: string[]
): Promise<Record<string, number>> {
  if (subjectIds.length === 0) return {}

  // Fetch all episodes for all subjects
  const { data: allEpisodes = [], error: episodesError } = await supabase
    .from('episodes')
    .select('id, subject_id')
    .in('subject_id', subjectIds)
    .eq('status', 'published')

  if (episodesError || allEpisodes.length === 0) {
    return subjectIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
  }

  const allEpisodeIds = allEpisodes.map((e: any) => e.id)

  // Count distinct users who have progress on any episode in each subject
  const { data: progressData = [], error: progressError } = await supabase
    .from('user_episode_progress')
    .select('episode_id, user_id')
    .in('episode_id', allEpisodeIds)

  if (progressError) {
    console.error('Error fetching learner counts:', progressError)
    return subjectIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
  }

  // Group episodes by subject
  const episodesBySubject = new Map<string, string[]>()
  allEpisodes.forEach((episode: any) => {
    if (!episodesBySubject.has(episode.subject_id)) {
      episodesBySubject.set(episode.subject_id, [])
    }
    episodesBySubject.get(episode.subject_id)!.push(episode.id)
  })

  // Count distinct users per subject
  const learnerCounts: Record<string, number> = {}
  subjectIds.forEach((subjectId) => {
    learnerCounts[subjectId] = 0
  })

  episodesBySubject.forEach((episodeIds, subjectId) => {
    const usersSet = new Set<string>()
    progressData.forEach((p: any) => {
      if (episodeIds.includes(p.episode_id)) {
        usersSet.add(p.user_id)
      }
    })
    learnerCounts[subjectId] = usersSet.size
  })

  return learnerCounts
}

// Optimized batch function to get progress for multiple categories
export async function getCategoriesProgress(
  categoryIds: string[]
): Promise<Record<string, Awaited<ReturnType<typeof getCategoryProgress>>>> {
  if (categoryIds.length === 0) return {}

  const { data: { user } } = await supabase.auth.getUser()
  const progressMap: Record<string, Awaited<ReturnType<typeof getCategoryProgress>>> = {}

  // Initialize all categories with default values
  categoryIds.forEach((categoryId) => {
    progressMap[categoryId] = {
      totalSubjects: 0,
      completedSubjects: 0,
      inProgressSubjects: 0,
      notStartedSubjects: 0,
      progressPercent: 0,
      hasStarted: false,
      isCompleted: false,
    }
  })

  // Fetch all subjects for all categories in one query
  const { data: allSubjects = [], error: subjectsError } = await supabase
    .from('subjects')
    .select('id, category_id')
    .in('category_id', categoryIds)
    .eq('status', 'published')

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError)
    return progressMap
  }

  // Group subjects by category_id
  const subjectsByCategory = new Map<string, string[]>()
  allSubjects.forEach((subject: any) => {
    if (!subjectsByCategory.has(subject.category_id)) {
      subjectsByCategory.set(subject.category_id, [])
    }
    subjectsByCategory.get(subject.category_id)!.push(subject.id)
  })

  // Update total subjects for each category
  subjectsByCategory.forEach((subjectIds, categoryId) => {
    if (progressMap[categoryId]) {
      progressMap[categoryId].totalSubjects = subjectIds.length
    }
  })

  // Get progress for all subjects using optimized batch function
  const allSubjectIds = allSubjects.map((s: any) => s.id)
  const subjectsProgressMap = await getSubjectsProgress(allSubjectIds)

  // Calculate category progress from subject progress
  subjectsByCategory.forEach((subjectIds, categoryId) => {
    if (!progressMap[categoryId]) return

    let completedCount = 0
    let inProgressCount = 0

    subjectIds.forEach((subjectId) => {
      const subjectProgress = subjectsProgressMap[subjectId]
      if (subjectProgress) {
        if (subjectProgress.isCompleted) {
          completedCount++
        } else if (subjectProgress.hasStarted) {
          inProgressCount++
        }
      }
    })

    const total = subjectIds.length
    const notStartedCount = total - completedCount - inProgressCount
    const progressPercent = total > 0 ? (completedCount / total) * 100 : 0

    progressMap[categoryId] = {
      totalSubjects: total,
      completedSubjects: completedCount,
      inProgressSubjects: inProgressCount,
      notStartedSubjects: notStartedCount,
      progressPercent: Math.round(progressPercent),
      hasStarted: completedCount > 0 || inProgressCount > 0,
      isCompleted: completedCount === total && total > 0,
    }
  })

  return progressMap
}
