import { useState, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { updateCategory } from './api'
import { FolderOpen, FileText, Eye, EyeOff } from 'lucide-react'
import type { Category, ContentStatus } from '@/lib/database.types'

interface EditCategoryModalProps {
  category: Category
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditCategoryModal({ category, isOpen, onClose, onSuccess }: EditCategoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: category.name,
    description: category.description || '',
    status: category.status,
  })

  // Update form when category changes
  useEffect(() => {
    setFormData({
      name: category.name,
      description: category.description || '',
      status: category.status,
    })
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await updateCategory(category.id, {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดต')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="แก้ไขหมวดหมู่"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <Input
          label="ชื่อหมวดหมู่"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          leftIcon={<FolderOpen className="w-5 h-5" />}
          placeholder="เช่น การพัฒนาตนเอง, เทคโนโลยี"
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
            placeholder="อธิบายเกี่ยวกับหมวดหมู่นี้..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              {formData.status === 'published' ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              สถานะ
            </span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={formData.status === 'published'}
                onChange={() => setFormData({ ...formData, status: 'published' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">เผยแพร่</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={formData.status === 'draft'}
                onChange={() => setFormData({ ...formData, status: 'draft' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">ร่าง</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="hidden"
                checked={formData.status === 'hidden'}
                onChange={() => setFormData({ ...formData, status: 'hidden' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">ซ่อน</span>
            </label>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
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

