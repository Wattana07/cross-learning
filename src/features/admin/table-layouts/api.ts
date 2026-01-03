import { supabase } from '@/lib/supabaseClient'

export interface TableLayout {
  id: string
  room_category_id: string
  name: string
  description: string | null
  image_url: string | null
  max_capacity: number
  order_no: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Fetch all table layouts
export async function fetchTableLayouts(): Promise<TableLayout[]> {
  const { data, error } = await supabase
    .from('table_layouts')
    .select('*')
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch table layouts by category
export async function fetchTableLayoutsByCategory(categoryId: string): Promise<TableLayout[]> {
  const { data, error } = await supabase
    .from('table_layouts')
    .select('*')
    .eq('room_category_id', categoryId)
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch single table layout
export async function fetchTableLayout(id: string): Promise<TableLayout> {
  const { data, error } = await supabase
    .from('table_layouts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create table layout
export async function createTableLayout(layout: {
  room_category_id: string
  name: string
  description?: string | null
  image_url?: string | null
  max_capacity?: number
  order_no?: number
  is_active?: boolean
}): Promise<TableLayout> {
  const { data, error } = await supabase
    .from('table_layouts')
    .insert({
      room_category_id: layout.room_category_id,
      name: layout.name,
      description: layout.description || null,
      image_url: layout.image_url || null,
      max_capacity: layout.max_capacity ?? 1,
      order_no: layout.order_no ?? 0,
      is_active: layout.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update table layout
export async function updateTableLayout(
  id: string,
  updates: {
    room_category_id?: string
    name?: string
    description?: string | null
    image_url?: string | null
    max_capacity?: number
    order_no?: number
    is_active?: boolean
  }
): Promise<TableLayout> {
  const { data, error } = await supabase
    .from('table_layouts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete table layout
export async function deleteTableLayout(id: string): Promise<void> {
  const { error } = await supabase.from('table_layouts').delete().eq('id', id)

  if (error) throw error
}

