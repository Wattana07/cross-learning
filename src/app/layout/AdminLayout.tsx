import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar } from '@/components/ui'
import {
  BookOpen,
  LayoutDashboard,
  Users,
  FolderOpen,
  BookMarked,
  PlayCircle,
  Trophy,
  DoorOpen,
  BarChart3,
  ArrowLeft,
  LogOut,
  Menu,
  ChevronDown,
  Settings,
  FileText,
  Server,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'แดชบอร์ด', href: '/admin', icon: LayoutDashboard },
  { name: 'จัดการผู้ใช้', href: '/admin/users', icon: Users },
  { name: 'หมวดหมู่', href: '/admin/categories', icon: FolderOpen },
  { name: 'วิชา', href: '/admin/subjects', icon: BookMarked },
  { name: 'บทเรียน', href: '/admin/episodes', icon: PlayCircle },
  { name: 'กติกาแต้ม', href: '/admin/rewards', icon: Trophy },
  { name: 'ห้องประชุม', href: '/admin/rooms', icon: DoorOpen },
  { name: 'รายงาน', href: '/admin/reports', icon: BarChart3 },
  { name: 'Logs', href: '/admin/logs', icon: FileText },
  { name: 'Status', href: '/admin/status', icon: Server },
]

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { profile, signOut } = useAuthContext()
  const { actualTheme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

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
          'fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 transform transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-primary-800">
          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-xl">
            <BookOpen className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <span className="font-bold text-white">Cross-Learning</span>
            <p className="text-xs text-primary-300">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-800 text-white'
                    : 'text-primary-200 hover:bg-primary-800/50 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Back to app */}
        <div className="absolute bottom-4 left-4 right-4">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-200 hover:bg-primary-800/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            กลับหน้าหลัก
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Admin badge */}
          <div className="hidden lg:flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">ระบบหลังบ้าน</span>
          </div>

          {/* Theme toggle and User menu */}
          <div className="flex items-center gap-2">
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

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Avatar
                src={profile?.avatar_path}
                name={profile?.full_name}
                size="sm"
              />
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {profile?.full_name || 'Admin'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={profile?.avatar_path}
                        name={profile?.full_name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile?.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                          Admin
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50"
                  >
                    <LogOut className="w-4 h-4" />
                    ออกจากระบบ
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

