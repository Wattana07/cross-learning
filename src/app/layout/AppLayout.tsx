import { useState, useMemo } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, Button } from '@/components/ui'
import { RightSidebar } from '@/components/RightSidebar'
import {
  BookOpen,
  Home,
  FolderOpen,
  Trophy,
  Calendar,
  User,
  LogOut,
  Menu,
  Settings,
  DoorOpen,
  Activity,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUnreadCount, getNotifications, type Notification, getNotificationIcon } from '@/features/notifications/api'

const navigation: Array<{
  name: string
  href: string
  icon: any
  badge?: number
}> = [
  { name: 'แดชบอร์ด', href: '/', icon: Home },
  { name: 'คอร์สของฉัน', href: '/categories', icon: FolderOpen },
  { name: 'จองห้องประชุม', href: '/rooms', icon: Calendar },
  { name: 'Activity Feed', href: '/activity', icon: Activity },
]

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut, isAdmin } = useAuthContext()
  const { actualTheme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Load notifications for sidebar (left)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    staleTime: 1000 * 30,
  })

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications-sidebar'],
    queryFn: () => getNotifications(5),
    staleTime: 1000 * 30,
  })

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-xl">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">CROSS</div>
            <div className="font-bold text-gray-900 text-xs -mt-1">LEARNING</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 pb-20">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const badge =
              item.href === '/activity' && unreadCount > 0 ? unreadCount : item.badge
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                preventScrollReset={true}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </div>
                {badge && (
                  <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Notifications preview */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-gray-500">
                การแจ้งเตือนล่าสุด
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                  ใหม่ {unreadCount}
                </span>
              )}
            </div>
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400">
                  ยังไม่มีการแจ้งเตือน
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    to="/activity"
                    className={cn(
                      'flex items-start gap-2 px-3 py-2 rounded-lg text-xs hover:bg-gray-50 transition-colors',
                      !n.read_at ? 'bg-primary-50' : 'bg-transparent'
                    )}
                  >
                    <span className="text-sm">
                      {getNotificationIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'truncate',
                        !n.read_at ? 'font-medium text-gray-900' : 'text-gray-700'
                      )}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-[11px] text-gray-500 truncate">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Admin link */}
          {isAdmin && (
            <div className="mt-4">
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-dashed border-gray-300"
              >
                <Settings className="w-5 h-5" />
                หลังบ้าน Admin
              </Link>
            </div>
          )}
        </nav>

        {/* Logout button at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 xl:pr-80">
        {/* Top bar - Mobile menu button and theme toggle */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Spacer for desktop */}
          <div className="flex-1 lg:block hidden" />

          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title={actualTheme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            {actualTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Right Sidebar - Profile, Schedule, Reminders */}
      <RightSidebar />
    </div>
  )
}

