import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui'

interface RequireAdminProps {
  children: React.ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { isAdmin, loading, isAuthenticated } = useAuthContext()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-warning-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-gray-500 mb-4">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบเท่านั้น
          </p>
          <a
            href="/"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            กลับหน้าหลัก
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

