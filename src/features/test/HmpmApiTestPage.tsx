import { useState } from 'react'
import { Card, Button, Input, Spinner, Badge } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, XCircle, Key, Database, ExternalLink, RefreshCw } from 'lucide-react'

type Api1Response = {
  STATUS: string
  STATUS_CODE: number
  MESSAGE: string
  DATA?: {
    access_token: string
    expire: number
  }
}

type Api2Response = {
  STATUS: string
  STATUS_CODE: number
  MESSAGE: string
  DATA?: {
    access_token: string
    expire: string
    mcode: string
    name: string
    member_group: string[]
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
}

export function HmpmApiTestPage() {
  // API 1 - Get Token
  const [authUser, setAuthUser] = useState('HappyMPM2Acitve@OMC?USER')
  const [authPass, setAuthPass] = useState('HappyMPMAcitve@OMC?PASS')
  const [api1Loading, setApi1Loading] = useState(false)
  const [api1Result, setApi1Result] = useState<Api1Response | null>(null)
  const [api1Error, setApi1Error] = useState<string | null>(null)
  const [storedToken, setStoredToken] = useState<string | null>(null)

  // API 2 - Get Member Info
  const [memId, setMemId] = useState('999999901')
  const [memPass, setMemPass] = useState('2025')
  const [api2Loading, setApi2Loading] = useState(false)
  const [api2Result, setApi2Result] = useState<Api2Response | null>(null)
  const [api2Error, setApi2Error] = useState<string | null>(null)

  // Call API 1 - Get Token (ผ่าน Edge Function เพื่อหลีกเลี่ยง CORS)
  const handleCallApi1 = async () => {
    if (!authUser.trim() || !authPass.trim()) {
      setApi1Error('กรุณากรอก auth_user และ auth_pass')
      return
    }

    setApi1Loading(true)
    setApi1Error(null)
    setApi1Result(null)
    setStoredToken(null)

    try {
      // เรียกผ่าน Edge Function เพื่อหลีกเลี่ยง CORS
      const { data, error } = await supabase.functions.invoke('hmpm-api-proxy', {
        body: {
          endpoint: 'token',
          auth_user: authUser,
          auth_pass: authPass,
        },
      })

      if (error) {
        setApi1Error(error.message || 'เกิดข้อผิดพลาดในการเรียก API 1')
        setApi1Result(null)
        return
      }

      const apiData = data as Api1Response

      if (apiData.STATUS === 'SUCCESS' && apiData.DATA?.access_token) {
        setApi1Result(apiData)
        setStoredToken(apiData.DATA.access_token)
        setApi1Error(null)
      } else {
        setApi1Error(apiData.MESSAGE || `Status: ${apiData.STATUS}, Code: ${apiData.STATUS_CODE}`)
        setApi1Result(apiData)
      }
    } catch (error: any) {
      setApi1Error(error.message || 'เกิดข้อผิดพลาดในการเรียก API 1')
      setApi1Result(null)
    } finally {
      setApi1Loading(false)
    }
  }

  // Call API 2 - Get Member Info (using token from API 1, ผ่าน Edge Function)
  const handleCallApi2 = async () => {
    if (!memId.trim() || !memPass.trim()) {
      setApi2Error('กรุณากรอก mem_id และ mem_pass')
      return
    }

    if (!storedToken) {
      setApi2Error('ยังไม่มี token จาก API 1 กรุณาเรียก API 1 ก่อน')
      return
    }

    setApi2Loading(true)
    setApi2Error(null)
    setApi2Result(null)

    try {
      // เรียกผ่าน Edge Function เพื่อหลีกเลี่ยง CORS
      const { data, error } = await supabase.functions.invoke('hmpm-api-proxy', {
        body: {
          endpoint: 'member',
          token: storedToken,
          mem_id: memId,
          mem_pass: memPass,
        },
      })

      if (error) {
        setApi2Error(error.message || 'เกิดข้อผิดพลาดในการเรียก API 2')
        setApi2Result(null)
        return
      }

      const apiData = data as Api2Response

      if (apiData.STATUS === 'SUCCESS' && apiData.DATA) {
        setApi2Result(apiData)
        setApi2Error(null)
      } else {
        setApi2Error(apiData.MESSAGE || `Status: ${apiData.STATUS}, Code: ${apiData.STATUS_CODE}`)
        setApi2Result(apiData)
      }
    } catch (error: any) {
      setApi2Error(error.message || 'เกิดข้อผิดพลาดในการเรียก API 2')
      setApi2Result(null)
    } finally {
      setApi2Loading(false)
    }
  }

  // Clear all
  const handleClear = () => {
    setApi1Result(null)
    setApi1Error(null)
    setStoredToken(null)
    setApi2Result(null)
    setApi2Error(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 HMPM API Test Page
          </h1>
          <p className="text-gray-600">
            ทดสอบการเรียก API HMPM: API 1 (Get Token) → API 2 (Get Member Info)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API 1 - Get Token */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Key className="w-5 h-5 text-primary-600" />
                API 1: Get Access Token
              </h2>
              {storedToken && (
                <Badge variant="success" className="text-xs">
                  Token เก็บไว้แล้ว
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <Input
                label="auth_user"
                placeholder="HappyMPM2Acitve@OMC?USER"
                value={authUser}
                onChange={(e) => setAuthUser(e.target.value)}
              />

              <Input
                label="auth_pass"
                type="password"
                placeholder="HappyMPMAcitve@OMC?PASS"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
              />

              <Button
                onClick={handleCallApi1}
                loading={api1Loading}
                className="w-full"
                size="lg"
              >
                {api1Loading ? 'กำลังเรียก API 1...' : '🚀 เรียก API 1 (Get Token)'}
              </Button>

              {/* API 1 Result */}
              {api1Error && (
                <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-900 mb-1">Error</div>
                      <div className="text-sm text-red-700">{api1Error}</div>
                    </div>
                  </div>
                </div>
              )}

              {api1Result && api1Result.STATUS === 'SUCCESS' && (
                <div className="p-4 rounded-lg bg-green-50 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-900 mb-2">✅ สำเร็จ!</div>
                      {api1Result.DATA && (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Access Token:</span>
                            <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                              {api1Result.DATA.access_token}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Expire:</span>
                            <div className="text-gray-600">
                              {new Date(api1Result.DATA.expire * 1000).toLocaleString('th-TH')}
                            </div>
                          </div>
                        </div>
                      )}
                      {storedToken && (
                        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                          ✅ Token ถูกเก็บไว้แล้ว พร้อมใช้สำหรับ API 2
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {api1Result && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                    ดู Response ทั้งหมด (JSON)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(api1Result, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </Card>

          {/* API 2 - Get Member Info */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                API 2: Get Member Info
              </h2>
              {!storedToken && (
                <Badge variant="default" className="text-xs">
                  ต้องเรียก API 1 ก่อน
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <Input
                label="mem_id"
                placeholder="999999901"
                value={memId}
                onChange={(e) => setMemId(e.target.value)}
              />

              <Input
                label="mem_pass"
                type="password"
                placeholder="2025"
                value={memPass}
                onChange={(e) => setMemPass(e.target.value)}
              />

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-900">
                  <div className="font-medium mb-1">Token ที่จะใช้:</div>
                  {storedToken ? (
                    <div className="font-mono text-xs bg-blue-100 p-2 rounded break-all">
                      {storedToken.substring(0, 30)}...
                    </div>
                  ) : (
                    <div className="text-blue-700">ยังไม่มี token - กรุณาเรียก API 1 ก่อน</div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleCallApi2}
                loading={api2Loading}
                disabled={!storedToken}
                className="w-full"
                size="lg"
              >
                {api2Loading ? 'กำลังเรียก API 2...' : '🚀 เรียก API 2 (Get Member Info)'}
              </Button>

              {/* API 2 Result */}
              {api2Error && (
                <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-900 mb-1">Error</div>
                      <div className="text-sm text-red-700">{api2Error}</div>
                    </div>
                  </div>
                </div>
              )}

              {api2Result && api2Result.STATUS === 'SUCCESS' && api2Result.DATA && (
                <div className="p-4 rounded-lg bg-green-50 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-900 mb-3">✅ สำเร็จ!</div>
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-gray-600">รหัสสมาชิก</div>
                            <div className="font-medium">{api2Result.DATA.mcode}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">ชื่อ</div>
                            <div className="font-medium">{api2Result.DATA.name}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">สถานะ</div>
                            <Badge variant={api2Result.DATA.member_status === 1 ? 'success' : 'default'}>
                              {api2Result.DATA.member_status === 1 ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-gray-600">หมดอายุ</div>
                            <div className="font-medium">{api2Result.DATA.expire}</div>
                          </div>
                        </div>

                        {api2Result.DATA.member_group && api2Result.DATA.member_group.length > 0 && (
                          <div>
                            <div className="text-gray-600 mb-1">กลุ่มสมาชิก</div>
                            <div className="flex flex-wrap gap-2">
                              {api2Result.DATA.member_group.map((group, idx) => (
                                <Badge key={idx} variant="default">{group}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {api2Result.DATA.pos_cur && (
                          <div>
                            <div className="text-gray-600 mb-1">ตำแหน่งปัจจุบัน</div>
                            <div className="font-medium">
                              {api2Result.DATA.pos_cur.POS_NAME} ({api2Result.DATA.pos_cur.POS_SHORT})
                            </div>
                          </div>
                        )}

                        {api2Result.DATA.honor && (
                          <div>
                            <div className="text-gray-600 mb-1">ตำแหน่งเกียรติ</div>
                            <div className="font-medium">
                              {api2Result.DATA.honor.POS_NAME} ({api2Result.DATA.honor.POS_SHORT})
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {api2Result && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                    ดู Response ทั้งหมด (JSON)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(api2Result, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </Card>
        </div>

        {/* Clear Button */}
        {(api1Result || api2Result || storedToken) && (
          <div className="flex justify-center">
            <Button
              onClick={handleClear}
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              ล้างผลลัพธ์ทั้งหมด
            </Button>
          </div>
        )}

        {/* Instructions */}
        <Card variant="bordered" padding="md" className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <div className="font-medium mb-2">📝 วิธีใช้งาน:</div>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>กรอก <code className="bg-blue-100 px-1 rounded">auth_user</code> และ <code className="bg-blue-100 px-1 rounded">auth_pass</code> (ค่าเริ่มต้นถูกตั้งไว้แล้ว)</li>
                <li>กด "เรียก API 1" เพื่อขอ access token</li>
                <li>Token จะถูกเก็บไว้อัตโนมัติ</li>
                <li>กรอก <code className="bg-blue-100 px-1 rounded">mem_id</code> และ <code className="bg-blue-100 px-1 rounded">mem_pass</code> (ค่าเริ่มต้นถูกตั้งไว้แล้ว)</li>
                <li>กด "เรียก API 2" เพื่อดึงข้อมูลสมาชิก (จะใช้ token จาก API 1 อัตโนมัติ)</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
