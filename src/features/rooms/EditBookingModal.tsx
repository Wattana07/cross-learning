import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { updateBooking } from './api'
import { useToast } from '@/contexts/ToastContext'
import { Calendar, Clock, FileText } from 'lucide-react'
import type { RoomBooking } from '@/lib/database.types'

interface EditBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  booking: RoomBooking | null
}

// Time slots (can be customized)
const TIME_SLOTS = [
  { value: '08:00-10:00', label: '08:00 - 10:00' },
  { value: '10:00-12:00', label: '10:00 - 12:00' },
  { value: '13:00-15:00', label: '13:00 - 15:00' },
  { value: '15:00-17:00', label: '15:00 - 17:00' },
  { value: '17:00-19:00', label: '17:00 - 19:00' },
]

export function EditBookingModal({ isOpen, onClose, onSuccess, booking }: EditBookingModalProps) {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    event_title: '',
    event_description: '',
    booking_date: '',
    time_slot: '',
    start_time: '',
    end_time: '',
  })

  // Initialize form when booking changes
  useEffect(() => {
    if (booking && isOpen) {
      const startDate = new Date(booking.start_at)
      const endDate = new Date(booking.end_at)
      
      // Use local date/time to avoid timezone issues
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const day = String(startDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      const startTime = String(startDate.getHours()).padStart(2, '0') + ':' + String(startDate.getMinutes()).padStart(2, '0')
      const endTime = String(endDate.getHours()).padStart(2, '0') + ':' + String(endDate.getMinutes()).padStart(2, '0')
      
      // Check if matches a time slot
      const timeSlot = TIME_SLOTS.find(slot => {
        const [slotStart, slotEnd] = slot.value.split('-')
        return slotStart === startTime && slotEnd === endTime
      })

      setFormData({
        event_title: booking.title || '',
        event_description: booking.description || '',
        booking_date: dateStr,
        time_slot: timeSlot?.value || 'custom',
        start_time: startTime,
        end_time: endTime,
      })
      setError('')
    }
  }, [isOpen, booking])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return
    setError('')

    // Validation
    if (!formData.event_title.trim()) {
      setError('กรุณากรอกชื่องาน')
      return
    }

    if (!formData.booking_date) {
      setError('กรุณาเลือกวันที่ต้องการจอง')
      return
    }

    // Validate time
    if (!formData.time_slot && (!formData.start_time || !formData.end_time)) {
      setError('กรุณาเลือกช่วงเวลาหรือระบุเวลาเอง')
      return
    }

    if (formData.time_slot === 'custom' && (!formData.start_time || !formData.end_time)) {
      setError('กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด')
      return
    }

    setLoading(true)

    try {
      // Parse time
      let startTime = ''
      let endTime = ''
      
      if (formData.time_slot === 'custom' && formData.start_time && formData.end_time) {
        startTime = formData.start_time
        endTime = formData.end_time
      } else if (formData.time_slot && formData.time_slot !== 'custom') {
        [startTime, endTime] = formData.time_slot.split('-')
      } else {
        throw new Error('กรุณาเลือกช่วงเวลาหรือระบุเวลาเอง')
      }

      // Create date in local timezone to avoid timezone conversion issues
      const [year, month, day] = formData.booking_date.split('-').map(Number)
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      const startDateTime = new Date(year, month - 1, day, startHour, startMin, 0)
      const endDateTime = new Date(year, month - 1, day, endHour, endMin, 0)

      // Validate time
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('รูปแบบวันที่หรือเวลาไม่ถูกต้อง')
      }

      if (endDateTime <= startDateTime) {
        throw new Error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      }

      await updateBooking({
        bookingId: booking.id,
        title: formData.event_title.trim(),
        description: formData.event_description.trim() || undefined,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
      })

      success('แก้ไขการจองสำเร็จ')
      onSuccess()
      handleClose()
    } catch (err: any) {
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการแก้ไขการจอง'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError('')
    setFormData({
      event_title: '',
      event_description: '',
      booking_date: '',
      time_slot: '',
      start_time: '',
      end_time: '',
    })
    onClose()
  }

  if (!booking) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="แก้ไขการจองห้องประชุม"
      description="แก้ไขข้อมูลการจองห้องประชุม"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600 font-medium">{error}</p>
          </div>
        )}

        {/* Event Details */}
        <div className="space-y-4">
          <Input
            label="ชื่องาน"
            value={formData.event_title}
            onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
            placeholder="เช่น การประชุมทีม, อบรมพนักงาน"
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                รายละเอียดงาน
              </span>
            </label>
            <textarea
              value={formData.event_description}
              onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
              placeholder="รายละเอียดเกี่ยวกับงาน..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                วันที่ต้องการจอง <span className="text-danger-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={formData.booking_date}
              onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                ช่วงเวลา <span className="text-danger-500">*</span>
              </span>
            </label>
            <select
              value={formData.time_slot}
              onChange={(e) => setFormData({ ...formData, time_slot: e.target.value, start_time: '', end_time: '' })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">-- เลือกช่วงเวลา --</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
              <option value="custom">กำหนดเอง</option>
            </select>
          </div>
        </div>

        {/* Custom Time Input */}
        {formData.time_slot === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาเริ่มต้น <span className="text-danger-500">*</span>
                </span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาสิ้นสุด <span className="text-danger-500">*</span>
                </span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={loading}>
            บันทึกการแก้ไข
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

