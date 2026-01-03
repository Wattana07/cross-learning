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

