import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { updateTableLayout, type TableLayout } from './api'
import { LayoutGrid, FileText, Users, Image as ImageIcon } from 'lucide-react'

interface EditTableLayoutModalProps {
  layout: TableLayout
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: { id: string; name: string }[]
}

export function EditTableLayoutModal({ layout, isOpen, onClose, onSuccess, categories }: EditTableLayoutModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    room_category_id: layout.room_category_id,
    name: layout.name,
    description: layout.description || '',
    image_url: layout.image_url || '',
    max_capacity: layout.max_capacity,
    order_no: layout.order_no,
    is_active: layout.is_active,
  })

  useEffect(() => {
    if (layout) {
      setFormData({
        room_category_id: layout.room_category_id,
        name: layout.name,
        description: layout.description || '',
        image_url: layout.image_url || '',
        max_capacity: layout.max_capacity,
        order_no: layout.order_no,
        is_active: layout.is_active,
      })
    }
  }, [layout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await updateTableLayout(layout.id, {
        room_category_id: formData.room_category_id,
        name: formData.name,
        description: formData.description || null,
        image_url: formData.image_url || null,
        max_capacity: formData.max_capacity,
        order_no: formData.order_no,
        is_active: formData.is_active,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขรูปแบบการจัดโต๊ะ')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setFormData({
      room_category_id: layout.room_category_id,
      name: layout.name,
      description: layout.description || '',
      image_url: layout.image_url || '',
      max_capacity: layout.max_capacity,
      order_no: layout.order_no,
      is_active: layout.is_active,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="แก้ไขรูปแบบการจัดโต๊ะ"
      description="แก้ไขข้อมูลรูปแบบการจัดโต๊ะ"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            หมวดหมู่ห้องประชุม <span className="text-danger-500">*</span>
          </label>
          <select
            value={formData.room_category_id}
            onChange={(e) => setFormData({ ...formData, room_category_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="">-- เลือกหมวดหมู่ --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="ชื่อรูปแบบ"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          leftIcon={<LayoutGrid className="w-5 h-5" />}
          placeholder="เช่น จัดแบบตัวยู, จัดแบบประชุมคณะกรรมการ"
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
            placeholder="อธิบายเกี่ยวกับรูปแบบการจัดโต๊ะนี้..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <Input
          label="URL รูปภาพ"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          leftIcon={<ImageIcon className="w-5 h-5" />}
          placeholder="https://example.com/image.jpg"
        />

        <Input
          label="จำนวนคนสูงสุด"
          type="number"
          value={formData.max_capacity.toString()}
          onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 1 })}
          leftIcon={<Users className="w-5 h-5" />}
          placeholder="10"
          required
          min={1}
        />

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

