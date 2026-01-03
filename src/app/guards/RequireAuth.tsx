import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui'

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, loading, profile } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Check if user is active
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-danger-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            บัญชีถูกระงับการใช้งาน
          </h1>
          <p className="text-gray-500 mb-4">
            บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

