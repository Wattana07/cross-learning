import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button, Input, Card } from '@/components/ui'
import { logger } from '@/lib/logger'
import { Mail, Lock, BookOpen } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string })?.from || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      await logger.success('user_login', {
        details: { email }
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      await logger.error('user_login', {
        errorMessage: err.message || 'Login failed',
        details: { email }
      })
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Cross-Learning Platform</h1>
          <p className="text-gray-500 mt-2">เข้าสู่ระบบเพื่อเริ่มเรียนรู้</p>
        </div>

        {/* Login Form */}
        <Card variant="elevated" padding="lg" className="shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            <Input
              label="อีเมลหรือรหัสสมาชิก"
              type="text"
              placeholder="your@email.com หรือรหัสสมาชิก"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-5 w-5" />}
              required
              autoComplete="username"
            />

            <Input
              label="รหัสผ่าน"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-5 w-5" />}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              เข้าสู่ระบบ
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2 mt-6">
          <Link
            to="/forgot-password"
            className="block text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            ลืมรหัสผ่าน?
          </Link>
          <p className="text-sm text-gray-500">
            หากยังไม่มีบัญชี กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </div>
    </div>
  )
}

