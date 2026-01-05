import { useState, useMemo } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
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
  X,
  Settings,
  ChevronDown,
  DoorOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation: Array<{
  name: string
  href: string
  icon: any
  badge?: number
}> = [
  { name: 'แดชบอร์ด', href: '/', icon: Home },
  { name: 'คอร์สของฉัน', href: '/categories', icon: FolderOpen },
  { name: 'จองห้องประชุม', href: '/rooms', icon: Calendar },
]

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { profile, signOut, isAdmin } = useAuthContext()
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
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
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
                {item.badge && (
                  <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Admin link */}
        {isAdmin && (
          <div className="px-4 mb-4">
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
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 xl:pr-80">
        {/* Top bar with user menu */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Spacer for mobile */}
          <div className="flex-1 lg:hidden" />

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
                {profile?.full_name || 'ผู้ใช้'}
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
                          {profile?.full_name || 'ไม่ระบุชื่อ'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                        {isAdmin && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    โปรไฟล์
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                      หลังบ้าน Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-100 my-1" />
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
        </header>

        {/* Page content - Header is now in DashboardPage */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Right Sidebar - Profile, Schedule, Reminders */}
      <RightSidebar />
    </div>
  )
}

