import { useState, useMemo } from 'react'
import { Card } from '@/components/ui'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DoorOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { RoomWithDetails } from './api'
import type { RoomBooking } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface BookingCalendarProps {
  rooms: RoomWithDetails[]
  bookings: RoomBooking[]
  onBookRoom: (room?: RoomWithDetails) => void
}

export function BookingCalendar({ rooms, bookings, onBookRoom }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Adjust to Monday = 0
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = adjustedStartingDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      days.push({ date, isCurrentMonth: false })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({ date, isCurrentMonth: true })
    }

    // Next month days to fill the grid (42 cells = 6 weeks * 7 days)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({ date, isCurrentMonth: false })
    }

    return days
  }, [year, month, daysInMonth, adjustedStartingDay])

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_at).toISOString().split('T')[0]
      return bookingDate === dateStr
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]

  const dayNames = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

  return (
    <Card className="p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dateBookings = getBookingsForDate(date)
          const isCurrentDay = isToday(date)

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] p-2 border border-gray-200 rounded-lg',
                !isCurrentMonth && 'bg-gray-50 opacity-50',
                isCurrentDay && 'border-primary-500 border-2',
                'hover:bg-gray-50 cursor-pointer'
              )}
              onClick={() => {
                // Allow booking on future dates (7+ days ahead)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const selectedDate = new Date(date)
                selectedDate.setHours(0, 0, 0, 0)
                const diffDays = Math.floor((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                
                if (diffDays >= 7) {
                  onBookRoom()
                }
              }}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  isCurrentDay && 'text-primary-600 font-bold',
                  !isCurrentMonth && 'text-gray-400'
                )}
              >
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dateBookings.slice(0, 3).map((booking) => {
                  const room = rooms.find(r => r.id === booking.room_id)
                  const startTime = new Date(booking.start_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  
                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        'text-xs p-1 rounded truncate',
                        booking.status === 'approved' && 'bg-green-100 text-green-800',
                        booking.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                        booking.status === 'rejected' && 'bg-red-100 text-red-800',
                        booking.status === 'cancelled' && 'bg-gray-100 text-gray-800'
                      )}
                      title={`${booking.title} - ${room?.name || ''} (${startTime})`}
                    >
                      {startTime} {room?.name || booking.title}
                    </div>
                  )
                })}
                {dateBookings.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dateBookings.length - 3} เพิ่มเติม
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-gray-600">อนุมัติ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span className="text-gray-600">รออนุมัติ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-gray-600">ปฏิเสธ</span>
        </div>
      </div>
    </Card>
  )
}

