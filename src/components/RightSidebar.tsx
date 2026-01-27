import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { Card, Badge, Spinner } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { Edit, Calendar, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { cn, formatPoints } from '@/lib/utils'
import { getMyWallet } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { fetchMyBookings } from '@/features/rooms/api'
import type { RoomBooking } from '@/lib/database.types'

// Calculate overall learning progress (same as ProfilePage)
async function getOverallProgress(userId: string): Promise<{ progressPercent: number; completedEpisodes: number; totalEpisodes: number }> {
  try {
    // Get all published episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('status', 'published')

    if (episodesError) throw episodesError

    const episodesList = episodes || []
    if (episodesList.length === 0) {
      return { progressPercent: 0, completedEpisodes: 0, totalEpisodes: 0 }
    }

    const episodeIds = episodesList.map((e) => e.id)

    // Get user progress
    const { data: progressData, error: progressError } = await supabase
      .from('user_episode_progress')
      .select('episode_id, completed_at, watched_percent')
      .eq('user_id', userId)
      .in('episode_id', episodeIds)

    if (progressError) throw progressError

    const progressList = progressData || []
    const completedCount = progressList.filter(
      (p) => p.completed_at !== null || (p.watched_percent ?? 0) >= 90
    ).length

    const progressPercent = episodesList.length > 0 ? Math.round((completedCount / episodesList.length) * 100) : 0

    return {
      progressPercent,
      completedEpisodes: completedCount,
      totalEpisodes: episodesList.length,
    }
  } catch (error) {
    console.error('getOverallProgress - Error:', error)
    return { progressPercent: 0, completedEpisodes: 0, totalEpisodes: 0 }
  }
}

export const RightSidebar = React.memo(function RightSidebar() {
  const { profile, user } = useAuthContext()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())

  // Fetch wallet and overall progress
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['sidebar', 'wallet', user?.id],
    queryFn: async () => {
      try {
        const result = await getMyWallet()
        // Return wallet data or default if null
        return result || { total_points: 0, level: 1, user_id: user!.id, updated_at: new Date().toISOString() }
      } catch (error) {
        console.error('Error fetching wallet in RightSidebar:', error)
        return { total_points: 0, level: 1, user_id: user!.id, updated_at: new Date().toISOString() }
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    retry: 1,
  })

  const { data: overallProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['sidebar', 'overall-progress', user?.id],
    queryFn: () => getOverallProgress(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    retry: 1,
  })

  const progressPercent = overallProgress?.progressPercent ?? 0
  const totalPoints = wallet?.total_points ?? 0

  // Fetch user's bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['sidebar', 'bookings', user?.id],
    queryFn: () => fetchMyBookings(),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false,
    retry: 1,
  })

  // Get days in month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    setCurrentDate(newDate)
    setSelectedDay(newDate.getDate())
  }

  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    setCurrentDate(newDate)
    setSelectedDay(newDate.getDate())
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  // Bookings for selected day (approved bookings)
  const selectedDayBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return []
    if (selectedDay === null) return []

    return bookings
      .filter((booking: RoomBooking) => {
        const startDate = new Date(booking.start_at)
        return (
          booking.status === 'approved' &&
          startDate.getFullYear() === year &&
          startDate.getMonth() === month &&
          startDate.getDate() === selectedDay
        )
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [bookings, year, month, selectedDay])

  // Generate calendar days
  const calendarDays = []
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Helper function to format date in Thai
  const formatThaiDate = (date: Date) => {
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const year = date.getFullYear() + 543 // Convert to Buddhist year
    const dayName = thaiDays[date.getDay()]
    
    return `${day} ${month} ${year}, วัน${dayName}`
  }

  return (
    <aside className="hidden xl:block fixed right-0 top-0 bottom-0 w-80 p-6 space-y-6 border-l border-gray-200 bg-white overflow-y-auto">
      {/* Profile Section */}
      <Card variant="bordered" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">โปรไฟล์</h3>
          <Link
            to="/profile"
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="แก้ไขโปรไฟล์"
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
        <div className="text-center">
          {/* Avatar with Circular Progress */}
          <div className="relative inline-block mb-4">
            <div className="relative w-24 h-24">
              {/* Progress Ring */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - progressPercent / 100)}`}
                  className="text-primary-600 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              {/* Avatar */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar
                  src={profile?.avatar_path}
                  name={profile?.full_name}
                  size="xl"
                  className="w-20 h-20"
                />
              </div>
              {/* Progress Percentage Badge */}
              {!progressLoading && (
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                  {progressPercent}%
                </div>
              )}
            </div>
          </div>
          
          <h4 className="font-semibold text-gray-900 mb-1">
            {profile?.full_name || 'ผู้ใช้'}
          </h4>
          <p className="text-sm text-gray-500 mb-3">{profile?.email}</p>

          {/* Total Points */}
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Trophy className="w-4 h-4 text-yellow-600" />
            {walletLoading ? (
              <Spinner size="sm" />
            ) : (
              <span className="text-sm font-bold text-yellow-600">
                {formatPoints(totalPoints)} แต้ม
              </span>
            )}
          </div>

          {/* Progress Info */}
          {!progressLoading && overallProgress && overallProgress.totalEpisodes > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {overallProgress.completedEpisodes} / {overallProgress.totalEpisodes} บทเรียน
            </p>
          )}
        </div>
      </Card>

      {/* Schedule Section */}
      <Card variant="bordered" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">ตารางเวลา</h3>
          <Link
            to="/rooms"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {/* Calendar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="font-semibold text-gray-900">
              {monthNames[month]} {year}
            </h4>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                type="button"
                disabled={day === null}
                onClick={() => day && setSelectedDay(day)}
                className={cn(
                  'aspect-square flex items-center justify-center text-sm rounded-lg transition-colors',
                  day === null
                    ? ''
                    : selectedDay === day && month === currentDate.getMonth() && year === currentDate.getFullYear()
                    ? 'bg-primary-600 text-white font-semibold'
                    : isToday(day)
                    ? 'border border-primary-500 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Items - activities for selected day */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 mb-1">
            กิจกรรมวันที่{' '}
            {new Date(year, month, selectedDay ?? today.getDate()).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : selectedDayBookings.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              ยังไม่มีกิจกรรมในวันนี้
            </div>
          ) : (
            selectedDayBookings.map((booking: RoomBooking) => {
              const startDate = new Date(booking.start_at)
              const endDate = new Date(booking.end_at)
              const timeRange = `${startDate.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })} - ${endDate.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })}`

              return (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => (window.location.href = '/rooms')}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate" title={booking.title}>
                      {booking.title}
                    </div>
                    <div className="text-xs text-gray-500">{timeRange}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </aside>
  )
})

