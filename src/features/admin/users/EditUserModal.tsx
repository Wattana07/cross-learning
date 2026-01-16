import { useState, useRef, useEffect } from 'react'
import { Modal, ModalFooter, Button, Input, Badge, Avatar } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { uploadAvatar } from '@/lib/storage'
import { User, Building, Shield, Mail, Camera, X } from 'lucide-react'
import type { Profile } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface EditUserModalProps {
  user: Profile
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditUserModal({ user, isOpen, onClose, onSuccess }: EditUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    fullName: user.full_name || '',
    department: user.department || '',
    role: user.role,
    isActive: user.is_active,
  })

  // Update form when user changes
  useEffect(() => {
    setFormData({
      fullName: user.full_name || '',
      department: user.department || '',
      role: user.role,
      isActive: user.is_active,
    })
    setAvatarPreview(null)
    setAvatarFile(null)
  }, [user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 15MB')
      return
    }

    setAvatarFile(file)

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Upload avatar first if provided
      let avatarPath = user.avatar_path
      if (avatarFile) {
        try {
          avatarPath = await uploadAvatar(avatarFile, user.id)
        } catch (avatarError: any) {
          throw new Error(`ไม่สามารถอัปโหลดรูป: ${avatarError.message}`)
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          department: formData.department || null,
          role: formData.role,
          is_active: formData.isActive,
          avatar_path: avatarPath,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarFile(null)
      setAvatarPreview(null)
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
      title="แก้ไขข้อมูลผู้ใช้"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        {/* Avatar Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            รูปโปรไฟล์
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar
                src={avatarPreview || user.avatar_path}
                name={formData.fullName || user.full_name || 'U'}
                size="lg"
                className="w-20 h-20"
              />
              <button
                type="button"
                onClick={handleAvatarClick}
                className={cn(
                  'absolute bottom-0 right-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors',
                  (avatarPreview || user.avatar_path) && 'opacity-0 group-hover:opacity-100'
                )}
                title="เปลี่ยนรูปโปรไฟล์"
              >
                <Camera className="w-4 h-4" />
              </button>
              {(avatarPreview || user.avatar_path) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
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
                onChange={handleAvatarChange}
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

        {/* Email (readonly) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            อีเมล
          </label>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">{user.email}</span>
          </div>
        </div>

        <Input
          label="ชื่อ-นามสกุล"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          leftIcon={<User className="w-5 h-5" />}
          placeholder="กรอกชื่อ-นามสกุล"
          required
        />

        <Input
          label="แผนก/หน่วยงาน"
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          leftIcon={<Building className="w-5 h-5" />}
          placeholder="เช่น ฝ่ายบุคคล, IT"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Role
            </span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="learner"
                checked={formData.role === 'learner'}
                onChange={() => setFormData({ ...formData, role: 'learner' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">Learner</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={formData.role === 'admin'}
                onChange={() => setFormData({ ...formData, role: 'admin' })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-gray-700">Admin</span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            สถานะบัญชี
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={formData.isActive}
                onChange={() => setFormData({ ...formData, isActive: true })}
                className="w-4 h-4 text-primary-600"
              />
              <Badge variant="success" size="sm">ใช้งาน</Badge>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={!formData.isActive}
                onChange={() => setFormData({ ...formData, isActive: false })}
                className="w-4 h-4 text-primary-600"
              />
              <Badge variant="danger" size="sm">ระงับ</Badge>
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
