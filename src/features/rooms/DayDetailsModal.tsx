import { Modal, Badge, Button } from '@/components/ui'
import { Calendar, DoorOpen, Clock, MapPin, User, Calendar as CalendarIcon, X, Edit } from 'lucide-react'
import type { RoomBooking } from '@/lib/database.types'
import type { RoomWithDetails, CalendarEvent } from './api'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DayDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  roomBookings: RoomBooking[]
  calendarEvents: CalendarEvent[]
  rooms: RoomWithDetails[]
  onEditBooking?: (booking: RoomBooking) => void
  onCancelBooking?: (booking: RoomBooking) => void
}

export function DayDetailsModal({
  isOpen,
  onClose,
  date,
  roomBookings,
  calendarEvents,
  rooms,
  onEditBooking,
  onCancelBooking,
}: DayDetailsModalProps) {
  if (!date) return null

  const dateStr = date.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const totalItems = roomBookings.length + calendarEvents.length

  // Sort bookings by time
  const sortedBookings = [...roomBookings].sort((a, b) => {
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  })

  // Sort events by time
  const sortedEvents = [...calendarEvents].sort((a, b) => {
    const timeA = a.time || '00:00'
    const timeB = b.time || '00:00'
    return timeA.localeCompare(timeB)
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`กิจกรรมในวัน${dateStr}`}
      description={`พบทั้งหมด ${totalItems} รายการ`}
      size="lg"
    >
      <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Room Bookings Section */}
        {sortedBookings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-primary-600" />
              การจองห้องประชุม ({sortedBookings.length})
            </h3>
            <div className="space-y-3">
              {sortedBookings.map((booking) => {
                const room = rooms.find(r => r.id === booking.room_id)
                const startDate = new Date(booking.start_at)
                const endDate = new Date(booking.end_at)
                const startTime = startDate.toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const endTime = endDate.toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const canEdit = booking.status !== 'cancelled' && booking.status !== 'rejected' && onEditBooking
                const canCancel = booking.status !== 'cancelled' && onCancelBooking

                return (
                  <div
                    key={booking.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      booking.status === 'approved' && 'bg-green-50 border-green-200',
                      booking.status === 'pending' && 'bg-yellow-50 border-yellow-200',
                      booking.status === 'rejected' && 'bg-red-50 border-red-200',
                      booking.status === 'cancelled' && 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{booking.title}</h4>
                        
                        <div className="space-y-1.5 text-sm text-gray-600">
                          {room && (
                            <div className="flex items-center gap-2">
                              <DoorOpen className="w-4 h-4 text-gray-400" />
                              <span>{room.name}</span>
                              {room.location && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span>{room.location}</span>
                                </>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>
                              {startTime} - {endTime}
                            </span>
                          </div>
                        </div>

                        {booking.description && (
                          <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap bg-white/50 p-3 rounded border border-gray-200">
                            {booking.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge
                          variant={
                            booking.status === 'approved'
                              ? 'success'
                              : booking.status === 'pending'
                              ? 'warning'
                              : booking.status === 'cancelled'
                              ? 'outline'
                              : 'danger'
                          }
                        >
                          {booking.status === 'approved'
                            ? 'อนุมัติ'
                            : booking.status === 'pending'
                            ? 'รออนุมัติ'
                            : booking.status === 'cancelled'
                            ? 'ยกเลิก'
                            : 'ปฏิเสธ'}
                        </Badge>

                        {(canEdit || canCancel) && (
                          <div className="flex gap-2">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onEditBooking?.(booking)
                                  onClose()
                                }}
                                leftIcon={<Edit className="w-3 h-3" />}
                              >
                                แก้ไข
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจอง "${booking.title}"?`
                                    )
                                  ) {
                                    onCancelBooking?.(booking)
                                  }
                                }}
                                leftIcon={<X className="w-3 h-3" />}
                              >
                                ยกเลิก
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Calendar Events Section */}
        {sortedEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Calendar Events - Happy MPM ({sortedEvents.length})
            </h3>
            <div className="space-y-3">
              {sortedEvents.map((event, index) => {
                const timeDisplay = event.time ? event.time.substring(0, 5) : 'ไม่ระบุเวลา'

                return (
                  <div
                    key={event.id || `event-${index}`}
                    className="p-4 rounded-lg border bg-blue-50 border-blue-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
                        
                        <div className="space-y-1.5 text-sm text-gray-600">
                          {event.category && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-blue-700">{event.category}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{timeDisplay}</span>
                          </div>
                        </div>

                        {event.description && (
                          <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap bg-white/50 p-3 rounded border border-blue-200">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <Badge variant="info">Calendar Event</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalItems === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ไม่พบกิจกรรมในวันนี้</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

