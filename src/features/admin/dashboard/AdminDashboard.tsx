import { Card, Badge, Spinner } from '@/components/ui'
import {
  Users,
  BookOpen,
  FolderOpen,
  PlayCircle,
  DoorOpen,
  Calendar,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats, fetchRecentUsers, fetchTodayBookings } from './api'
import { formatDate } from '@/lib/utils'
import type { RecentUser, TodayBooking } from './api'

export function AdminDashboard() {
  // Fetch dashboard stats using React Query
  const { data: stats = {
    totalUsers: 0,
    activeUsers: 0,
    totalCategories: 0,
    totalSubjects: 0,
    totalEpisodes: 0,
    totalRooms: 0,
    bookingsToday: 0,
    newUsersThisWeek: 0,
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: true,
  })

  // Fetch recent users
  const { data: recentUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: fetchRecentUsers,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Fetch today's bookings
  const { data: todayBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-today-bookings'],
    queryFn: fetchTodayBookings,
    staleTime: 1000 * 60 * 1, // 1 minute (bookings change frequently)
  })

  const isLoading = statsLoading || usersLoading || bookingsLoading

  const statCards = [
    {
      name: 'ผู้ใช้ทั้งหมด',
      value: stats.totalUsers,
      icon: Users,
      color: 'primary',
      href: '/admin/users',
    },
    {
      name: 'หมวดหมู่',
      value: stats.totalCategories,
      icon: FolderOpen,
      color: 'green',
      href: '/admin/categories',
    },
    {
      name: 'วิชา',
      value: stats.totalSubjects,
      icon: BookOpen,
      color: 'blue',
      href: '/admin/subjects',
    },
    {
      name: 'บทเรียน',
      value: stats.totalEpisodes,
      icon: PlayCircle,
      color: 'purple',
      href: '/admin/episodes',
    },
    {
      name: 'ห้องประชุม',
      value: stats.totalRooms,
      icon: DoorOpen,
      color: 'orange',
      href: '/admin/rooms',
    },
    {
      name: 'การจองวันนี้',
      value: stats.bookingsToday,
      icon: Calendar,
      color: 'pink',
      href: '/admin/rooms',
    },
  ]

  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-gray-500 mt-1">ภาพรวมระบบ Cross-Learning Platform</p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.name} to={stat.href}>
              <Card
                variant="bordered"
                className="hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      colorClasses[stat.color as keyof typeof colorClasses]
                    }`}
                  >
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value.toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">การดำเนินการด่วน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Users className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">เพิ่มผู้ใช้ใหม่</span>
          </Link>
          <Link
            to="/admin/categories"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <FolderOpen className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">เพิ่มหมวดหมู่</span>
          </Link>
          <Link
            to="/admin/subjects"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <BookOpen className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">เพิ่มวิชา</span>
          </Link>
          <Link
            to="/admin/rooms"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <DoorOpen className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">เพิ่มห้องประชุม</span>
          </Link>
        </div>
      </Card>

      {/* Recent Users and Today's Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ผู้ใช้ใหม่ล่าสุด</h2>
          {usersLoading ? (
            <div className="flex justify-center items-center py-8">
              <Spinner />
            </div>
          ) : recentUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">ยังไม่มีผู้ใช้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                    {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.full_name || 'ไม่มีชื่อ'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {user.department && (
                      <p className="text-xs text-gray-400 mt-0.5">{user.department}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                to="/admin/users"
                className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium mt-4"
              >
                ดูผู้ใช้ทั้งหมด →
              </Link>
            </div>
          )}
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">การจองห้องประชุมวันนี้</h2>
          {bookingsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Spinner />
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">ยังไม่มีการจองวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking.room_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{booking.user_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(booking.start_at).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(booking.end_at).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={booking.status === 'approved' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {booking.status === 'approved' ? 'อนุมัติ' : booking.status}
                  </Badge>
                </div>
              ))}
              <Link
                to="/admin/rooms"
                className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium mt-4"
              >
                ดูการจองทั้งหมด →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

