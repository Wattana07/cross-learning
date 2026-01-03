import { supabase } from './supabaseClient'

const AVATAR_BUCKET = 'user-avatars'

// Upload avatar image
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }

  // Validate file size (max 15MB)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 15MB')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  // Delete old avatar if exists
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_path')
      .eq('id', userId)
      .single()

    if (profile?.avatar_path) {
      // Extract path (could be full path or just path)
      let oldPath = profile.avatar_path
      if (oldPath.startsWith(`${AVATAR_BUCKET}/`)) {
        oldPath = oldPath.replace(`${AVATAR_BUCKET}/`, '')
      }
      // Try to delete, but don't fail if it doesn't exist
      await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
    }
  } catch (error) {
    // Ignore errors when deleting old avatar
    console.warn('Could not delete old avatar:', error)
  }

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    // Check if bucket exists
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
      throw new Error('Storage bucket ยังไม่ได้สร้าง กรุณาติดต่อผู้ดูแลระบบ')
    }
    throw new Error(`ไม่สามารถอัปโหลดรูป: ${uploadError.message}`)
  }

  // Return path for database
  return `${AVATAR_BUCKET}/${filePath}`
}

// Get signed URL for avatar
export async function getAvatarUrl(avatarPath: string | null): Promise<string | null> {
  if (!avatarPath) return null

  try {
    // Extract path (could be full path or just path)
    let path = avatarPath
    if (path.startsWith(`${AVATAR_BUCKET}/`)) {
      path = path.replace(`${AVATAR_BUCKET}/`, '')
    }

    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (error) {
      // If bucket doesn't exist or file not found, return null silently
      if (
        error.message.includes('Bucket not found') ||
        error.message.includes('not found') ||
        error.message.includes('Failed to fetch')
      ) {
        console.warn('Avatar not available:', error.message)
        return null
      }
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.warn('Error in getAvatarUrl:', error)
    return null
  }
}

// Delete avatar
export async function deleteAvatar(userId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_path')
      .eq('id', userId)
      .single()

    if (profile?.avatar_path) {
      // Extract path (could be full path or just path)
      let path = profile.avatar_path
      if (path.startsWith(`${AVATAR_BUCKET}/`)) {
        path = path.replace(`${AVATAR_BUCKET}/`, '')
      }
      await supabase.storage.from(AVATAR_BUCKET).remove([path])
    }
  } catch (error) {
    console.warn('Error deleting avatar:', error)
    // Don't throw - allow deletion to continue even if storage fails
  }
}

// ============================================
// Category Thumbnails
// ============================================
const CATEGORY_THUMBNAIL_BUCKET = 'category-thumbs'

// Upload category thumbnail
export async function uploadCategoryThumbnail(file: File, categoryId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 15MB')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${categoryId}-${Date.now()}.${fileExt}`
  const filePath = `${categoryId}/${fileName}`

  // Delete old thumbnail if exists
  try {
    const { data: category } = await supabase
      .from('categories')
      .select('thumbnail_path')
      .eq('id', categoryId)
      .single()

    if (category?.thumbnail_path) {
      let oldPath = category.thumbnail_path
      if (oldPath.startsWith(`${CATEGORY_THUMBNAIL_BUCKET}/`)) {
        oldPath = oldPath.replace(`${CATEGORY_THUMBNAIL_BUCKET}/`, '')
      }
      await supabase.storage.from(CATEGORY_THUMBNAIL_BUCKET).remove([oldPath])
    }
  } catch (error) {
    console.warn('Could not delete old thumbnail:', error)
  }

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from(CATEGORY_THUMBNAIL_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
      throw new Error('Storage bucket ยังไม่ได้สร้าง กรุณาติดต่อผู้ดูแลระบบ')
    }
    throw new Error(`ไม่สามารถอัปโหลดรูป: ${uploadError.message}`)
  }

  return `${CATEGORY_THUMBNAIL_BUCKET}/${filePath}`
}

// Get signed URL for category thumbnail
export async function getCategoryThumbnailUrl(thumbnailPath: string | null): Promise<string | null> {
  if (!thumbnailPath) return null

  try {
    let path = thumbnailPath
    if (path.startsWith(`${CATEGORY_THUMBNAIL_BUCKET}/`)) {
      path = path.replace(`${CATEGORY_THUMBNAIL_BUCKET}/`, '')
    }

    const { data, error } = await supabase.storage
      .from(CATEGORY_THUMBNAIL_BUCKET)
      .createSignedUrl(path, 3600)

    if (error) {
      if (
        error.message.includes('Bucket not found') ||
        error.message.includes('not found') ||
        error.message.includes('Failed to fetch')
      ) {
        console.warn('Thumbnail not available:', error.message)
        return null
      }
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.warn('Error in getCategoryThumbnailUrl:', error)
    return null
  }
}

// Delete category thumbnail
export async function deleteCategoryThumbnail(categoryId: string): Promise<void> {
  try {
    const { data: category } = await supabase
      .from('categories')
      .select('thumbnail_path')
      .eq('id', categoryId)
      .single()

    if (category?.thumbnail_path) {
      let path = category.thumbnail_path
      if (path.startsWith(`${CATEGORY_THUMBNAIL_BUCKET}/`)) {
        path = path.replace(`${CATEGORY_THUMBNAIL_BUCKET}/`, '')
      }
      await supabase.storage.from(CATEGORY_THUMBNAIL_BUCKET).remove([path])
    }
  } catch (error) {
    console.warn('Error deleting thumbnail:', error)
  }
}

// ============================================
// Subject Covers
// ============================================
const SUBJECT_COVER_BUCKET = 'subject-covers'

// Upload subject cover
export async function uploadSubjectCover(file: File, subjectId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 15MB')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${subjectId}-${Date.now()}.${fileExt}`
  const filePath = `${subjectId}/${fileName}`

  // Delete old cover if exists
  try {
    const { data: subject } = await supabase
      .from('subjects')
      .select('cover_path')
      .eq('id', subjectId)
      .single()

    if (subject?.cover_path) {
      let oldPath = subject.cover_path
      if (oldPath.startsWith(`${SUBJECT_COVER_BUCKET}/`)) {
        oldPath = oldPath.replace(`${SUBJECT_COVER_BUCKET}/`, '')
      }
      await supabase.storage.from(SUBJECT_COVER_BUCKET).remove([oldPath])
    }
  } catch (error) {
    console.warn('Could not delete old cover:', error)
  }

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from(SUBJECT_COVER_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
      throw new Error('Storage bucket ยังไม่ได้สร้าง กรุณาติดต่อผู้ดูแลระบบ')
    }
    throw new Error(`ไม่สามารถอัปโหลดรูป: ${uploadError.message}`)
  }

  return `${SUBJECT_COVER_BUCKET}/${filePath}`
}

// Get signed URL for subject cover
export async function getSubjectCoverUrl(coverPath: string | null): Promise<string | null> {
  if (!coverPath) return null

  try {
    let path = coverPath
    if (path.startsWith(`${SUBJECT_COVER_BUCKET}/`)) {
      path = path.replace(`${SUBJECT_COVER_BUCKET}/`, '')
    }

    const { data, error } = await supabase.storage
      .from(SUBJECT_COVER_BUCKET)
      .createSignedUrl(path, 3600)

    if (error) {
      if (
        error.message.includes('Bucket not found') ||
        error.message.includes('not found') ||
        error.message.includes('Failed to fetch')
      ) {
        console.warn('Cover not available:', error.message)
        return null
      }
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.warn('Error in getSubjectCoverUrl:', error)
    return null
  }
}

// Delete subject cover
export async function deleteSubjectCover(subjectId: string): Promise<void> {
  try {
    const { data: subject } = await supabase
      .from('subjects')
      .select('cover_path')
      .eq('id', subjectId)
      .single()

    if (subject?.cover_path) {
      let path = subject.cover_path
      if (path.startsWith(`${SUBJECT_COVER_BUCKET}/`)) {
        path = path.replace(`${SUBJECT_COVER_BUCKET}/`, '')
      }
      await supabase.storage.from(SUBJECT_COVER_BUCKET).remove([path])
    }
  } catch (error) {
    console.warn('Error deleting cover:', error)
  }
}

// ============================================
// Episode Media (Video Upload & PDF)
// ============================================
const EPISODE_MEDIA_BUCKET = 'episode-media'

// Upload episode video
export async function uploadEpisodeVideo(file: File, episodeId: string): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('video/')) {
    throw new Error('ไฟล์ต้องเป็นวิดีโอเท่านั้น')
  }

  // Validate file size (max 500MB for videos)
  if (file.size > 500 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 500MB')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${episodeId}-${Date.now()}.${fileExt}`
  const filePath = `${episodeId}/${fileName}`

  // Delete old video if exists
  try {
    const { data: episode } = await supabase
      .from('episodes')
      .select('video_path')
      .eq('id', episodeId)
      .single()

    if (episode?.video_path) {
      let oldPath = episode.video_path
      if (oldPath.startsWith(`${EPISODE_MEDIA_BUCKET}/`)) {
        oldPath = oldPath.replace(`${EPISODE_MEDIA_BUCKET}/`, '')
      }
      await supabase.storage.from(EPISODE_MEDIA_BUCKET).remove([oldPath])
    }
  } catch (error) {
    console.warn('Could not delete old video:', error)
  }

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from(EPISODE_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
      throw new Error('Storage bucket ยังไม่ได้สร้าง กรุณาติดต่อผู้ดูแลระบบ')
    }
    throw new Error(`ไม่สามารถอัปโหลดวิดีโอ: ${uploadError.message}`)
  }

  return `${EPISODE_MEDIA_BUCKET}/${filePath}`
}

// Upload episode PDF
export async function uploadEpisodePDF(file: File, episodeId: string): Promise<string> {
  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('ไฟล์ต้องเป็น PDF เท่านั้น')
  }

  // Validate file size (max 50MB for PDFs)
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 50MB')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${episodeId}-${Date.now()}.${fileExt}`
  const filePath = `${episodeId}/${fileName}`

  // Delete old PDF if exists
  try {
    const { data: episode } = await supabase
      .from('episodes')
      .select('pdf_path')
      .eq('id', episodeId)
      .single()

    if (episode?.pdf_path) {
      let oldPath = episode.pdf_path
      if (oldPath.startsWith(`${EPISODE_MEDIA_BUCKET}/`)) {
        oldPath = oldPath.replace(`${EPISODE_MEDIA_BUCKET}/`, '')
      }
      await supabase.storage.from(EPISODE_MEDIA_BUCKET).remove([oldPath])
    }
  } catch (error) {
    console.warn('Could not delete old PDF:', error)
  }

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from(EPISODE_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
      throw new Error('Storage bucket ยังไม่ได้สร้าง กรุณาติดต่อผู้ดูแลระบบ')
    }
    throw new Error(`ไม่สามารถอัปโหลด PDF: ${uploadError.message}`)
  }

  return `${EPISODE_MEDIA_BUCKET}/${filePath}`
}

// Get signed URL for episode media
export async function getEpisodeMediaUrl(mediaPath: string | null): Promise<string | null> {
  if (!mediaPath) return null

  try {
    let path = mediaPath
    if (path.startsWith(`${EPISODE_MEDIA_BUCKET}/`)) {
      path = path.replace(`${EPISODE_MEDIA_BUCKET}/`, '')
    }

    const { data, error } = await supabase.storage
      .from(EPISODE_MEDIA_BUCKET)
      .createSignedUrl(path, 3600)

    if (error) {
      if (
        error.message.includes('Bucket not found') ||
        error.message.includes('not found') ||
        error.message.includes('Failed to fetch')
      ) {
        console.warn('Media not available:', error.message)
        return null
      }
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.warn('Error in getEpisodeMediaUrl:', error)
    return null
  }
}

// Delete episode media
export async function deleteEpisodeMedia(episodeId: string, mediaType: 'video' | 'pdf'): Promise<void> {
  try {
    const { data: episode } = await supabase
      .from('episodes')
      .select(mediaType === 'video' ? 'video_path' : 'pdf_path')
      .eq('id', episodeId)
      .single()

    const mediaPath = mediaType === 'video' ? episode?.video_path : episode?.pdf_path

    if (mediaPath) {
      let path = mediaPath
      if (path.startsWith(`${EPISODE_MEDIA_BUCKET}/`)) {
        path = path.replace(`${EPISODE_MEDIA_BUCKET}/`, '')
      }
      await supabase.storage.from(EPISODE_MEDIA_BUCKET).remove([path])
    }
  } catch (error) {
    console.warn('Error deleting episode media:', error)
  }
}
