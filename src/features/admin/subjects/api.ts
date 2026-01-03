import { supabase } from '@/lib/supabaseClient'
import type { Subject, ContentStatus, UnlockMode } from '@/lib/database.types'

// Fetch all subjects with category info (admin sees all, including draft/hidden)
export async function fetchSubjects(): Promise<(Subject & { category_name?: string })[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      categories:category_id (
        name
      )
    `)
    .order('category_id', { ascending: true })
    .order('order_no', { ascending: true })

  if (error) throw error
  
  return (data || []).map((subject: any) => ({
    ...subject,
    category_name: subject.categories?.name,
  }))
}

// Fetch subjects by category
export async function fetchSubjectsByCategory(categoryId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('category_id', categoryId)
    .order('order_no', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch single subject
export async function fetchSubject(id: string): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create subject
export async function createSubject(subject: {
  category_id: string
  title: string
  description?: string | null
  cover_path?: string | null
  level?: string | null
  unlock_mode?: UnlockMode
  status?: ContentStatus
}): Promise<Subject> {
  // Get the max order_no for this category
  const { data: existingSubjects } = await supabase
    .from('subjects')
    .select('order_no')
    .eq('category_id', subject.category_id)
    .order('order_no', { ascending: false })
    .limit(1)

  const maxOrder = existingSubjects && existingSubjects.length > 0 
    ? (existingSubjects[0].order_no || 0) + 1 
    : 1

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      category_id: subject.category_id,
      title: subject.title,
      description: subject.description || null,
      cover_path: subject.cover_path || null,
      level: subject.level || 'beginner',
      unlock_mode: subject.unlock_mode || 'sequential',
      status: subject.status || 'draft',
      order_no: maxOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update subject
export async function updateSubject(
  id: string,
  updates: {
    category_id?: string
    title?: string
    description?: string | null
    cover_path?: string | null
    level?: string | null
    unlock_mode?: UnlockMode
    status?: ContentStatus
  }
): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete subject
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id)

  if (error) throw error
}

// Reorder subjects (update order_no for multiple subjects in a category)
export async function reorderSubjects(
  categoryId: string,
  subjectOrders: { id: string; order_no: number }[]
): Promise<void> {
  // Update each subject's order_no
  for (const { id, order_no } of subjectOrders) {
    const { error } = await supabase
      .from('subjects')
      .update({ order_no })
      .eq('id', id)
      .eq('category_id', categoryId)

    if (error) throw error
  }
}

// Fetch all categories for dropdown
export async function fetchCategoriesForSelect(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  if (error) throw error
  return data || []
}

