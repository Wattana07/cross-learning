import { supabase } from './supabaseClient'

export type LogStatus = 'success' | 'error' | 'warning' | 'info'
export type LogAction = 
  | 'user_login'
  | 'user_logout'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_activate'
  | 'user_deactivate'
  | 'category_create'
  | 'category_update'
  | 'category_delete'
  | 'subject_create'
  | 'subject_update'
  | 'subject_delete'
  | 'episode_create'
  | 'episode_update'
  | 'episode_delete'
  | 'episode_watch'
  | 'episode_complete'
  | 'booking_create'
  | 'booking_update'
  | 'booking_cancel'
  | 'booking_approve'
  | 'booking_reject'
  | 'room_create'
  | 'room_update'
  | 'room_delete'
  | 'points_award'
  | 'points_deduct'
  | 'bookmark_add'
  | 'bookmark_remove'
  | 'system_error'
  | 'api_call'
  | 'file_upload'
  | 'file_delete'

export interface LogDetails {
  [key: string]: any
}

export interface CreateLogParams {
  action: LogAction
  resourceType?: string
  resourceId?: string
  details?: LogDetails
  status?: LogStatus
  errorMessage?: string
}

/**
 * Create a system log entry
 */
export async function createLog(params: CreateLogParams): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get IP and User Agent from browser (if available)
    const ipAddress = await getClientIP()
    const userAgent = navigator.userAgent

    const logData = {
      user_id: user?.id || null,
      action: params.action,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      details: params.details || null,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    }

    // Insert log (use service role or direct insert)
    const { error } = await supabase
      .from('system_logs')
      .insert(logData)

    if (error) {
      // Don't throw error to avoid breaking the main flow
      // Just log to console for debugging
      console.error('Failed to create log:', error)
    }
  } catch (error) {
    // Silently fail - logging shouldn't break the app
    console.error('Error creating log:', error)
  }
}

/**
 * Get client IP address (approximation from browser)
 */
async function getClientIP(): Promise<string | null> {
  try {
    // Try to get IP from a service (for demo purposes)
    // In production, you might get this from server-side
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || null
  } catch {
    return null
  }
}

/**
 * Helper functions for common log actions
 */
export const logger = {
  info: (action: LogAction, params?: Omit<CreateLogParams, 'action' | 'status'>) => 
    createLog({ ...params, action, status: 'info' }),
  
  success: (action: LogAction, params?: Omit<CreateLogParams, 'action' | 'status'>) => 
    createLog({ ...params, action, status: 'success' }),
  
  warning: (action: LogAction, params?: Omit<CreateLogParams, 'action' | 'status'>) => 
    createLog({ ...params, action, status: 'warning' }),
  
  error: (action: LogAction, params?: Omit<CreateLogParams, 'action' | 'status'>) => 
    createLog({ ...params, action, status: 'error', errorMessage: params?.errorMessage }),
}

