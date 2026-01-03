import { useState, useEffect } from 'react'
import { Card, Button, Badge, Spinner } from '@/components/ui'
import { Calendar, DoorOpen, Users, MapPin, Plus, Edit, X } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { fetchActiveRooms, fetchMyBookings, cancelBooking, type RoomWithDetails } from './api'
import type { RoomBooking } from '@/lib/database.types'
import { BookingModal } from './BookingModal'
import { EditBookingModal } from './EditBookingModal'
import { formatDate } from '@/lib/utils'
import { BookingCalendar } from './BookingCalendar'
import { useToast } from '@/contexts/ToastContext'

export function RoomsPage() {
  const { user } = useAuthContext()
  const { success, error: showError } = useToast()
  const [view, setView] = useState<'list' | 'calendar'>('calendar')
  const [rooms, setRooms] = useState<RoomWithDetails[]>([])
  const [myBookings, setMyBookings] = useState<RoomBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithDetails | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<RoomBooking | null>(null)

  const loadData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const [roomsData, bookingsData] = await Promise.all([
        fetchActiveRooms(),
        fetchMyBookings(),
      ])
      setRooms(roomsData)
      setMyBookings(bookingsData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleBookingSuccess = () => {
    loadData()
  }

  const handleBookRoom = (room?: RoomWithDetails) => {
    setSelectedRoom(room || null)
    setShowBookingModal(true)
  }

  const handleEditBooking = (booking: RoomBooking) => {
    setSelectedBooking(booking)
    setShowEditModal(true)
  }

  const handleCancelBooking = async (booking: RoomBooking) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจอง "${booking.title}"?`)) {
      return
    }

    try {
      await cancelBooking(booking.id)
      success('ยกเลิกการจองสำเร็จ')
      loadData()
    } catch (err: any) {
      showError(err.message || 'เกิดข้อผิดพลาดในการยกเลิกการจอง')
    }
  }

  const handleEditSuccess = () => {
    loadData()
    setShowEditModal(false)
    setSelectedBooking(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จองห้องประชุม</h1>
          <p className="text-gray-500 mt-1">ดูห้องที่ว่างและจองห้องประชุม</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleBookRoom()}>
          จองห้องใหม่
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === 'list' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('list')}
        >
          รายการห้อง
        </Button>
        <Button
          variant={view === 'calendar' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('calendar')}
        >
          ปฏิทิน
        </Button>
      </div>

      {view === 'list' ? (
        <>
          {/* Rooms List */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ห้องประชุมทั้งหมด</h2>
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <DoorOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">ยังไม่มีห้องประชุม</p>
                <p className="text-sm text-gray-400 mt-1">รอผู้ดูแลระบบเพิ่มห้องประชุม</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <Card key={room.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleBookRoom(room)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-5 h-5 text-primary-600" />
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                      </div>
                      <Badge variant="success">ว่าง</Badge>
                    </div>
                    {room.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{room.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <Users className="w-4 h-4" />
                      <span>ความจุ {room.capacity} คน</span>
                    </div>
                    {room.room_category_name && (
                      <p className="text-xs text-primary-600">หมวดหมู่: {room.room_category_name}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* My Bookings */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">การจองของฉัน</h2>
            {myBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">ยังไม่มีการจอง</p>
                <p className="text-sm text-gray-400 mt-1">เลือกห้องและเวลาที่ต้องการจอง</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map((booking) => {
                  const startDate = new Date(booking.start_at)
                  const endDate = new Date(booking.end_at)
                  const room = rooms.find(r => r.id === booking.room_id)
                  const canEdit = booking.status !== 'cancelled' && booking.status !== 'rejected'
                  const canCancel = booking.status !== 'cancelled'
                  
                  return (
                    <Card key={booking.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.title}</h3>
                          {room && (
                            <p className="text-sm text-gray-600 mb-1">
                              <DoorOpen className="w-4 h-4 inline mr-1" />
                              {room.name}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mb-2">
                            {formatDate(startDate.toISOString())} {startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {booking.description && (
                            <p className="text-sm text-gray-500 mb-2 whitespace-pre-wrap">{booking.description}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Edit className="w-4 h-4" />}
                                onClick={() => handleEditBooking(booking)}
                              >
                                แก้ไข
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<X className="w-4 h-4" />}
                                onClick={() => handleCancelBooking(booking)}
                              >
                                ยกเลิก
                              </Button>
                            )}
                          </div>
                        </div>
                        <Badge variant={booking.status === 'approved' ? 'success' : booking.status === 'pending' ? 'warning' : booking.status === 'cancelled' ? 'outline' : 'danger'}>
                          {booking.status === 'approved' ? 'อนุมัติ' : booking.status === 'pending' ? 'รออนุมัติ' : booking.status === 'cancelled' ? 'ยกเลิก' : 'ปฏิเสธ'}
                        </Badge>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      ) : (
        /* Calendar View */
        <BookingCalendar rooms={rooms} bookings={myBookings} onBookRoom={handleBookRoom} />
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={handleBookingSuccess}
        room={selectedRoom}
        rooms={rooms}
      />

      {/* Edit Booking Modal */}
      <EditBookingModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedBooking(null)
        }}
        onSuccess={handleEditSuccess}
        booking={selectedBooking}
      />
    </div>
  )
}
