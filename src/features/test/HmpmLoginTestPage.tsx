import { useState } from 'react'
import { Card, Button, Input, Spinner, Badge } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, XCircle, AlertCircle, User, Key, Database, ExternalLink } from 'lucide-react'

type TestResult = {
  success: boolean
  step: string
  data?: any
  error?: string
}

type HmpmProfile = {
  access_token?: string
  expire?: string
  mcode?: string
  name?: string
  member_group?: string[]
  pos_cur?: {
    POS_SHORT?: string
    POS_NAME?: string
  } | null
  honor?: {
    POS_SHORT?: string
    POS_NAME?: string
  } | null
  member_status?: number
}

export function HmpmLoginTestPage() {
  const [memId, setMemId] = useState('')
  const [memPass, setMemPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [hmpmProfile, setHmpmProfile] = useState<HmpmProfile | null>(null)
  const [supabaseEmail, setSupabaseEmail] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<any>(null)

  const handleTest = async () => {
    if (!memId.trim() || !memPass.trim()) {
      setResults([{
        success: false,
        step: 'validation',
        error: 'กรุณากรอก mem_id และ mem_pass'
      }])
      return
    }

    setLoading(true)
    setResults([])
    setHmpmProfile(null)
    setSupabaseEmail(null)
    setProfileData(null)

    const newResults: TestResult[] = []

    try {
      // Step 1: เรียก edge function hmpm-login
      newResults.push({
        success: true,
        step: '1. เรียก Edge Function (hmpm-login)',
        data: { mem_id: memId }
      })
      setResults([...newResults])

      let fnError: any = null
      let data: any = null
      
      try {
        const result = await supabase.functions.invoke('hmpm-login', {
          body: {
            mem_id: memId,
            mem_pass: memPass,
          },
        })
        fnError = result.error
        data = result.data
      } catch (err: any) {
        fnError = err
      }

      if (fnError || !data?.ok) {
        let errorMessage = fnError?.message || data?.error || data?.message || 'Unknown error'
        
        // แสดงข้อความที่เข้าใจง่ายขึ้น
        if (data?.error === 'HMPM_CONFIG_MISSING') {
          errorMessage = '❌ Environment Variables ยังไม่ได้ตั้งค่า!\n\nกรุณาไปที่ Supabase Dashboard → Edge Functions → hmpm-login → Settings\nแล้วเพิ่ม:\n- HMPM_AUTH_USER = HappyMPM2Acitve@OMC?USER\n- HMPM_AUTH_PASS = HappyMPMAcitve@OMC?PASS'
        } else if (data?.error === 'HMPM_TOKEN_ERROR' || data?.error === 'HMPM_MEMBER_ERROR') {
          errorMessage = `❌ เรียก API HMPM ไม่สำเร็จ: ${data?.message || errorMessage}\n\nตรวจสอบ:\n1. Environment Variables ตั้งค่าถูกต้องหรือยัง\n2. API HMPM ใช้งานได้หรือไม่\n3. mem_id และ mem_pass ถูกต้องหรือไม่`
        } else if (fnError?.message?.includes('non-2xx')) {
          errorMessage = `❌ Edge Function return error status\n\nError: ${data?.error || 'Unknown'}\nMessage: ${data?.message || fnError?.message}\n\nตรวจสอบ logs ใน Supabase Dashboard → Edge Functions → hmpm-login → Logs`
        }
        
        newResults.push({
          success: false,
          step: '2. Response จาก Edge Function',
          error: errorMessage,
          data: data || { rawError: fnError }
        })
        setResults([...newResults])
        setLoading(false)
        return
      }

      newResults.push({
        success: true,
        step: '2. Response จาก Edge Function',
        data: {
          ok: data.ok,
          supabase_email: data.supabase_email,
          has_hmpm_profile: !!data.hmpm_profile
        }
      })

      setSupabaseEmail(data.supabase_email as string)
      setHmpmProfile(data.hmpm_profile as HmpmProfile)
      setResults([...newResults])

      // Step 3: ดึงข้อมูล profile จาก Supabase
      if (data.supabase_email) {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError) {
            // ถ้ายังไม่ได้ login ก็ลอง query ด้วย email
            const { data: profileByEmail, error: emailError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', data.supabase_email)
              .single()

            if (!emailError && profileByEmail) {
              newResults.push({
                success: true,
                step: '3. ดึงข้อมูล Profile จาก Supabase',
                data: profileByEmail
              })
              setProfileData(profileByEmail)
            } else {
              newResults.push({
                success: false,
                step: '3. ดึงข้อมูล Profile จาก Supabase',
                error: emailError?.message || 'ไม่พบ profile',
              })
            }
          } else if (profile) {
            newResults.push({
              success: true,
              step: '3. ดึงข้อมูล Profile จาก Supabase',
              data: profile
            })
            setProfileData(profile)
          }
        } else {
          // ถ้ายังไม่ได้ login ให้ query ด้วย email โดยตรง (ต้องใช้ service role หรือ RLS อนุญาต)
          // สำหรับ test นี้เราจะบอกว่าให้ login ก่อน
          newResults.push({
            success: false,
            step: '3. ดึงข้อมูล Profile จาก Supabase',
            error: 'ยังไม่ได้ login - ไม่สามารถดึง profile ได้ (ต้อง login ก่อน)',
          })
        }
      }

      setResults([...newResults])

    } catch (error: any) {
      newResults.push({
        success: false,
        step: 'Error',
        error: error.message || String(error)
      })
      setResults([...newResults])
    } finally {
      setLoading(false)
    }
  }

  const handleTestLogin = async () => {
    if (!supabaseEmail) {
      alert('ยังไม่มี supabase_email - กรุณาทดสอบ login ก่อน')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: supabaseEmail,
        password: memPass,
      })

      if (error) {
        alert(`Login failed: ${error.message}`)
      } else {
        alert(`Login สำเร็จ! User ID: ${data.user?.id}`)
        // Reload page to refresh auth state
        window.location.reload()
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 HMPM Login Test Page
          </h1>
          <p className="text-gray-600">
            หน้านี้ใช้สำหรับทดสอบการ login กับระบบ HMPM และ sync ข้อมูลเข้าสู่ Supabase
          </p>
        </div>

        {/* Test Form */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-600" />
            กรอกข้อมูลทดสอบ
          </h2>
          
          <div className="space-y-4">
            <Input
              label="รหัสสมาชิก (mem_id)"
              placeholder="เช่น 999999901"
              value={memId}
              onChange={(e) => setMemId(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="รหัสผ่าน (mem_pass)"
              type="password"
              placeholder="กรอกรหัสผ่าน"
              value={memPass}
              onChange={(e) => setMemPass(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
            />

            <Button
              onClick={handleTest}
              loading={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'กำลังทดสอบ...' : '🚀 เริ่มทดสอบ'}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-600" />
              ผลการทดสอบ
            </h2>

            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {result.step}
                      </div>
                      {result.error && (
                        <div className="text-sm text-red-700 mb-2">
                          ❌ {result.error}
                        </div>
                      )}
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                            ดูข้อมูล (คลิกเพื่อขยาย)
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* HMPM Profile Data */}
        {hmpmProfile && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary-600" />
              ข้อมูลจาก HMPM API
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">รหัสสมาชิก</div>
                  <div className="font-medium">{hmpmProfile.mcode || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ชื่อ</div>
                  <div className="font-medium">{hmpmProfile.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">สถานะ</div>
                  <div>
                    <Badge variant={hmpmProfile.member_status === 1 ? 'success' : 'default'}>
                      {hmpmProfile.member_status === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">หมดอายุ</div>
                  <div className="font-medium">{hmpmProfile.expire || '-'}</div>
                </div>
              </div>
              
              {hmpmProfile.member_group && hmpmProfile.member_group.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">กลุ่มสมาชิก</div>
                  <div className="flex flex-wrap gap-2">
                    {hmpmProfile.member_group.map((group, idx) => (
                      <Badge key={idx} variant="default">{group}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {hmpmProfile.pos_cur && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">ตำแหน่งปัจจุบัน</div>
                  <div className="font-medium">
                    {hmpmProfile.pos_cur.POS_NAME} ({hmpmProfile.pos_cur.POS_SHORT})
                  </div>
                </div>
              )}

              {hmpmProfile.honor && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">ตำแหน่งเกียรติ</div>
                  <div className="font-medium">
                    {hmpmProfile.honor.POS_NAME} ({hmpmProfile.honor.POS_SHORT})
                  </div>
                </div>
              )}

              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  ดูข้อมูลทั้งหมด (JSON)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(hmpmProfile, null, 2)}
                </pre>
              </details>
            </div>
          </Card>
        )}

        {/* Supabase Profile Data */}
        {profileData && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-600" />
              ข้อมูล Profile ใน Supabase
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">User ID</div>
                  <div className="font-mono text-xs">{profileData.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{profileData.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ชื่อ</div>
                  <div className="font-medium">{profileData.full_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Role</div>
                  <Badge variant={profileData.role === 'admin' ? 'danger' : 'default'}>
                    {profileData.role}
                  </Badge>
                </div>
                {profileData.hmpm_mcode && (
                  <>
                    <div>
                      <div className="text-sm text-gray-500">HMPM MCode</div>
                      <div className="font-medium">{profileData.hmpm_mcode}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">HMPM Status</div>
                      <Badge variant={profileData.hmpm_member_status === 1 ? 'success' : 'default'}>
                        {profileData.hmpm_member_status === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  ดูข้อมูลทั้งหมด (JSON)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(profileData, null, 2)}
                </pre>
              </details>
            </div>
          </Card>
        )}

        {/* Test Login Button */}
        {supabaseEmail && (
          <Card variant="bordered" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">ทดสอบ Login เข้าระบบ</div>
                <div className="text-sm text-gray-500 mt-1">
                  Supabase Email: <code className="bg-gray-100 px-1 rounded">{supabaseEmail}</code>
                </div>
              </div>
              <Button
                onClick={handleTestLogin}
                loading={loading}
                variant="outline"
              >
                🔐 ทดสอบ Login
              </Button>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card variant="bordered" padding="md" className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <div className="font-medium mb-2">📝 คำแนะนำ:</div>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>หน้านี้ใช้สำหรับทดสอบเท่านั้น - ไม่กระทบกับหน้า login จริง</li>
                <li>หลังจากทดสอบสำเร็จ คุณสามารถใช้ <code className="bg-blue-100 px-1 rounded">mem_id</code> และ <code className="bg-blue-100 px-1 rounded">mem_pass</code> ไป login ที่หน้า <code className="bg-blue-100 px-1 rounded">/login</code> ได้เลย</li>
                <li>ระบบจะสร้าง/อัปเดต user ใน Supabase อัตโนมัติเมื่อ login ครั้งแรก</li>
                <li>ข้อมูล profile จะ sync จาก HMPM ทุกครั้งที่ login</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
