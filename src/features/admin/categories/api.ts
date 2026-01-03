import { supabase } from '@/lib/supabaseClient'
import type { Category, ContentStatus } from '@/lib/database.types'

// Fetch all categories (admin sees all, including draft/hidden)
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

// Fetch single category
export async function fetchCategory(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create category
export async function createCategory(category: {
  name: string
  description?: string | null
  thumbnail_path?: string | null
  status?: ContentStatus
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: category.name,
      description: category.description || null,
      thumbnail_path: category.thumbnail_path || null,
      status: category.status || 'published',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update category
export async function updateCategory(
  id: string,
  updates: {
    name?: string
    description?: string | null
    thumbnail_path?: string | null
    status?: ContentStatus
  }
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete category
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) throw error
}

