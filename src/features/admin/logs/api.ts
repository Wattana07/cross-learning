import { supabase } from '@/lib/supabaseClient'
import type { LogStatus, LogAction } from '@/lib/logger'

export interface SystemLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  status: string
  error_message: string | null
  created_at: string
  user_name?: string
  user_email?: string
}

export interface LogFilters {
  action?: LogAction
  status?: LogStatus
  userId?: string
  resourceType?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface FetchLogsOptions {
  limit?: number
  offset?: number
  filters?: LogFilters
}

export interface FetchLogsResult {
  logs: SystemLog[]
  total: number
}

// Fetch system logs with filters
export async function fetchLogs(options: FetchLogsOptions = {}): Promise<FetchLogsResult> {
  const { limit = 100, offset = 0, filters = {} } = options

  try {
    let query = supabase
      .from('system_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (filters.action) {
      query = query.eq('action', filters.action)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data: logs, error, count } = await query

    if (error) throw error

    // Get user information for logs that have user_id
    const userIds = [...new Set((logs || []).map(log => log.user_id).filter(Boolean))]
    let userMap = new Map<string, { name: string; email: string }>()

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      users?.forEach(user => {
        userMap.set(user.id, {
          name: user.full_name || 'Unknown',
          email: user.email || '',
        })
      })
    }

    // Add user info to logs
    const logsWithUsers: SystemLog[] = (logs || []).map(log => {
      const user = log.user_id ? userMap.get(log.user_id) : undefined
      return {
        ...log,
        user_name: user?.name,
        user_email: user?.email,
      }
    })

    // Apply search filter (client-side for now)
    let filteredLogs = logsWithUsers
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredLogs = logsWithUsers.filter(log =>
        log.action.toLowerCase().includes(searchLower) ||
        log.resource_type?.toLowerCase().includes(searchLower) ||
        log.resource_id?.toLowerCase().includes(searchLower) ||
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.user_email?.toLowerCase().includes(searchLower) ||
        log.error_message?.toLowerCase().includes(searchLower)
      )
    }

    return {
      logs: filteredLogs,
      total: count || 0,
    }
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    // Provide more helpful error message
    if (error?.message?.includes('relation "system_logs" does not exist') || 
        error?.message?.includes('table "system_logs" does not exist')) {
      throw new Error(
        'ตาราง system_logs ยังไม่ถูกสร้าง กรุณารัน SQL migration ใน Supabase Dashboard'
      )
    }
    throw error
  }
}

// Get log statistics
export async function fetchLogStats(): Promise<{
  total: number
  byStatus: Array<{ status: string; count: number }>
  byAction: Array<{ action: string; count: number }>
  recentErrors: number
}> {
  try {
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('status, action, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    if (error) throw error

    const total = logs?.length || 0

    // Count by status
    const statusCounts = new Map<string, number>()
    logs?.forEach(log => {
      statusCounts.set(log.status, (statusCounts.get(log.status) || 0) + 1)
    })

    const byStatus = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))

    // Count by action (top 10)
    const actionCounts = new Map<string, number>()
    logs?.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1)
    })

    const byAction = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Recent errors (last 24 hours)
    const recentErrors = logs?.filter(log => log.status === 'error').length || 0

    return {
      total,
      byStatus,
      byAction,
      recentErrors,
    }
  } catch (error) {
    console.error('Error fetching log stats:', error)
    throw error
  }
}

