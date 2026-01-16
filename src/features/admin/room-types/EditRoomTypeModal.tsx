import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { updateRoomType, type RoomType } from './api'
import { Tag, FileText } from 'lucide-react'

interface EditRoomTypeModalProps {
  roomType: RoomType
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditRoomTypeModal({ roomType, isOpen, onClose, onSuccess }: EditRoomTypeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: roomType.name,
    description: roomType.description || '',
    order_no: roomType.order_no,
    is_active: roomType.is_active,
  })

  useEffect(() => {
    if (roomType) {
      setFormData({
        name: roomType.name,
        description: roomType.description || '',
        order_no: roomType.order_no,
        is_active: roomType.is_active,
      })
    }
  }, [roomType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await updateRoomType(roomType.id, {
        name: formData.name,
        description: formData.description || null,
        order_no: formData.order_no,
        is_active: formData.is_active,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขประเภทของห้องประชุม')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setFormData({
      name: roomType.name,
      description: roomType.description || '',
      order_no: roomType.order_no,
      is_active: roomType.is_active,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="แก้ไขประเภทของห้องประชุม"
      description="แก้ไขข้อมูลประเภทของห้องประชุม"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <Input
          label="ชื่อประเภท"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          leftIcon={<Tag className="w-5 h-5" />}
          placeholder="เช่น อบรม, ประชุม, สัมมนา"
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              คำอธิบาย
            </span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="อธิบายเกี่ยวกับประเภทนี้..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <Input
          label="ลำดับ"
          type="number"
          value={formData.order_no.toString()}
          onChange={(e) => setFormData({ ...formData, order_no: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">สถานะ</label>
          <select
            value={formData.is_active ? 'active' : 'inactive'}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="active">ใช้งาน</option>
            <option value="inactive">ไม่ใช้งาน</option>
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

