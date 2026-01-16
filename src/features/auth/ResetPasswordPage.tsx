import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input, Card } from '@/components/ui'
import { Lock, BookOpen, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user has valid session from password reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      }
    })
  }, [])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว'
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว'
    }
    if (!/(?=.*[0-9])/.test(pwd)) {
      return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      console.error('Reset password error:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการตั้งค่ารหัสผ่าน')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <div className="relative w-full max-w-md">
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ตั้งค่ารหัสผ่านสำเร็จ</h1>
            <p className="text-gray-600 mb-6">
              รหัสผ่านของคุณถูกอัปเดตแล้ว กรุณาใช้รหัสผ่านใหม่ในการเข้าสู่ระบบ
            </p>
            <p className="text-sm text-gray-500">กำลังเปลี่ยนหน้าไปยังหน้า Login...</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ตั้งค่ารหัสผ่านใหม่</h1>
          <p className="text-gray-500 mt-2">กรุณาใส่รหัสผ่านใหม่ของคุณ</p>
        </div>

        {/* Form */}
        <Card variant="elevated" padding="lg" className="shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            <Input
              label="รหัสผ่านใหม่"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-5 w-5" />}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 -mt-3">
              ต้องมีอย่างน้อย 8 ตัวอักษร รวมตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข
            </p>

            <Input
              label="ยืนยันรหัสผ่าน"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="h-5 w-5" />}
              required
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              ตั้งค่ารหัสผ่านใหม่
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

