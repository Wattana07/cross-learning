import { supabase } from '@/lib/supabaseClient'

export interface RoomCategory {
  id: string
  name: string
  description: string | null
  order_no: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Fetch all room categories
export async function fetchRoomCategories(): Promise<RoomCategory[]> {
  const { data, error } = await supabase
    .from('room_categories')
    .select('*')
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch single room category
export async function fetchRoomCategory(id: string): Promise<RoomCategory> {
  const { data, error } = await supabase
    .from('room_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create room category
export async function createRoomCategory(category: {
  name: string
  description?: string | null
  order_no?: number
  is_active?: boolean
}): Promise<RoomCategory> {
  const { data, error } = await supabase
    .from('room_categories')
    .insert({
      name: category.name,
      description: category.description || null,
      order_no: category.order_no ?? 0,
      is_active: category.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update room category
export async function updateRoomCategory(
  id: string,
  updates: {
    name?: string
    description?: string | null
    order_no?: number
    is_active?: boolean
  }
): Promise<RoomCategory> {
  const { data, error } = await supabase
    .from('room_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete room category
export async function deleteRoomCategory(id: string): Promise<void> {
  const { error } = await supabase.from('room_categories').delete().eq('id', id)

  if (error) throw error
}

