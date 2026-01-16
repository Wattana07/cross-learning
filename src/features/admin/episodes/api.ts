import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/logger'
import type { Episode, ContentStatus, MediaType } from '@/lib/database.types'

// Fetch all episodes by subject
export async function fetchEpisodesBySubject(subjectId: string): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_no', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch single episode
export async function fetchEpisode(id: string): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create episode
export async function createEpisode(episode: {
  subject_id: string
  title: string
  description?: string | null
  order_no?: number
  status?: ContentStatus
  primary_media_type: MediaType
  video_url?: string | null
  video_path?: string | null
  pdf_path?: string | null
  duration_seconds?: number | null
  points_reward?: number | null
}): Promise<Episode> {
  // Get max order_no for this subject
  const { data: existing } = await supabase
    .from('episodes')
    .select('order_no')
    .eq('subject_id', episode.subject_id)
    .order('order_no', { ascending: false })
    .limit(1)

  const maxOrder = existing && existing.length > 0 ? existing[0].order_no : 0
  const orderNo = episode.order_no ?? maxOrder + 1

  // Prepare data based on media type
  const insertData: any = {
    subject_id: episode.subject_id,
    title: episode.title,
    description: episode.description || null,
    order_no: orderNo,
    status: episode.status || 'draft',
    primary_media_type: episode.primary_media_type,
    duration_seconds: episode.duration_seconds || null,
    points_reward: episode.points_reward || null,
  }

  // Set media fields based on type
  if (episode.primary_media_type === 'video_url') {
    insertData.video_url = episode.video_url
    insertData.video_path = null
    insertData.pdf_path = null
  } else if (episode.primary_media_type === 'video_upload') {
    insertData.video_url = null
    insertData.video_path = episode.video_path
    insertData.pdf_path = null
  } else if (episode.primary_media_type === 'pdf') {
    insertData.video_url = null
    insertData.video_path = null
    insertData.pdf_path = episode.pdf_path
  }

  const { data, error } = await supabase
    .from('episodes')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    await logger.error('episode_create', {
      resourceType: 'episode',
      errorMessage: error.message,
      details: { title: episode.title, subject_id: episode.subject_id },
    })
    throw error
  }
  
  await logger.success('episode_create', {
    resourceType: 'episode',
    resourceId: data.id,
    details: { title: data.title, subject_id: data.subject_id, status: data.status },
  })
  
  return data
}

// Update episode
export async function updateEpisode(
  id: string,
  updates: {
    title?: string
    description?: string | null
    order_no?: number
    status?: ContentStatus
    primary_media_type?: MediaType
    video_url?: string | null
    video_path?: string | null
    pdf_path?: string | null
    duration_seconds?: number | null
    points_reward?: number | null
  }
): Promise<Episode> {
  // Prepare update data
  const updateData: any = { ...updates }

  // If media type changed, clear other media fields
  if (updates.primary_media_type) {
    if (updates.primary_media_type === 'video_url') {
      updateData.video_path = null
      updateData.pdf_path = null
      if (!updates.video_url) {
        updateData.video_url = null
      }
    } else if (updates.primary_media_type === 'video_upload') {
      updateData.video_url = null
      updateData.pdf_path = null
      if (!updates.video_path) {
        updateData.video_path = null
      }
    } else if (updates.primary_media_type === 'pdf') {
      updateData.video_url = null
      updateData.video_path = null
      if (!updates.pdf_path) {
        updateData.pdf_path = null
      }
    }
  }

  const { data, error } = await supabase
    .from('episodes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logger.error('episode_update', {
      resourceType: 'episode',
      resourceId: id,
      errorMessage: error.message,
    })
    throw error
  }
  
  await logger.success('episode_update', {
    resourceType: 'episode',
    resourceId: id,
    details: updates,
  })
  
  return data
}

// Delete episode
export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase.from('episodes').delete().eq('id', id)

  if (error) {
    await logger.error('episode_delete', {
      resourceType: 'episode',
      resourceId: id,
      errorMessage: error.message,
    })
    throw error
  }
  
  await logger.success('episode_delete', {
    resourceType: 'episode',
    resourceId: id,
  })
}

// Reorder episodes (update order_no for multiple episodes)
export async function reorderEpisodes(
  subjectId: string,
  episodeOrders: { id: string; order_no: number }[]
): Promise<void> {
  // Update each episode's order_no
  for (const { id, order_no } of episodeOrders) {
    const { error } = await supabase
      .from('episodes')
      .update({ order_no })
      .eq('id', id)
      .eq('subject_id', subjectId)

    if (error) throw error
  }
}

// Fetch subjects for dropdown
export async function fetchSubjectsForSelect(): Promise<{ id: string; title: string; category_name?: string }[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      id,
      title,
      categories:category_id (
        name
      )
    `)
    .order('title')

  if (error) throw error
  
  return (data || []).map((subject: any) => ({
    id: subject.id,
    title: subject.title,
    category_name: subject.categories?.name,
  }))
}

