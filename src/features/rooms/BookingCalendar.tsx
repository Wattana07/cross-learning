import { useState, useMemo } from 'react'
import { Card, Badge } from '@/components/ui'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DoorOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { RoomWithDetails, CalendarEvent } from './api'
import type { RoomBooking } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { DayDetailsModal } from './DayDetailsModal'

interface BookingCalendarProps {
  rooms: RoomWithDetails[]
  bookings: RoomBooking[]
  calendarEvents?: CalendarEvent[]
  onBookRoom: (selectedDate?: Date, room?: RoomWithDetails) => void
  onEditBooking?: (booking: RoomBooking) => void
  onCancelBooking?: (booking: RoomBooking) => void
}

export function BookingCalendar({ 
  rooms, 
  bookings, 
  calendarEvents = [], 
  onBookRoom,
  onEditBooking,
  onCancelBooking 
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

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

  // Get bookings for a specific date (using local date to avoid timezone issues)
  const getBookingsForDate = (date: Date) => {
    const dateYear = date.getFullYear()
    const dateMonth = date.getMonth()
    const dateDay = date.getDate()
    const dateStr = `${dateYear}-${String(dateMonth + 1).padStart(2, '0')}-${String(dateDay).padStart(2, '0')}`
    
    // Get room bookings
    const roomBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_at)
      return (
        bookingDate.getFullYear() === dateYear &&
        bookingDate.getMonth() === dateMonth &&
        bookingDate.getDate() === dateDay
      )
    })
    
    // Get calendar events for this date
    const events = calendarEvents.filter((event) => {
      return event.date === dateStr
    })
    
    return { roomBookings, events }
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
          const { roomBookings, events } = getBookingsForDate(date)
          const isCurrentDay = isToday(date)
          const totalItems = roomBookings.length + events.length

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
                // ถ้ามีกิจกรรม ให้แสดงรายละเอียด
                if (totalItems > 0) {
                  setSelectedDate(date)
                } else {
                  // ถ้าไม่มีกิจกรรม ให้จองห้อง (ถ้าเป็นวันที่อนาคต 7+ วัน)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const clickedDate = new Date(date)
                  clickedDate.setHours(0, 0, 0, 0)
                  const diffDays = Math.floor((clickedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  
                  if (diffDays >= 7) {
                    onBookRoom(date)
                  }
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
                {/* Room Bookings */}
                {roomBookings.slice(0, 3).map((booking) => {
                  const room = rooms.find(r => r.id === booking.room_id)
                  const startTime = new Date(booking.start_at).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  
                  return (
                    <div
                      key={`booking-${booking.id}`}
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
                
                {/* Calendar Events from Happy MPM */}
                {events.slice(0, Math.max(0, 3 - roomBookings.length)).map((event, eventIndex) => {
                  const timeDisplay = event.time ? event.time.substring(0, 5) : ''
                  return (
                    <div
                      key={`event-${event.id || eventIndex}`}
                      className="text-xs p-1 rounded truncate bg-blue-100 text-blue-800"
                      title={`${event.title}${event.category ? ` - ${event.category}` : ''}${timeDisplay ? ` (${timeDisplay})` : ''}`}
                    >
                      {timeDisplay && `${timeDisplay} `}{event.title}
                      {event.category && ` (${event.category})`}
                    </div>
                  )
                })}
                
                {totalItems > 3 && (
                  <div className="text-xs text-gray-500">
                    +{totalItems - 3} เพิ่มเติม
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm flex-wrap">
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-gray-600">Calendar Events (Happy MPM)</span>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <DayDetailsModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          roomBookings={getBookingsForDate(selectedDate).roomBookings}
          calendarEvents={getBookingsForDate(selectedDate).events}
          rooms={rooms}
          onEditBooking={onEditBooking}
          onCancelBooking={onCancelBooking}
        />
      )}
    </Card>
  )
}

