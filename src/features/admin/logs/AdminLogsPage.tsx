import { useState } from 'react'
import { Card, Spinner, Badge, Button, Input } from '@/components/ui'
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Activity,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchLogs, fetchLogStats, type SystemLog, type LogFilters } from './api'
import { formatDate } from '@/lib/utils'
import type { LogStatus, LogAction } from '@/lib/logger'

const ITEMS_PER_PAGE = 50

const statusColors: Record<string, string> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
}

const statusIcons: Record<string, any> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function AdminLogsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<LogFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  const { data: logsData, isLoading, error: logsError, refetch } = useQuery({
    queryKey: ['admin-logs', currentPage, filters],
    queryFn: () =>
      fetchLogs({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        filters: { ...filters, search: searchQuery },
      }),
    staleTime: 1000 * 60 * 1, // 1 minute
  })

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['admin-logs-stats'],
    queryFn: fetchLogStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setCurrentPage(1)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    refetch()
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
    setCurrentPage(1)
  }

  const totalPages = logsData ? Math.ceil(logsData.total / ITEMS_PER_PAGE) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
          <p className="text-gray-500 mt-1">ดูบันทึกกิจกรรมและข้อผิดพลาดของระบบ</p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          รีเฟรช
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="bordered" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Logs ทั้งหมด (24 ชม.)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </Card>

          <Card variant="bordered" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.recentErrors}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </Card>

          <Card variant="bordered" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.byStatus.find(s => s.status === 'success')?.count || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card variant="bordered" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats.byStatus.find(s => s.status === 'warning')?.count || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="bordered" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="ค้นหาจาก action, user, resource..."
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Button onClick={handleSearch}>ค้นหา</Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทั้งหมด</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทั้งหมด</option>
              <option value="user_login">User Login</option>
              <option value="user_create">User Create</option>
              <option value="user_update">User Update</option>
              <option value="episode_complete">Episode Complete</option>
              <option value="booking_create">Booking Create</option>
              <option value="system_error">System Error</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              ล้างตัวกรอง
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Messages */}
      {(logsError || statsError) && (
        <Card variant="bordered" className="p-6 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">เกิดข้อผิดพลาด</h3>
              <p className="text-sm text-red-700 mb-2">
                {logsError?.message || statsError?.message || 'ไม่สามารถโหลดข้อมูลได้'}
              </p>
              {(logsError?.message?.includes('relation "system_logs" does not exist') || 
                logsError?.message?.includes('table "system_logs" does not exist')) && (
                <div className="mt-3 p-3 bg-white rounded border border-red-200">
                  <p className="text-sm text-red-800 font-medium mb-1">💡 วิธีแก้ไข:</p>
                  <ol className="text-xs text-red-700 list-decimal list-inside space-y-1">
                    <li>เปิด Supabase Dashboard → SQL Editor</li>
                    <li>คัดลอก SQL จากไฟล์ <code className="bg-red-100 px-1 rounded">supabase/migrations/add-logs-table.sql</code></li>
                    <li>วางใน SQL Editor และรัน</li>
                    <li>รีเฟรชหน้านี้</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Logs Table */}
      <Card variant="bordered" className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : logsError ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-red-300 mb-4" />
            <p className="text-gray-600 mb-2">ไม่สามารถโหลด logs ได้</p>
            <p className="text-sm text-gray-500">{logsError.message}</p>
          </div>
        ) : logsData && logsData.logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Resource
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsData.logs.map((log) => {
                    const StatusIcon = statusIcons[log.status] || Info
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={statusColors[log.status] as any}>
                            <StatusIcon className="w-3 h-3 mr-1 inline" />
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.user_name || (
                            <span className="text-gray-400">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.resource_type && log.resource_id ? (
                            <span>
                              {log.resource_type}: {log.resource_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.error_message ? (
                            <span className="text-red-600">{log.error_message}</span>
                          ) : log.details ? (
                            <span className="text-gray-500">
                              {JSON.stringify(log.details).substring(0, 50)}...
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1} -{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, logsData.total)} จาก {logsData.total}{' '}
                  รายการ
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ไม่พบ logs</p>
          </div>
        )}
      </Card>
    </div>
  )
}

