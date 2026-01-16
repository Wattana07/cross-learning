import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Card } from '@/components/ui'
import { Mail, ArrowLeft, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Get site URL for password reset link
      let siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'
      
      if (!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
        if (window.location.origin && !window.location.origin.includes('localhost')) {
          siteUrl = window.location.origin
        }
      }
      
      if (siteUrl && !siteUrl.startsWith('https://')) {
        siteUrl = siteUrl.replace(/^http:\/\//, 'https://')
      }
      siteUrl = siteUrl.replace(/\/$/, '')

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      })

      if (error) throw error

      setSent(true)
    } catch (err: any) {
      console.error('Forgot password error:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งอีเมล')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
        <div className="relative w-full max-w-md">
          <Card variant="elevated" padding="lg" className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ส่งอีเมลสำเร็จ</h1>
            <p className="text-gray-600 mb-6">
              เราส่งลิงก์ตั้งค่ารหัสผ่านใหม่ไปยัง <strong>{email}</strong> แล้ว
            </p>
            <p className="text-sm text-gray-500 mb-6">
              กรุณาตรวจสอบอีเมลและคลิกลิงก์เพื่อตั้งค่ารหัสผ่านใหม่
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/login')} className="w-full">
                กลับไปหน้า Login
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
                className="w-full"
              >
                ส่งอีเมลอีกครั้ง
              </Button>
            </div>
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
          <h1 className="text-2xl font-bold text-gray-900">ลืมรหัสผ่าน</h1>
          <p className="text-gray-500 mt-2">ใส่อีเมลเพื่อรับลิงก์ตั้งค่ารหัสผ่านใหม่</p>
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
              label="อีเมล"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-5 w-5" />}
              required
              autoComplete="email"
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              ส่งลิงก์ตั้งค่ารหัสผ่าน
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <ArrowLeft className="w-4 h-4" />
                กลับไปหน้า Login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

