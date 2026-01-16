import { useState, useEffect } from 'react'
import { Card, Spinner, Badge, Button } from '@/components/ui'
import {
  Server,
  Database,
  HardDrive,
  Shield,
  Code,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchSystemStatus, type SystemStatus, type ServiceStatus } from './api'
import { formatDate } from '@/lib/utils'

const statusColors = {
  online: 'success',
  offline: 'danger',
  degraded: 'warning',
} as const

const statusIcons = {
  online: CheckCircle,
  offline: XCircle,
  degraded: AlertTriangle,
}

const serviceIcons = {
  database: Database,
  storage: HardDrive,
  auth: Shield,
  edgeFunctions: Code,
}

export function AdminStatusPage() {
  const [autoRefresh, setAutoRefresh] = useState(false)

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: fetchSystemStatus,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: autoRefresh ? 30000 : false, // Auto refresh every 30 seconds if enabled
  })

  // Auto refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refetch])

  const overallStatus = status?.overall || 'offline'
  const OverallIcon = statusIcons[overallStatus]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
          <p className="text-gray-500 mt-1">ตรวจสอบสถานะของระบบและบริการต่างๆ</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'primary' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            leftIcon={<Activity className="w-4 h-4" />}
          >
            {autoRefresh ? 'หยุด Auto Refresh' : 'เปิด Auto Refresh'}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {status && (
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  overallStatus === 'online'
                    ? 'bg-green-100'
                    : overallStatus === 'offline'
                    ? 'bg-red-100'
                    : 'bg-yellow-100'
                }`}
              >
                <OverallIcon
                  className={`w-8 h-8 ${
                    overallStatus === 'online'
                      ? 'text-green-600'
                      : overallStatus === 'offline'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">System Status</h2>
                <p className="text-gray-500 text-sm">
                  อัปเดตล่าสุด: {formatDate(status.timestamp)}
                </p>
              </div>
            </div>
            <Badge variant={statusColors[overallStatus]}>
              {overallStatus === 'online'
                ? 'Online'
                : overallStatus === 'offline'
                ? 'Offline'
                : 'Degraded'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Services Status */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceStatusCard service={status.database} />
          <ServiceStatusCard service={status.storage} />
          <ServiceStatusCard service={status.auth} />
          <ServiceStatusCard service={status.edgeFunctions} />
        </div>
      ) : (
        <Card variant="bordered" className="p-6">
          <div className="text-center py-8">
            <Server className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ไม่สามารถตรวจสอบสถานะได้</p>
          </div>
        </Card>
      )}

      {/* System Info */}
      <Card variant="bordered" className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Supabase URL</p>
            <p className="text-sm font-mono text-gray-900 mt-1">
              {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Environment</p>
            <p className="text-sm text-gray-900 mt-1">
              {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Site URL</p>
            <p className="text-sm font-mono text-gray-900 mt-1">
              {import.meta.env.VITE_SITE_URL || 'Not configured'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Check</p>
            <p className="text-sm text-gray-900 mt-1">
              {status ? formatDate(status.timestamp) : 'Never'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ServiceStatusCard({ service }: { service: ServiceStatus }) {
  const StatusIcon = statusIcons[service.status]
  const ServiceIcon = serviceIcons[service.name.toLowerCase() as keyof typeof serviceIcons] || Server

  return (
    <Card
      variant="bordered"
      className={`p-6 ${
        service.status === 'online'
          ? 'border-green-200 bg-green-50/50'
          : service.status === 'offline'
          ? 'border-red-200 bg-red-50/50'
          : 'border-yellow-200 bg-yellow-50/50'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              service.status === 'online'
                ? 'bg-green-100'
                : service.status === 'offline'
                ? 'bg-red-100'
                : 'bg-yellow-100'
            }`}
          >
            <ServiceIcon
              className={`w-5 h-5 ${
                service.status === 'online'
                  ? 'text-green-600'
                  : service.status === 'offline'
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{service.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(service.lastChecked)}
            </p>
          </div>
        </div>
        <Badge variant={statusColors[service.status]}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {service.status}
        </Badge>
      </div>

      <div className="space-y-2">
        {service.responseTime !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Response Time
            </span>
            <span
              className={`font-medium ${
                service.responseTime < 500
                  ? 'text-green-600'
                  : service.responseTime < 1000
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {service.responseTime}ms
            </span>
          </div>
        )}

        {service.message && (
          <div className="text-sm text-gray-600 mt-2 p-2 bg-white/50 rounded border">
            {service.message}
          </div>
        )}
      </div>
    </Card>
  )
}

