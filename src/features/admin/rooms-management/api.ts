import { supabase } from '@/lib/supabaseClient'
import type { RoomStatus } from '@/lib/database.types'

export interface Room {
  id: string
  name: string
  location: string | null
  capacity: number
  features_json: Record<string, any>
  status: RoomStatus
  room_category_id?: string | null
  room_type_id?: string | null
  table_layout_id?: string | null
  created_at: string
  updated_at: string
}

export interface RoomWithRelations extends Room {
  room_category_name?: string
  room_type_name?: string
  table_layout_name?: string
}

// Fetch all rooms
export async function fetchRooms(): Promise<RoomWithRelations[]> {
  // Try to fetch with relations first
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_category:room_categories!room_category_id(name),
        room_type:room_types!room_type_id(name),
        table_layout:table_layouts!table_layout_id(name)
      `)
      .order('name', { ascending: true })

    if (error) throw error
    
    return (data || []).map((room: any) => ({
      ...room,
      room_category_id: room.room_category_id || null,
      room_type_id: room.room_type_id || null,
      table_layout_id: room.table_layout_id || null,
      room_category_name: room.room_category?.name,
      room_type_name: room.room_type?.name,
      table_layout_name: room.table_layout?.name,
    }))
  } catch (error: any) {
    // If foreign key columns don't exist yet, fetch without relations
    if (error.message?.includes('column') || error.message?.includes('does not exist') || error.message?.includes('relation')) {
      const { data: simpleData, error: simpleError } = await supabase
        .from('rooms')
        .select('*')
        .order('name', { ascending: true })
      
      if (simpleError) throw simpleError
      return (simpleData || []).map((room: any) => ({
        ...room,
        room_category_id: room.room_category_id || null,
        room_type_id: room.room_type_id || null,
        table_layout_id: room.table_layout_id || null,
        room_category_name: undefined,
        room_type_name: undefined,
        table_layout_name: undefined,
      }))
    }
    throw error
  }
}

// Fetch single room
export async function fetchRoom(id: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create room
export async function createRoom(room: {
  name: string
  location?: string | null
  capacity?: number
  room_category_id?: string | null
  room_type_id?: string | null
  table_layout_id?: string | null
  features_json?: Record<string, any>
  status?: RoomStatus
}): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name: room.name,
      location: room.location || null,
      capacity: room.capacity ?? 1,
      room_category_id: room.room_category_id || null,
      room_type_id: room.room_type_id || null,
      table_layout_id: room.table_layout_id || null,
      features_json: room.features_json || {},
      status: room.status || 'active',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update room
export async function updateRoom(
  id: string,
  updates: {
    name?: string
    location?: string | null
    capacity?: number
    room_category_id?: string | null
    room_type_id?: string | null
    table_layout_id?: string | null
    features_json?: Record<string, any>
    status?: RoomStatus
  }
): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete room
export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id)

  if (error) throw error
}

