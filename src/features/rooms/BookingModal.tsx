import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { createBooking, fetchTableLayoutsByCategory, fetchRoomCategories, fetchRoomsByCategory } from './api'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { 
  User, 
  Hash, 
  DoorOpen, 
  LayoutGrid, 
  Users, 
  FileText, 
  Calendar, 
  Clock,
  Settings,
  FolderOpen,
  Mail
} from 'lucide-react'
import type { RoomWithDetails } from './api'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  room?: RoomWithDetails | null
  rooms: RoomWithDetails[]
  selectedDate?: Date | null
}

// Time slots (can be customized)
const TIME_SLOTS = [
  { value: '08:00-10:00', label: '08:00 - 10:00' },
  { value: '10:00-12:00', label: '10:00 - 12:00' },
  { value: '13:00-15:00', label: '13:00 - 15:00' },
  { value: '15:00-17:00', label: '15:00 - 17:00' },
  { value: '17:00-19:00', label: '17:00 - 19:00' },
]

export function BookingModal({ isOpen, onClose, onSuccess, room, rooms, selectedDate }: BookingModalProps) {
  const { profile, user } = useAuthContext()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [tableLayouts, setTableLayouts] = useState<Array<{ id: string; name: string; max_capacity: number }>>([])
  const [loadingLayouts, setLoadingLayouts] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<RoomWithDetails[]>(rooms)

  const [formData, setFormData] = useState({
    room_category_id: '',
    room_id: '',
    table_layout_id: '',
    event_title: '',
    speaker_name: '',
    event_description: '',
    booking_date: '',
    time_slot: '',
    start_time: '',
    end_time: '',
    additional_equipment: '',
    email: '',
  })

  // Load table layouts function
  const loadTableLayouts = async (categoryId: string) => {
    setLoadingLayouts(true)
    try {
      const layouts = await fetchTableLayoutsByCategory(categoryId)
      setTableLayouts(layouts)
      // Reset table_layout_id when category changes
      setFormData(prev => ({ ...prev, table_layout_id: '' }))
    } catch (err) {
      console.error('Error fetching table layouts:', err)
      setTableLayouts([])
    } finally {
      setLoadingLayouts(false)
    }
  }

  // Reset form when modal opens/closes or room changes
  useEffect(() => {
    if (isOpen) {
      const initialRoomId = room?.id || ''
      // Auto-fill email from profile
      const userEmail = profile?.email || user?.email || ''
      
      // Format selected date if provided
      let bookingDate = ''
      if (selectedDate) {
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        bookingDate = `${year}-${month}-${day}`
      }
      
      setFormData({
        room_category_id: '',
        room_id: initialRoomId,
        table_layout_id: '',
        event_title: '',
        speaker_name: '',
        event_description: '',
        booking_date: bookingDate,
        time_slot: '',
        room_type_id: '',
        additional_equipment: '',
        email: userEmail,
      })
      setError('')
      setTableLayouts([])
      setAvailableRooms(rooms)
      
      // Load categories
      fetchRoomCategories()
        .then((categoriesData) => {
          setCategories(categoriesData)
        })
        .catch((err) => console.error('Error fetching categories:', err))
    }
  }, [isOpen, room?.id, rooms, selectedDate])

  // Load rooms and table layouts when category changes
  useEffect(() => {
    if (formData.room_category_id && isOpen) {
      // Load rooms by category
      fetchRoomsByCategory(formData.room_category_id)
        .then((categoryRooms) => {
          setAvailableRooms(categoryRooms)
          setFormData(prev => ({ ...prev, room_id: '' }))
        })
        .catch((err) => {
          console.error('Error fetching rooms by category:', err)
          setAvailableRooms([])
        })
      
      // Load table layouts for this category
      loadTableLayouts(formData.room_category_id)
    } else if (!formData.room_category_id && isOpen) {
      setAvailableRooms(rooms)
      setTableLayouts([])
      setFormData(prev => ({ ...prev, room_id: '', table_layout_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.room_category_id, isOpen])

  // Get selected table layout max capacity
  const selectedTableLayout = tableLayouts.find(layout => layout.id === formData.table_layout_id)
  const maxCapacity = selectedTableLayout?.max_capacity

  // Get min date (7 days from now)
  const getMinDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.room_category_id) {
      setError('กรุณาเลือกห้องประชุม')
      return
    }

    if (tableLayouts.length > 0 && !formData.table_layout_id) {
      setError('กรุณาเลือกรูปแบบการจัดโต๊ะ')
      return
    }

    if (!formData.event_title.trim()) {
      setError('กรุณากรอกชื่องาน')
      return
    }

    if (!formData.event_description.trim()) {
      setError('กรุณากรอกรายละเอียดงาน')
      return
    }

    if (!formData.booking_date) {
      setError('กรุณาเลือกวันที่ต้องการจอง')
      return
    }

    // Validate time - either time_slot or custom time must be provided
    if (!formData.time_slot && (!formData.start_time || !formData.end_time)) {
      setError('กรุณาเลือกช่วงเวลาหรือระบุเวลาเอง')
      return
    }

    if (formData.time_slot === 'custom' && (!formData.start_time || !formData.end_time)) {
      setError('กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด')
      return
    }

    // Validate date is at least 7 days from now
    const selectedDate = new Date(formData.booking_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const minDate = new Date(today)
    minDate.setDate(today.getDate() + 7)
    
    if (selectedDate < minDate) {
      setError('กรุณาเลือกวันที่ล่วงหน้าอย่างน้อย 7 วัน')
      return
    }

    setLoading(true)

    try {
      // Parse time - use custom time if provided, otherwise use time_slot
      let startTime = ''
      let endTime = ''
      
      if (formData.time_slot === 'custom' && formData.start_time && formData.end_time) {
        // Use custom time input
        startTime = formData.start_time
        endTime = formData.end_time
      } else if (formData.time_slot && formData.time_slot !== 'custom') {
        // Use predefined time slot
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

      // Use selected room or first available room in category
      // Since every category has at least one room, we can safely use the first one
      let selectedRoomId = formData.room_id?.trim() || ''
      
      console.log('Submit - selectedRoomId:', selectedRoomId, 'availableRooms:', availableRooms.length, 'categoryId:', formData.room_category_id)
      
      // If no room selected, use first available room from category
      if (!selectedRoomId && formData.room_category_id) {
        // Always fetch rooms from category to ensure we have the latest data
        try {
          console.log('Fetching rooms for category:', formData.room_category_id)
          const categoryRooms = await fetchRoomsByCategory(formData.room_category_id)
          console.log('Fetched category rooms:', categoryRooms.length, categoryRooms)
          
          if (categoryRooms.length > 0 && categoryRooms[0]?.id) {
            selectedRoomId = categoryRooms[0].id
            setAvailableRooms(categoryRooms)
            console.log('Using first room from category:', selectedRoomId)
          } else if (availableRooms.length > 0 && availableRooms[0]?.id) {
            // Fallback to availableRooms if fetch returns empty
            selectedRoomId = availableRooms[0].id
            console.log('Using fallback room from availableRooms:', selectedRoomId)
          }
        } catch (fetchError) {
          console.error('Error fetching rooms by category:', fetchError)
          // Try to use availableRooms as fallback
          if (availableRooms.length > 0 && availableRooms[0]?.id) {
            selectedRoomId = availableRooms[0].id
            console.log('Using availableRooms after error:', selectedRoomId)
          }
        }
      }

      console.log('Final selectedRoomId before validation:', selectedRoomId)

      // Validate room_id before creating booking
      if (!selectedRoomId) {
        setError('ไม่พบห้องประชุมในหมวดหมู่นี้ กรุณาติดต่อผู้ดูแลระบบ')
        setLoading(false)
        return
      }

      // Validate email
      if (!formData.email.trim()) {
        setError('กรุณากรอกอีเมล')
        setLoading(false)
        return
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        setError('รูปแบบอีเมลไม่ถูกต้อง')
        setLoading(false)
        return
      }

      await createBooking({
        room_id: selectedRoomId,
        title: formData.event_title.trim(),
        description: formData.event_description.trim() || null,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        speaker_name: formData.speaker_name.trim() || undefined,
        additional_equipment: formData.additional_equipment.trim() || undefined,
        email: formData.email.trim(),
      })

      success('จองห้องประชุมสำเร็จ กรุณารอการอนุมัติจากผู้ดูแลระบบ')
      onSuccess()
      handleClose()
    } catch (err: any) {
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการจองห้องประชุม'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return // Prevent closing while submitting
    setError('')
    const userEmail = profile?.email || user?.email || ''
    setFormData({
      room_category_id: '',
      room_id: '',
      table_layout_id: '',
      event_title: '',
      speaker_name: '',
      event_description: '',
      booking_date: '',
      time_slot: '',
      room_type_id: '',
      additional_equipment: '',
      email: userEmail,
    })
    setTableLayouts([])
    onClose()
  }

  const selectedRoom = availableRooms.find(r => r.id === formData.room_id)

  // Debug: Log rooms when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('BookingModal - Available rooms:', availableRooms.length, availableRooms)
      console.log('BookingModal - Categories:', categories.length, categories)
      console.log('BookingModal - Table layouts:', tableLayouts.length, tableLayouts)
    }
  }, [isOpen, availableRooms, categories, tableLayouts])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="กรุณากรอกข้อมูลการจองห้องประชุม"
      description="กรุณากรอกข้อมูลครบถ้วนเพื่อดำเนินการจองห้องประชุม"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600 font-medium">{error}</p>
          </div>
        )}

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ชื่อผู้จอง"
            value={profile?.full_name || ''}
            leftIcon={<User className="w-5 h-5" />}
            disabled
            required
          />
          <Input
            label="รหัสสมาชิกผู้จอง"
            value={user?.id || ''}
            leftIcon={<Hash className="w-5 h-5" />}
            disabled
            required
          />
        </div>

        {/* Category Selection (แสดงเป็น "ห้องประชุม" แต่จริงๆคือหมวดหมู่) */}
        {categories.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4" />
                ห้องประชุม
              </span>
            </label>
            <select
              value={formData.room_category_id}
              onChange={(e) => setFormData({ ...formData, room_category_id: e.target.value, room_id: '', table_layout_id: '' })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">-- เลือกห้องประชุม --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.room_category_id 
                ? `เลือกห้องในหมวดหมู่ "${categories.find(c => c.id === formData.room_category_id)?.name}"` 
                : 'เลือกประเภทห้องประชุมที่ต้องการ'}
            </p>
          </div>
        )}

        {/* Room Selection (แสดงเฉพาะเมื่อเลือกหมวดหมู่แล้ว) */}
        {formData.room_category_id && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRooms.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4" />
                    เลือกห้อง
                  </span>
                </label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value, table_layout_id: '' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">-- เลือกห้อง (ถ้าไม่เลือกจะใช้ห้องแรก) --</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.location ? `(${r.location})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  มี {availableRooms.length} ห้องให้เลือก (ถ้าไม่เลือกจะใช้ห้องแรกอัตโนมัติ)
                </p>
              </div>
            )}

            {formData.room_category_id && tableLayouts.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    รูปแบบการจัดโต๊ะ {tableLayouts.length > 0 && <span className="text-danger-500">*</span>}
                  </span>
                </label>
              {loadingLayouts ? (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-400">
                  กำลังโหลดรูปแบบการจัดโต๊ะ...
                </div>
              ) : tableLayouts.length > 0 ? (
                <>
                  <select
                    value={formData.table_layout_id}
                    onChange={(e) => setFormData({ ...formData, table_layout_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- เลือกรูปแบบ --</option>
                    {tableLayouts.map((layout) => (
                      <option key={layout.id} value={layout.id}>
                        {layout.name} (รองรับ {layout.max_capacity} คน)
                      </option>
                    ))}
                  </select>
                  {maxCapacity !== undefined && formData.table_layout_id && (
                    <p className="mt-1 text-sm text-gray-600 font-medium">จำนวนคนสูงสุด: {maxCapacity} คน</p>
                  )}
                </>
              ) : (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-400">
                  ไม่มีรูปแบบการจัดโต๊ะสำหรับหมวดหมู่นี้
                </div>
              )}
              </div>
            )}
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

          <Input
            label="ชื่อวิทยากร"
            value={formData.speaker_name}
            onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
            placeholder="ชื่อวิทยากร"
          />

          <Input
            label="อีเมล"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="อีเมลสำหรับติดต่อ"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                รายละเอียดงาน <span className="text-danger-500">*</span>
              </span>
            </label>
            <textarea
              value={formData.event_description}
              onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
              placeholder="รายละเอียดเกี่ยวกับงาน..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              required
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
              min={getMinDate()}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">⚠️ ต้องจองล่วงหน้าอย่างน้อย 7 วัน</p>
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

        {/* Custom Time Input (show when "กำหนดเอง" is selected) */}
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

        {/* Show selected time slot */}
        {formData.time_slot && formData.time_slot !== 'custom' && (
          <div>
            <p className="text-sm text-gray-600 mt-2">
              เวลาที่เลือก: {TIME_SLOTS.find(s => s.value === formData.time_slot)?.label}
            </p>
          </div>
        )}

        {/* Additional Equipment */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              อุปกรณ์เพิ่มเติม
            </span>
          </label>
          <textarea
            value={formData.additional_equipment}
            onChange={(e) => setFormData({ ...formData, additional_equipment: e.target.value })}
            placeholder="ระบุอุปกรณ์เพิ่มเติมที่ต้องการ เช่น ไมโครโฟน, Projector, Whiteboard..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={loading}>
            บันทึกการจอง
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}


