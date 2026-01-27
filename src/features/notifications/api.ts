import { supabase } from '@/lib/supabaseClient'

export interface Notification {
  id: string
  user_id: string
  type: 'booking_approved' | 'booking_rejected' | 'points_earned' | 'episode_completed' | 'subject_completed'
  title: string
  message: string | null
  data: Record<string, any>
  read_at: string | null
  created_at: string
}

// Get user's notifications
export async function getNotifications(limit: number = 20): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data || []
}

// Get unread notifications count
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

// Helper: Get notification icon based on type
export function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    booking_approved: '✅',
    booking_rejected: '❌',
    points_earned: '🏆',
    episode_completed: '📚',
    subject_completed: '🎉',
  }
  return icons[type] || '🔔'
}

// Helper: Get notification color based on type
export function getNotificationColor(type: string): string {
  const colors: Record<string, string> = {
    booking_approved: 'bg-green-50 border-green-200',
    booking_rejected: 'bg-red-50 border-red-200',
    points_earned: 'bg-yellow-50 border-yellow-200',
    episode_completed: 'bg-blue-50 border-blue-200',
    subject_completed: 'bg-purple-50 border-purple-200',
  }
  return colors[type] || 'bg-gray-50 border-gray-200'
}
