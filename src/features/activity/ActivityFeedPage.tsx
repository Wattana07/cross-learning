import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Spinner, Badge, Button, Input } from '@/components/ui'
import { Activity, Filter, Search, Calendar, User, RefreshCw } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { fetchLogs } from '@/features/admin/logs/api'
import { formatDate, formatTime } from '@/lib/utils'

type FilterType = 'all' | 'me' | 'system'
type ActionFilter = 'all' | 'login' | 'content' | 'booking' | 'learning' | 'points'

export function ActivityFeedPage() {
  const { user, profile } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week')

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date()
    let start: Date | null = null

    if (dateFilter === 'today') {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
    } else if (dateFilter === 'week') {
      start = new Date(now)
      start.setDate(start.getDate() - 7)
    } else if (dateFilter === 'month') {
      start = new Date(now)
      start.setMonth(start.getMonth() - 1)
    }

    return { start, end: null }
  }, [dateFilter])

  // Build filters
  const filters = useMemo(() => {
    const actionFilters = actionFilter === 'all' ? undefined : getActionsForCategory(actionFilter)
    
    const f: any = {
      search: searchQuery || undefined,
    }

    if (actionFilters && actionFilters.length > 0) {
      // For multiple actions, we need to filter client-side since Supabase doesn't support OR easily
      // We'll handle this in the fetchLogs function or filter client-side
      // For now, use the first action or handle in client-side filter
    }

    if (filterType === 'me' && user?.id) {
      f.userId = user.id
    }

    if (dateRange.start) {
      f.startDate = dateRange.start.toISOString()
    }

    return { filters: f, actionFilters }
  }, [filterType, actionFilter, searchQuery, dateRange, user?.id])

  // Fetch logs
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['activity-feed', filters],
    queryFn: async () => {
      const result = await fetchLogs({ limit: 100, offset: 0, filters: filters.filters })
      // Filter by action category client-side if needed
      if (filters.actionFilters && filters.actionFilters.length > 0) {
        result.logs = result.logs.filter(log => 
          filters.actionFilters!.includes(log.action)
        )
      }
      return result
    },
    staleTime: 1000 * 30, // 30 seconds
  })

  const logs = logsData?.logs || []
  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs])

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login: 'เข้าสู่ระบบ',
      logout: 'ออกจากระบบ',
      category_create: 'สร้างหมวดหมู่',
      category_update: 'แก้ไขหมวดหมู่',
      category_delete: 'ลบหมวดหมู่',
      subject_create: 'สร้างวิชา',
      subject_update: 'แก้ไขวิชา',
      subject_delete: 'ลบวิชา',
      episode_create: 'สร้างบทเรียน',
      episode_update: 'แก้ไขบทเรียน',
      episode_delete: 'ลบบทเรียน',
      episode_watch: 'ดูบทเรียน',
      episode_complete: 'จบบทเรียน',
      booking_create: 'จองห้อง',
      booking_update: 'แก้ไขการจอง',
      booking_cancel: 'ยกเลิกการจอง',
    }
    return labels[action] || action
  }

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) return '🔐'
    if (action.includes('create')) return '➕'
    if (action.includes('update')) return '✏️'
    if (action.includes('delete')) return '🗑️'
    if (action.includes('watch') || action.includes('complete')) return '📚'
    if (action.includes('booking')) return '🏢'
    return '📝'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-gray-500 mt-1">ดูประวัติกิจกรรมทั้งหมด</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card variant="bordered" padding="md">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">ประเภท:</span>
              {(['all', 'me', 'system'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? 'ทั้งหมด' : type === 'me' ? 'ของฉัน' : 'ระบบ'}
                </button>
              ))}
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">กิจกรรม:</span>
              {(
                [
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'login', label: 'Login/Logout' },
                  { id: 'content', label: 'จัดการเนื้อหา' },
                  { id: 'learning', label: 'การเรียน' },
                  { id: 'booking', label: 'การจอง' },
                  { id: 'points', label: 'แต้ม' },
                ] as { id: ActionFilter; label: string }[]
              ).map((action) => (
                <button
                  key={action.id}
                  onClick={() => setActionFilter(action.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    actionFilter === action.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">ช่วงเวลา:</span>
              {(
                [
                  { id: 'today', label: 'วันนี้' },
                  { id: 'week', label: '7 วัน' },
                  { id: 'month', label: '1 เดือน' },
                  { id: 'all', label: 'ทั้งหมด' },
                ] as const
              ).map((date) => (
                <button
                  key={date.id}
                  onClick={() => setDateFilter(date.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === date.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {date.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Activity Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <Card variant="bordered" padding="lg" className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบกิจกรรม</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <Card key={date} variant="bordered" padding="md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                {formatDateHeader(date)}
              </h3>
              <div className="space-y-3">
                {dateLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-2xl">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {log.user_name || log.user_email || 'System'}
                        </span>
                        <Badge
                          variant={
                            log.status === 'success'
                              ? 'success'
                              : log.status === 'error'
                                ? 'danger'
                                : 'default'
                          }
                          className="text-xs"
                        >
                          {getActionLabel(log.action)}
                        </Badge>
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-600 mb-1">
                          {typeof log.details === 'string' 
                            ? log.details 
                            : typeof log.details === 'object' 
                              ? JSON.stringify(log.details, null, 2)
                              : String(log.details)}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-sm text-red-600 mb-1">
                          ข้อผิดพลาด: {String(log.error_message)}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatTime(log.created_at)}</span>
                        {log.resource_type && log.resource_id && (
                          <span>
                            {log.resource_type}: {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper functions
function getActionsForCategory(category: ActionFilter): string[] | undefined {
  const categories: Record<ActionFilter, string[]> = {
    all: [],
    login: ['login', 'logout'],
    content: ['category_create', 'category_update', 'category_delete', 'subject_create', 'subject_update', 'subject_delete', 'episode_create', 'episode_update', 'episode_delete'],
    learning: ['episode_watch', 'episode_complete'],
    booking: ['booking_create', 'booking_update', 'booking_cancel'],
    points: ['points_earned', 'points_spent'],
  }

  return categories[category]?.length > 0 ? categories[category] : undefined
}

function groupLogsByDate(logs: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}

  logs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    if (!grouped[date]) {
      grouped[date] = []
    }

    grouped[date].push(log)
  })

  // Sort logs within each day (newest first)
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })

  return grouped
}

function formatDateHeader(dateString: string): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const date = new Date(dateString)
  const formattedDate = date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (date.toDateString() === today.toDateString()) {
    return `วันนี้ - ${formattedDate}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `เมื่อวาน - ${formattedDate}`
  }

  return formattedDate
}

// formatDateTime is imported from @/lib/utils

