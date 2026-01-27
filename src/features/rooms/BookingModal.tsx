import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { createBooking, fetchTableLayoutsByCategory, fetchRoomCategories, fetchRoomsByCategory } from './api'
import { useAuthContext } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getMyWallet } from '@/features/rewards/api'
import { formatPoints } from '@/lib/utils'
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
  Mail,
  Coins,
  Info
} from 'lucide-react'
import type { RoomWithDetails } from './api'
import type { UserWallet } from '@/lib/database.types'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  room?: RoomWithDetails | null
  rooms: RoomWithDetails[]
  selectedDate?: Date | null
}

// Booking types
const BOOKING_TYPES = [
  { value: 'full_day', label: 'ทั้งวัน (9:00 - 18:00)', hours: 8, points: 80, startTime: '09:00', endTime: '18:00' },
  { value: 'half_morning', label: 'ครึ่งวันเช้า (9:00 - 12:00)', hours: 3, points: 30, startTime: '09:00', endTime: '12:00' },
  { value: 'half_afternoon', label: 'ครึ่งวันบ่าย (13:00 - 18:00)', hours: 5, points: 50, startTime: '13:00', endTime: '18:00' },
  { value: 'hourly', label: 'รายชั่วโมง (กำหนดเอง)', hours: 0, points: 0, startTime: '', endTime: '' },
]

// Time slots for hourly booking
const HOURLY_TIME_SLOTS = [
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
  { value: '11:00', label: '11:00' },
  { value: '12:00', label: '12:00' },
  { value: '13:00', label: '13:00' },
  { value: '14:00', label: '14:00' },
  { value: '15:00', label: '15:00' },
  { value: '16:00', label: '16:00' },
  { value: '17:00', label: '17:00' },
  { value: '18:00', label: '18:00' },
]

// Legacy time slots (keep for backward compatibility)
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
  const [wallet, setWallet] = useState<UserWallet | null>(null)

  const [formData, setFormData] = useState({
    room_category_id: '',
    room_id: '',
    table_layout_id: '',
    event_title: '',
    speaker_name: '',
    event_description: '',
    booking_date: '',
    booking_type: '', // 'full_day', 'half_morning', 'half_afternoon', 'hourly'
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
        booking_type: '',
        time_slot: '',
        start_time: '',
        end_time: '',
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

    // Validate booking type
    if (!formData.booking_type) {
      setError('กรุณาเลือกประเภทการจอง')
      return
    }

    // Validate time for hourly booking
    if (formData.booking_type === 'hourly' && (!formData.start_time || !formData.end_time)) {
      setError('กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด')
      return
    }

    // Legacy validation for time_slot (keep for backward compatibility)
    if (!formData.booking_type && formData.time_slot === 'custom' && (!formData.start_time || !formData.end_time)) {
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
      // Parse time based on booking type
      let startTime = ''
      let endTime = ''
      
      if (formData.booking_type && formData.booking_type !== 'hourly') {
        // Use predefined booking type times
        const selectedType = BOOKING_TYPES.find(t => t.value === formData.booking_type)
        if (selectedType) {
          startTime = selectedType.startTime
          endTime = selectedType.endTime
        } else {
          throw new Error('ประเภทการจองไม่ถูกต้อง')
        }
      } else if (formData.booking_type === 'hourly' && formData.start_time && formData.end_time) {
        // Use hourly custom time
        startTime = formData.start_time
        endTime = formData.end_time
      } else if (formData.time_slot === 'custom' && formData.start_time && formData.end_time) {
        // Legacy: Use custom time input
        startTime = formData.start_time
        endTime = formData.end_time
      } else if (formData.time_slot && formData.time_slot !== 'custom') {
        // Legacy: Use predefined time slot
        [startTime, endTime] = formData.time_slot.split('-')
      } else {
        throw new Error('กรุณาเลือกประเภทการจองหรือระบุเวลาเอง')
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
      booking_type: '',
      time_slot: '',
      start_time: '',
      end_time: '',
      additional_equipment: '',
      email: userEmail,
    })
    setTableLayouts([])
    onClose()
  }

  const selectedRoom = availableRooms.find(r => r.id === formData.room_id)

  // Load wallet data
  useEffect(() => {
    if (isOpen && user) {
      getMyWallet()
        .then((walletData) => {
          setWallet(walletData || { user_id: user.id, total_points: 0, level: 1, updated_at: new Date().toISOString() })
        })
        .catch((err) => {
          console.error('Error fetching wallet:', err)
          setWallet({ user_id: user.id, total_points: 0, level: 1, updated_at: new Date().toISOString() })
        })
    }
  }, [isOpen, user])

  // Calculate points required based on booking type and time
  const calculatePointsRequired = (): number => {
    if (!formData.booking_date) return 0
    
    // If booking type is selected (not hourly), use predefined points
    if (formData.booking_type && formData.booking_type !== 'hourly') {
      const selectedType = BOOKING_TYPES.find(t => t.value === formData.booking_type)
      if (selectedType) {
        return selectedType.points
      }
    }
    
    // For hourly booking or custom time
    if (formData.booking_type === 'hourly' || formData.time_slot) {
      let startTime = ''
      let endTime = ''
      
      if (formData.booking_type === 'hourly' && formData.start_time && formData.end_time) {
        startTime = formData.start_time
        endTime = formData.end_time
      } else if (formData.time_slot === 'custom' && formData.start_time && formData.end_time) {
        startTime = formData.start_time
        endTime = formData.end_time
      } else if (formData.time_slot && formData.time_slot !== 'custom') {
        [startTime, endTime] = formData.time_slot.split('-')
      } else {
        return 0
      }
      
      try {
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        const [year, month, day] = formData.booking_date.split('-').map(Number)
        
        const startDateTime = new Date(year, month - 1, day, startHour, startMin, 0)
        const endDateTime = new Date(year, month - 1, day, endHour, endMin, 0)
        
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return 0
        if (endDateTime <= startDateTime) return 0
        
        const hoursDiff = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
        const bookingHours = Math.ceil(hoursDiff)
        return bookingHours * 10 // 1 hour = 10 points
      } catch {
        return 0
      }
    }
    
    return 0
  }

  const pointsRequired = calculatePointsRequired()
  const availablePoints = wallet?.total_points || 0
  const hasEnoughPoints = availablePoints >= pointsRequired

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

        {/* Date and Booking Type */}
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
                ประเภทการจอง <span className="text-danger-500">*</span>
              </span>
            </label>
            <select
              value={formData.booking_type}
              onChange={(e) => {
                const selectedType = BOOKING_TYPES.find(t => t.value === e.target.value)
                setFormData({ 
                  ...formData, 
                  booking_type: e.target.value,
                  time_slot: '',
                  start_time: selectedType?.value === 'hourly' ? '' : (selectedType?.startTime || ''),
                  end_time: selectedType?.value === 'hourly' ? '' : (selectedType?.endTime || ''),
                })
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">-- เลือกประเภทการจอง --</option>
              {BOOKING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} {type.points > 0 ? `(${type.points} แต้ม)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hourly Time Selection (show when "รายชั่วโมง" is selected) */}
        {formData.booking_type === 'hourly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาเริ่มต้น <span className="text-danger-500">*</span>
                </span>
              </label>
              <select
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">-- เลือกเวลาเริ่มต้น --</option>
                {HOURLY_TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาสิ้นสุด <span className="text-danger-500">*</span>
                </span>
              </label>
              <select
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">-- เลือกเวลาสิ้นสุด --</option>
                {HOURLY_TIME_SLOTS.filter(slot => {
                  // Only show times after start time
                  if (!formData.start_time) return true
                  return slot.value > formData.start_time
                }).map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Show selected booking type info */}
        {formData.booking_type && formData.booking_type !== 'hourly' && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">เวลาที่จอง:</span>{' '}
              {BOOKING_TYPES.find(t => t.value === formData.booking_type)?.startTime} - {BOOKING_TYPES.find(t => t.value === formData.booking_type)?.endTime}
              {' '}({BOOKING_TYPES.find(t => t.value === formData.booking_type)?.hours} ชั่วโมง)
            </p>
          </div>
        )}

        {/* Show hourly booking summary */}
        {formData.booking_type === 'hourly' && formData.start_time && formData.end_time && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">เวลาที่จอง:</span>{' '}
              {formData.start_time} - {formData.end_time}
              {' '}({Math.ceil(parseInt(formData.end_time.split(':')[0]) - parseInt(formData.start_time.split(':')[0]))} ชั่วโมง)
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

        {/* Points System Information */}
        <div className="p-4 rounded-lg bg-primary-50 border border-primary-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-100">
              <Coins className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                ระบบใช้แต้มในการจองห้อง
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">แต้มที่มี:</span>
                  <span className="font-semibold text-gray-900">{formatPoints(availablePoints)} แต้ม</span>
                </div>
                
                {pointsRequired > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">แต้มที่จะใช้:</span>
                      <span className={`font-semibold ${hasEnoughPoints ? 'text-primary-600' : 'text-danger-600'}`}>
                        {formatPoints(pointsRequired)} แต้ม
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">แต้มคงเหลือ:</span>
                      <span className={`font-semibold ${hasEnoughPoints ? 'text-gray-900' : 'text-danger-600'}`}>
                        {formatPoints(availablePoints - pointsRequired)} แต้ม
                      </span>
                    </div>
                  </>
                )}
                
                {!hasEnoughPoints && pointsRequired > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-danger-50 border-2 border-danger-300 animate-pulse">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">🚫</span>
                      <div>
                        <p className="text-sm font-semibold text-danger-700 mb-1">
                          แต้มไม่เพียงพอ!
                        </p>
                        <p className="text-xs text-danger-600 mb-2">
                          ต้องการ <span className="font-bold">{formatPoints(pointsRequired)}</span> แต้ม 
                          แต่มีเพียง <span className="font-bold">{formatPoints(availablePoints)}</span> แต้ม
                        </p>
                        <p className="text-xs text-danger-600">
                          ขาดอีก <span className="font-bold text-danger-700">{formatPoints(pointsRequired - availablePoints)}</span> แต้ม
                        </p>
                        <div className="mt-2 pt-2 border-t border-danger-200">
                          <p className="text-xs text-danger-700 font-medium">
                            💡 ไปเรียนเพิ่มเพื่อสะสมแต้มนะ!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-primary-200">
                <div className="space-y-1.5 text-xs">
                  <div className="mb-2">
                    <p className="font-semibold text-gray-900 mb-1.5">📋 อัตราค่าบริการ:</p>
                    <div className="space-y-1 ml-2 text-gray-600">
                      <p>• <span className="font-medium">ทั้งวัน</span> (9:00-18:00) = <span className="font-semibold text-primary-600">80 แต้ม</span></p>
                      <p>• <span className="font-medium">ครึ่งวันเช้า</span> (9:00-12:00) = <span className="font-semibold text-primary-600">30 แต้ม</span></p>
                      <p>• <span className="font-medium">ครึ่งวันบ่าย</span> (13:00-18:00) = <span className="font-semibold text-primary-600">50 แต้ม</span></p>
                      <p>• <span className="font-medium">รายชั่วโมง</span> = 10 แต้ม/ชั่วโมง</p>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="font-semibold text-gray-900 mb-1.5">📊 ขีดจำกัด:</p>
                    <div className="space-y-1 ml-2 text-gray-600">
                      <p>• รายวัน: จองได้ไม่เกิน 8 ชั่วโมงต่อวัน</p>
                      <p>• รายเดือน: จองได้ไม่เกิน 20 ชั่วโมงต่อเดือน</p>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="font-semibold text-gray-900 mb-1.5">💰 วิธีหาแต้ม:</p>
                    <div className="space-y-1 ml-2 text-gray-600">
                      <p>• จบ 1 บทเรียน (EP) = <span className="font-semibold text-primary-600">10 แต้ม</span></p>
                      <p>• จบทั้งวิชา = <span className="font-semibold text-primary-600">+50 แต้ม</span></p>
                      <p>• เรียนต่อเนื่อง = <span className="font-semibold text-primary-600">+40 แต้ม</span></p>
                    </div>
                  </div>
                  
                  <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-800">
                      💡 <strong>คำแนะนำ:</strong> แต้มจะถูกหักเมื่อจองสำเร็จ และจะคืนเมื่อยกเลิกการจอง
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            disabled={loading || (!hasEnoughPoints && pointsRequired > 0)}
            title={!hasEnoughPoints && pointsRequired > 0 ? 'แต้มไม่เพียงพอ' : ''}
          >
            {!hasEnoughPoints && pointsRequired > 0 ? '🚫 แต้มไม่พอ' : 'บันทึกการจอง'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}


