import { useQuery } from '@tanstack/react-query'
import {
  fetchCategory,
  fetchSubjectsInCategory,
  fetchSubject,
  fetchEpisodesInSubject,
  fetchUserProgress,
  fetchEpisode,
} from '@/features/learning/api'
import { getSubjectCoverUrl } from '@/lib/storage'

// Fetch categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'published'],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabaseClient')
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'published')
        .order('name')

      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (categories don't change often)
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Fetch category by ID
export function useCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategory(categoryId!),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Fetch subjects in category
export function useSubjectsInCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['subjects', 'category', categoryId],
    queryFn: () => fetchSubjectsInCategory(categoryId!),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Fetch subject with cover URL
export function useSubject(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['subject', subjectId],
    queryFn: async () => {
      const subject = await fetchSubject(subjectId!)
      let coverUrl = null
      if (subject.cover_path) {
        coverUrl = await getSubjectCoverUrl(subject.cover_path)
      }
      return { subject, coverUrl }
    },
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Fetch episodes in subject
export function useEpisodesInSubject(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['episodes', 'subject', subjectId],
    queryFn: () => fetchEpisodesInSubject(subjectId!),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Fetch user progress for episodes
export function useUserProgress(episodeIds: string[]) {
  return useQuery({
    queryKey: ['user-progress', episodeIds.sort().join(',')],
    queryFn: () => fetchUserProgress(episodeIds),
    enabled: episodeIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent updates)
    gcTime: 1000 * 60 * 15, // 15 minutes
  })
}

// Fetch single episode
export function useEpisode(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => fetchEpisode(episodeId!),
    enabled: !!episodeId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Fetch subjects with cover URLs in parallel
export function useSubjectsWithCovers(categoryId: string | undefined) {
  const { data: subjects = [], isLoading } = useSubjectsInCategory(categoryId)

  const { data, isLoading: coversLoading } = useQuery({
    queryKey: ['subjects-with-covers', categoryId, subjects.map(s => s.id).sort().join(',')],
    queryFn: async () => {
      if (subjects.length === 0) {
        return { subjects: [], coverUrls: {} }
      }

      // Load all cover URLs in parallel
      const coverPromises = subjects.map(async (subject) => {
        if (subject.cover_path) {
          try {
            const url = await getSubjectCoverUrl(subject.cover_path)
            return { subjectId: subject.id, url }
          } catch {
            return { subjectId: subject.id, url: null }
          }
        }
        return { subjectId: subject.id, url: null }
      })

      const coverResults = await Promise.all(coverPromises)
      const coverUrls: Record<string, string> = {}
      coverResults.forEach(({ subjectId, url }) => {
        if (url) coverUrls[subjectId] = url
      })

      return { subjects, coverUrls }
    },
    enabled: !isLoading && subjects.length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes (cover URLs are very stable)
    gcTime: 1000 * 60 * 60, // 1 hour (keep in cache longer)
  })

  return {
    data: data || { subjects: [], coverUrls: {} },
    isLoading: isLoading || coversLoading,
  }
}

