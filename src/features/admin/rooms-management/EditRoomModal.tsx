import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { updateRoom, type RoomWithRelations } from './api'
import { DoorOpen, MapPin, Users, LayoutGrid } from 'lucide-react'
import { fetchTableLayoutsByCategory } from '../table-layouts/api'
import type { RoomStatus } from '@/lib/database.types'

interface EditRoomModalProps {
  room: RoomWithRelations
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: { id: string; name: string }[]
  roomTypes: { id: string; name: string }[]
}

export function EditRoomModal({ room, isOpen, onClose, onSuccess, categories, roomTypes }: EditRoomModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tableLayouts, setTableLayouts] = useState<{ id: string; name: string }[]>([])

  const [formData, setFormData] = useState({
    name: room.name,
    location: room.location || '',
    capacity: room.capacity,
    room_category_id: room.room_category_id || '',
    room_type_id: room.room_type_id || '',
    table_layout_id: room.table_layout_id || '',
    status: room.status,
  })

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        location: room.location || '',
        capacity: room.capacity,
        room_category_id: room.room_category_id || '',
        room_type_id: room.room_type_id || '',
        table_layout_id: room.table_layout_id || '',
        status: room.status,
      })
    }
  }, [room])

  // Load table layouts when category changes
  useEffect(() => {
    if (formData.room_category_id) {
      fetchTableLayoutsByCategory(formData.room_category_id)
        .then((layouts) => {
          setTableLayouts(layouts.map(layout => ({ id: layout.id, name: layout.name })))
        })
        .catch((err) => {
          console.error('Error fetching table layouts:', err)
          setTableLayouts([])
        })
    } else {
      setTableLayouts([])
    }
  }, [formData.room_category_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await updateRoom(room.id, {
        name: formData.name,
        location: formData.location || null,
        capacity: formData.capacity,
        room_category_id: formData.room_category_id || null,
        room_type_id: formData.room_type_id || null,
        table_layout_id: formData.table_layout_id || null,
        status: formData.status,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขห้องประชุม')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setFormData({
      name: room.name,
      location: room.location || '',
      capacity: room.capacity,
      room_category_id: room.room_category_id || '',
      room_type_id: room.room_type_id || '',
      table_layout_id: room.table_layout_id || '',
      status: room.status,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="แก้ไขห้องประชุม"
      description="แก้ไขข้อมูลห้องประชุม"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <Input
          label="ชื่อห้องประชุม"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          leftIcon={<DoorOpen className="w-5 h-5" />}
          placeholder="เช่น ห้องประชุมใหญ่, ห้องประชุม A"
          required
        />

        <Input
          label="สถานที่"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          leftIcon={<MapPin className="w-5 h-5" />}
          placeholder="เช่น ชั้น 5, อาคาร A"
        />

        <Input
          label="ความจุ"
          type="number"
          value={formData.capacity.toString()}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
          leftIcon={<Users className="w-5 h-5" />}
          placeholder="10"
          required
          min={1}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            หมวดหมู่ห้องประชุม
          </label>
          <select
            value={formData.room_category_id}
            onChange={(e) => setFormData({ ...formData, room_category_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">-- เลือกหมวดหมู่ --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {formData.room_category_id && tableLayouts.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                รูปแบบการจัดโต๊ะ
              </span>
            </label>
            <select
              value={formData.table_layout_id}
              onChange={(e) => setFormData({ ...formData, table_layout_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">-- เลือกรูปแบบ --</option>
              {tableLayouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            ประเภทของห้องประชุม
          </label>
          <select
            value={formData.room_type_id}
            onChange={(e) => setFormData({ ...formData, room_type_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">-- เลือกประเภท --</option>
            {roomTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">สถานะ</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="active">ใช้งาน</option>
            <option value="maintenance">ซ่อมบำรุง</option>
          </select>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={loading}>
            บันทึก
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

