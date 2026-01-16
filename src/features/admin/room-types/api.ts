import { supabase } from '@/lib/supabaseClient'

export interface RoomType {
  id: string
  name: string
  description: string | null
  order_no: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Fetch all room types
export async function fetchRoomTypes(): Promise<RoomType[]> {
  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch single room type
export async function fetchRoomType(id: string): Promise<RoomType> {
  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create room type
export async function createRoomType(roomType: {
  name: string
  description?: string | null
  order_no?: number
  is_active?: boolean
}): Promise<RoomType> {
  const { data, error } = await supabase
    .from('room_types')
    .insert({
      name: roomType.name,
      description: roomType.description || null,
      order_no: roomType.order_no ?? 0,
      is_active: roomType.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update room type
export async function updateRoomType(
  id: string,
  updates: {
    name?: string
    description?: string | null
    order_no?: number
    is_active?: boolean
  }
): Promise<RoomType> {
  const { data, error } = await supabase
    .from('room_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete room type
export async function deleteRoomType(id: string): Promise<void> {
  const { error } = await supabase.from('room_types').delete().eq('id', id)

  if (error) throw error
}

