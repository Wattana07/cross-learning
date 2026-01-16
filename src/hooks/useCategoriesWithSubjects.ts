import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { getSubjectCoverUrl } from '@/lib/storage'
import type { Category, Subject } from '@/lib/database.types'

interface CategoryWithSubjects extends Category {
  subjects: (Subject & { coverUrl?: string | null })[]
}

export function useCategoriesWithSubjects() {
  return useQuery({
    queryKey: ['categories-with-subjects'],
    queryFn: async () => {
      // Fetch all published categories - ordered by created_at (oldest first for sequential learning)
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true })

      if (categoriesError) throw categoriesError

      if (!categories || categories.length === 0) {
        return []
      }

      // Fetch all published subjects with their category - ordered by order_no
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('status', 'published')
        .order('category_id', { ascending: true })
        .order('order_no', { ascending: true })

      if (subjectsError) throw subjectsError

      // Group subjects by category
      const categoryMap = new Map<string, CategoryWithSubjects>()
      
      categories.forEach((category) => {
        categoryMap.set(category.id, {
          ...category,
          subjects: [],
        })
      })

      // Add subjects to their categories (already ordered by created_at)
      if (subjects) {
        subjects.forEach((subject) => {
          const category = categoryMap.get(subject.category_id)
          if (category) {
            category.subjects.push(subject)
          }
        })
      }

      // Ensure subjects in each category maintain order (by order_no, ascending: 1, 2, 3, 4...)
      categoryMap.forEach((category) => {
        category.subjects.sort((a, b) => {
          const orderA = a.order_no ?? 999999 // Put null/undefined at the end
          const orderB = b.order_no ?? 999999
          return orderA - orderB // Ascending: 1, 2, 3, 4...
        })
      })

      // Load cover URLs for all subjects in parallel
      const allSubjects = subjects || []
      const coverPromises = allSubjects.map(async (subject) => {
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

      // Add cover URLs to subjects and ensure order_no is preserved
      categoryMap.forEach((category) => {
        category.subjects = category.subjects.map((subject) => ({
          ...subject,
          coverUrl: coverUrls[subject.id] || null,
          // Ensure order_no is a number
          order_no: subject.order_no ?? null,
        }))
      })

      // Final sort to ensure correct order (1, 2, 3, 4...)
      categoryMap.forEach((category) => {
        category.subjects.sort((a, b) => {
          const orderA = a.order_no ?? 999999
          const orderB = b.order_no ?? 999999
          return orderA - orderB
        })
      })

      return Array.from(categoryMap.values())
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (categories don't change often)
    gcTime: 1000 * 60 * 30, // 30 minutes (keep in cache longer)
  })
}

