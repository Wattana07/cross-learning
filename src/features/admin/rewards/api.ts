import { supabase } from '@/lib/supabaseClient'
import type { PointRule } from '@/lib/database.types'

// Fetch all point rules (admin can see all, including inactive)
export async function fetchPointRules(): Promise<PointRule[]> {
  const { data, error } = await supabase
    .from('point_rules')
    .select('*')
    .order('points', { ascending: false })

  if (error) throw error
  return data || []
}

// Update a point rule
export async function updatePointRule(
  key: string,
  updates: {
    points?: number
    is_active?: boolean
    description?: string | null
  }
): Promise<PointRule> {
  const { data, error } = await supabase
    .from('point_rules')
    .update(updates)
    .eq('key', key)
    .select()
    .single()

  if (error) throw error
  return data
}

