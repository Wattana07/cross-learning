import { useState, useRef, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { updateSubject, fetchCategoriesForSelect } from './api'
import { uploadSubjectCover, getSubjectCoverUrl } from '@/lib/storage'
import { BookMarked, FileText, Eye, EyeOff, Camera, X, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Subject, ContentStatus, UnlockMode } from '@/lib/database.types'

interface EditSubjectModalProps {
  subject: Subject & { category_name?: string }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditSubjectModal({ subject, isOpen, onClose, onSuccess }: EditSubjectModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    category_id: subject.category_id,
    title: subject.title,
    description: subject.description || '',
    level: subject.level || 'beginner',
    unlock_mode: subject.unlock_mode,
    status: subject.status,
  })

  // Load categories
  useEffect(() => {
    if (isOpen) {
      fetchCategoriesForSelect().then(setCategories)
    }
  }, [isOpen])

  // Load current cover
  useEffect(() => {
    async function loadCover() {
      if (subject.cover_path) {
        const url = await getSubjectCoverUrl(subject.cover_path)
        setCurrentCoverUrl(url)
      }
    }
    loadCover()
  }, [subject])

  // Update form when subject changes
  useEffect(() => {
    setFormData({
      category_id: subject.category_id,
      title: subject.title,
      description: subject.description || '',
      level: subject.level || 'beginner',
      unlock_mode: subject.unlock_mode,
      status: subject.status,
    })
    setCoverPreview(null)
    setCoverFile(null)
  }, [subject])

  const handleCoverClick = () => {
    fileInputRef.current?.click()
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 15MB')
      return
    }

    setCoverFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Upload cover first if provided
      let coverPath = subject.cover_path
      if (coverFile) {
        try {
          coverPath = await uploadSubjectCover(coverFile, subject.id)
        } catch (coverError: any) {
          throw new Error(`ไม่สามารถอัปโหลดรูป: ${coverError.message}`)
        }
      }

      // Update subject
      await updateSubject(subject.id, {
        category_id: formData.category_id,
        title: formData.title,
        description: formData.description || null,
        level: formData.level || 'beginner',
        unlock_mode: formData.unlock_mode,
        status: formData.status,
        cover_path: coverPath,
      })

      setCoverFile(null)
      setCoverPreview(null)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดต')
    } finally {
      setLoading(false)
    }
  }

  const displayCover = coverPreview || currentCoverUrl

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="แก้ไขวิชา"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        {/* Category Selection */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              หมวดหมู่
            </span>
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="">เลือกหมวดหมู่</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cover Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            รูปปก
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {displayCover ? (
                <img
                  src={displayCover}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                  <BookMarked className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={handleCoverClick}
                className={cn(
                  'absolute bottom-0 right-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors',
                  displayCover && 'opacity-0 group-hover:opacity-100'
                )}
                title="เลือกรูปปกใหม่"
              >
                <Camera className="w-4 h-4" />
              </button>
              {displayCover && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-danger-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="ลบรูป"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                คลิกที่รูปเพื่อเลือกรูปภาพใหม่
              </p>
              <p className="text-xs text-gray-400 mt-1">
                รองรับ JPG, PNG, GIF (สูงสุด 15MB)
              </p>
            </div>
          </div>
        </div>

        <Input
          label="ชื่อวิชา"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          leftIcon={<BookMarked className="w-5 h-5" />}
          placeholder="เช่น React Basics, Python 101"
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
            placeholder="อธิบายเกี่ยวกับวิชานี้..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            ระดับ
          </label>
          <select
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="beginner">เริ่มต้น</option>
            <option value="intermediate">ปานกลาง</option>
            <option value="advanced">ขั้นสูง</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            โหมดการปลดล็อก
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="unlock_mode"
                value="sequential"
                checked={formData.unlock_mode === 'sequential'}
                onChange={() => setFormData({ ...formData, unlock_mode: 'sequential' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">ตามลำดับ</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="unlock_mode"
                value="open"
                checked={formData.unlock_mode === 'open'}
                onChange={() => setFormData({ ...formData, unlock_mode: 'open' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">เปิดทั้งหมด</span>
            </label>
          </div>
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

