import { useState, useRef } from 'react'
import { Modal, ModalFooter, Button, Input, Avatar } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { uploadAvatar } from '@/lib/storage'
import { useToast } from '@/contexts/ToastContext'
import { logger } from '@/lib/logger'
import { User, Mail, Lock, Building, Shield, Camera, X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    department: '',
    role: 'learner' as 'learner' | 'admin',
  })

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
      // Get production site URL (for redirect link in email)
      // Use Vercel URL as default
      let siteUrl = 'https://cross-learning.vercel.app';
      
      // Override with env var if set and valid (not localhost)
      if (import.meta.env.VITE_SITE_URL && !import.meta.env.VITE_SITE_URL.includes('localhost')) {
        siteUrl = import.meta.env.VITE_SITE_URL;
      } else if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
        siteUrl = window.location.origin;
      }
      
      // Force HTTPS if not already
      if (siteUrl && !siteUrl.startsWith('https://')) {
        siteUrl = siteUrl.replace(/^http:\/\//, 'https://');
      }
      
      // Remove trailing slash
      siteUrl = siteUrl.replace(/\/$/, '');
      
      console.log('Using siteUrl for email redirect:', siteUrl);
      
      // Edge Function จะใช้ RESEND_API_KEY จาก Supabase Secrets โดยอัตโนมัติ
      // ไม่ต้องส่ง API key จาก frontend เพื่อความปลอดภัย
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          fullName: formData.fullName,
          department: formData.department || null,
          role: formData.role,
          siteUrl: siteUrl, // Send production URL for email links
        },
      })

      if (fnError) {
        // Handle Edge Function errors
        if (fnError.message?.includes('Failed to send') || fnError.message?.includes('fetch failed')) {
          throw new Error(
            'ไม่สามารถเชื่อมต่อกับ Edge Function ได้\n\n' +
            'วิธีแก้ไข:\n' +
            '1. ตรวจสอบว่า Edge Function "create-user" ถูก deploy แล้ว\n' +
            '   - เปิด Terminal และรัน: npx supabase functions deploy create-user\n' +
            '2. ตรวจสอบว่า Supabase Project ถูก link แล้ว\n' +
            '   - รัน: npx supabase link --project-ref wmfuzaahfdknfjvqwwsi\n' +
            '3. ตรวจสอบ Network Connection\n\n' +
            `Error: ${fnError.message}`
          )
        }
        throw new Error(fnError.message || 'เกิดข้อผิดพลาดในการเรียก Edge Function')
      }

      if (!data.ok) {
        // Handle specific errors with user-friendly messages
        let errorMessage = 'เกิดข้อผิดพลาด'
        
        if (data.reason === 'USER_EXISTS') {
          errorMessage = `อีเมล "${formData.email}" ถูกใช้งานแล้วในระบบ กรุณาใช้อีเมลอื่น`
        } else if (data.reason === 'AUTH_ERROR') {
          if (data.error?.includes('already been registered') || data.error?.includes('already exists')) {
            errorMessage = `อีเมล "${formData.email}" ถูกใช้งานแล้วในระบบ กรุณาใช้อีเมลอื่น`
          } else {
            errorMessage = `ไม่สามารถสร้าง account: ${data.error || 'เกิดข้อผิดพลาด'}`
          }
        } else if (data.reason === 'NOT_ADMIN') {
          errorMessage = 'คุณไม่มีสิทธิ์ในการสร้างผู้ใช้'
        } else if (data.reason === 'MISSING_FIELDS') {
          errorMessage = 'กรุณากรอกข้อมูลให้ครบ'
        } else if (data.reason === 'PROFILE_ERROR') {
          errorMessage = `ไม่สามารถสร้าง profile: ${data.error || 'เกิดข้อผิดพลาด'}`
        } else {
          errorMessage = data.error || 'เกิดข้อผิดพลาด'
        }
        
        throw new Error(errorMessage)
      }

      // Check for warnings (user created but email failed)
      if (data.warning) {
        console.warn('User created with warning:', data.warning);
        if (data.emailError) {
          console.error('Email error:', data.emailError);
          console.error('Suggestion:', data.suggestion);
          
          // Check if it's a domain/verification error
          const isVerificationError = data.emailError?.includes('403') || 
                                     data.emailError?.includes('testing emails') ||
                                     data.emailError?.includes('verify');
          
          if (isVerificationError) {
            showError(
              `ผู้ใช้ถูกสร้างแล้ว แต่ส่งอีเมลไม่สำเร็จ\n\n` +
              `สาเหตุ: ${data.emailError}\n\n` +
              `💡 วิธีแก้:\n` +
              `1. ไปที่ Resend Dashboard (https://resend.com/emails) และ verify email: ${formData.email}\n` +
              `2. หรือ verify domain ใน Resend เพื่อส่งไปยัง email ใดๆ ได้\n\n` +
              `กรุณาตั้งรหัสผ่านให้ผู้ใช้เองชั่วคราว`
            )
          } else {
            showError(`ผู้ใช้ถูกสร้างแล้ว แต่ส่งอีเมลไม่สำเร็จ: ${data.emailError}. กรุณาตรวจสอบ Logs หรือตั้งรหัสผ่านให้ผู้ใช้เอง`)
          }
        } else {
          showError(`ผู้ใช้ถูกสร้างแล้ว แต่ส่งอีเมลไม่สำเร็จ. กรุณาตรวจสอบ Logs`)
        }
      }

      // Upload avatar if provided
      if (avatarFile && data.userId) {
        try {
          const avatarPath = await uploadAvatar(avatarFile, data.userId)
          await supabase
            .from('profiles')
            .update({ avatar_path: avatarPath })
            .eq('id', data.userId)
        } catch (avatarError: any) {
          console.error('Error uploading avatar:', avatarError)
          // Don't fail the whole operation if avatar upload fails
        }
      }

      // Show generated password
      if (data.password) {
        setGeneratedPassword(data.password)
      }

      // Log the user creation
      await logger.success('user_create', {
        resourceType: 'user',
        resourceId: data.userId,
        details: {
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          department: formData.department,
        },
      })

      // Success (email sending is now disabled)
      success(`สร้างผู้ใช้สำเร็จ! กรุณาบันทึกรหัสผ่านที่สร้างให้ผู้ใช้`)
    } catch (err: any) {
      // Log the error
      await logger.error('user_create', {
        resourceType: 'user',
        details: {
          email: formData.email,
          fullName: formData.fullName,
        },
        errorMessage: err.message || 'Unknown error',
      })
      
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setFormData({
      email: '',
      fullName: '',
      department: '',
      role: 'learner',
    })
    setAvatarFile(null)
    setAvatarPreview(null)
    setGeneratedPassword(null)
    setPasswordCopied(false)
    onClose()
  }

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const handleContinueAfterPassword = () => {
    setFormData({
      email: '',
      fullName: '',
      department: '',
      role: 'learner',
    })
    setAvatarFile(null)
    setAvatarPreview(null)
    setGeneratedPassword(null)
    setPasswordCopied(false)
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="เพิ่มผู้ใช้ใหม่"
      description="สร้าง account ใหม่ให้ผู้ใช้"
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
            รูปโปรไฟล์ (ไม่บังคับ)
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar
                src={avatarPreview}
                name={formData.fullName || 'U'}
                size="lg"
                className="w-20 h-20"
              />
              <button
                type="button"
                onClick={handleAvatarClick}
                className={cn(
                  'absolute bottom-0 right-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors',
                  avatarPreview && 'opacity-0 group-hover:opacity-100'
                )}
                title="เปลี่ยนรูปโปรไฟล์"
              >
                <Camera className="w-4 h-4" />
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-danger-600 transition-colors"
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
                คลิกที่รูปเพื่อเลือกรูปภาพ
              </p>
              <p className="text-xs text-gray-400 mt-1">
                รองรับ JPG, PNG, GIF (สูงสุด 15MB)
              </p>
            </div>
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
          label="อีเมล"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          leftIcon={<Mail className="w-5 h-5" />}
          placeholder="email@example.com"
          hint="ผู้ใช้จะได้รับอีเมลเพื่อตั้งรหัสผ่านเอง"
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
              <span className="text-gray-700">Learner (ผู้เรียน)</span>
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
              <span className="text-gray-700">Admin (ผู้ดูแล)</span>
            </label>
          </div>
        </div>

        {/* Show generated password */}
        {generatedPassword && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              รหัสผ่านที่สร้างให้ผู้ใช้
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={generatedPassword}
                readOnly
                className="font-mono text-lg font-bold bg-white"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                leftIcon={passwordCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {passwordCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </Button>
            </div>
            <p className="text-xs text-green-700">
              ⚠️ กรุณาบันทึกรหัสผ่านนี้ให้ผู้ใช้ ก่อนปิดหน้าต่างนี้ (รหัสผ่านจะไม่แสดงอีกครั้ง)
            </p>
          </div>
        )}

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            {generatedPassword ? 'ปิด' : 'ยกเลิก'}
          </Button>
          {generatedPassword ? (
            <Button type="button" onClick={handleContinueAfterPassword}>
              เสร็จสิ้น
            </Button>
          ) : (
          <Button type="submit" loading={loading}>
            สร้างผู้ใช้
          </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  )
}
