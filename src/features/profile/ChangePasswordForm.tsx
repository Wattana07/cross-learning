import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { Lock, Eye, EyeOff } from 'lucide-react'

export function ChangePasswordForm() {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'กรุณากรอกรหัสผ่านใหม่'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'กรุณายืนยันรหัสผ่านใหม่'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        throw new Error('ไม่พบข้อมูลผู้ใช้')
      }

      // Try to sign in with current password to verify
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      })

      if (signInError) {
        throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง')
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (updateError) {
        throw updateError
      }

      success('เปลี่ยนรหัสผ่านสำเร็จ')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err: any) {
      console.error('Error changing password:', err)
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
      showError(errorMessage)
      
      if (errorMessage.includes('รหัสผ่านปัจจุบัน')) {
        setErrors({ currentPassword: errorMessage })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="รหัสผ่านปัจจุบัน"
          type={showCurrentPassword ? 'text' : 'password'}
          value={formData.currentPassword}
          onChange={(e) => {
            setFormData({ ...formData, currentPassword: e.target.value })
            if (errors.currentPassword) {
              setErrors({ ...errors, currentPassword: '' })
            }
          }}
          leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showCurrentPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          }
          placeholder="กรอกรหัสผ่านปัจจุบัน"
          required
          error={errors.currentPassword}
        />
      </div>

      <div>
        <Input
          label="รหัสผ่านใหม่"
          type={showNewPassword ? 'text' : 'password'}
          value={formData.newPassword}
          onChange={(e) => {
            setFormData({ ...formData, newPassword: e.target.value })
            if (errors.newPassword) {
              setErrors({ ...errors, newPassword: '' })
            }
          }}
          leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          }
          placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
          required
          error={errors.newPassword}
          hint="รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
        />
      </div>

      <div>
        <Input
          label="ยืนยันรหัสผ่านใหม่"
          type={showConfirmPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={(e) => {
            setFormData({ ...formData, confirmPassword: e.target.value })
            if (errors.confirmPassword) {
              setErrors({ ...errors, confirmPassword: '' })
            }
          }}
          leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          }
          placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
          required
          error={errors.confirmPassword}
        />
      </div>

      <div className="pt-2">
        <Button type="submit" loading={loading} leftIcon={<Lock className="w-4 h-4" />}>
          เปลี่ยนรหัสผ่าน
        </Button>
      </div>
    </form>
  )
}

