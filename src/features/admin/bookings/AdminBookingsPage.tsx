import { useState, useEffect } from 'react'
import { Card, Button, Badge, Spinner, Input } from '@/components/ui'
import { 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DoorOpen,
  User,
  Mail,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { fetchAllBookings, updateBookingStatus, deleteBooking, type BookingWithDetails } from './api'
import { formatDate } from '@/lib/utils'
import type { BookingStatus } from '@/lib/database.types'
import { cn } from '@/lib/utils'

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [actionMenuBooking, setActionMenuBooking] = useState<string | null>(null)

  const loadBookings = async () => {
    setLoading(true)
    try {
      const data = await fetchAllBookings()
      setBookings(data)
    } catch (error: any) {
      console.error('Error fetching bookings:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = !searchQuery || 
      booking.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.room_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booker_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleStatusUpdate = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status)
      await loadBookings()
      setActionMenuBooking(null)
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const handleDelete = async (booking: BookingWithDetails) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการจอง "${booking.title}"?`)) {
      return
    }

    try {
      await deleteBooking(booking.id)
      await loadBookings()
      setActionMenuBooking(null)
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            อนุมัติ
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            รออนุมัติ
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            ปฏิเสธ
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            ยกเลิก
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการการจองห้องประชุม</h1>
        <p className="text-sm text-gray-500 mt-1">อนุมัติหรือปฏิเสธการจองห้องประชุม</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาการจอง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | BookingStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบการจอง</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const startDate = new Date(booking.start_at)
            const endDate = new Date(booking.end_at)

            return (
              <Card key={booking.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{booking.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <DoorOpen className="w-4 h-4" />
                            <span>{booking.room_name}</span>
                            {booking.room_location && (
                              <span className="text-gray-400">({booking.room_location})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(startDate.toISOString())}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative ml-4">
                        <button
                          onClick={() =>
                            setActionMenuBooking(
                              actionMenuBooking === booking.id ? null : booking.id
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        {actionMenuBooking === booking.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuBooking(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(booking.id, 'approved')}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-success-600 hover:bg-success-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    อนุมัติ
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    ปฏิเสธ
                                  </button>
                                </>
                              )}
                              {(booking.status === 'approved' || booking.status === 'rejected') && (
                                <button
                                  onClick={() => handleStatusUpdate(booking.id, 'pending')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Clock className="w-4 h-4" />
                                  เปลี่ยนเป็นรออนุมัติ
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(booking)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                ลบ
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Booker Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{booking.booker_name || 'ไม่ระบุ'}</span>
                        </div>
                        {booking.booker_email && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{booking.booker_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {booking.description && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.description}</p>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      <span className="text-xs text-gray-400">
                        สร้างเมื่อ {formatDate(booking.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

