import { useState, useEffect } from 'react'
import { Card, Button, Input, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { Mail, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export function EmailTestPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('ทดสอบระบบส่งอีเมล')
  const [html, setHtml] = useState(`<h1>สวัสดี!</h1><p>นี่คืออีเมลทดสอบจากระบบ</p><p>ส่งจาก: <strong>webmaster@happympm.com</strong></p>`)
  const [text, setText] = useState('สวัสดี! นี่คืออีเมลทดสอบจากระบบ')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [hasSession, setHasSession] = useState(false)

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      if (!session) {
        setResult({
          success: false,
          error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (ไม่มี session)',
        })
      }
    })
  }, [])

  const handleSend = async () => {
    if (!to || !subject) {
      alert('กรุณากรอกอีเมลผู้รับและหัวข้อ')
      return
    }

    // Check session before sending
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setResult({
        success: false,
        error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (ไม่มี session)',
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log('[EmailTest] Calling send-email function...')
      console.log('[EmailTest] Has session:', !!session)
      console.log('[EmailTest] Payload:', { to, subject, html: html?.substring(0, 50) + '...', text: text?.substring(0, 50) + '...' })
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject,
          html,
          text,
        },
      })

      console.log('[EmailTest] Response:', { data, error })

      if (error) {
        console.error('[EmailTest] Function error:', error)
        setResult({
          success: false,
          error: `Error: ${error.message || JSON.stringify(error)}`,
        })
      } else if (data?.ok) {
        setResult({
          success: true,
          message: `ส่งอีเมลสำเร็จ! Message ID: ${data.messageId || 'N/A'}`,
        })
      } else {
        console.error('[EmailTest] Function returned error:', data)
        setResult({
          success: false,
          error: data?.error || data?.reason || 'ไม่สามารถส่งอีเมลได้',
        })
      }
    } catch (error: any) {
      console.error('[EmailTest] Exception:', error)
      setResult({
        success: false,
        error: `Exception: ${error.message || JSON.stringify(error)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ทดสอบระบบส่งอีเมล</h1>
        <p className="text-sm text-gray-500 mt-1">
          ทดสอบการส่งอีเมลผ่าน Gmail SMTP (webmaster@happympm.com)
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อีเมลผู้รับ *
            </label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หัวข้ออีเมล *
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="หัวข้ออีเมล"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เนื้อหา HTML
            </label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={8}
              placeholder="<h1>Hello</h1>"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เนื้อหา Plain Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Hello"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || !to || !subject}
            className="w-full"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                กำลังส่ง...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                ส่งอีเมลทดสอบ
              </>
            )}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className={`p-6 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? 'ส่งอีเมลสำเร็จ!' : 'ส่งอีเมลไม่สำเร็จ'}
              </h3>
              <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message || result.error}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!hasSession && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">คำเตือน</h3>
              <p className="text-sm text-yellow-700">
                ไม่พบ session กรุณาเข้าสู่ระบบก่อนใช้งาน
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">ข้อมูลการตั้งค่า</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• ผู้ส่ง: <strong>webmaster@happympm.com</strong></p>
          <p>• ใช้ Gmail SMTP ผ่าน EmailJS (HTTP API wrapper)</p>
          <p>• App Password: ตั้งค่าใน Supabase Secrets</p>
          <p>• Session: {hasSession ? '✅ มี session' : '❌ ไม่มี session'}</p>
        </div>
      </Card>
    </div>
  )
}

