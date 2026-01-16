import { useState, useEffect } from 'react'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { Code2, Play, Copy, Check, ExternalLink } from 'lucide-react'

const DEFAULT_SUPABASE_URL = 'https://efysmnckgicgojgskzoj.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable__oSW-E864aWhf63JKWZIHA_VkvKFpta'

interface ApiResponse {
  data: any
  error: string | null
  status: number | null
}

export function ApiTestPage() {
  // ใช้ค่า Happy MPM Supabase เป็นค่าเริ่มต้น (ไม่ใช้ค่าจาก environment ของคอร์สเรียน)
  const [supabaseUrl, setSupabaseUrl] = useState(DEFAULT_SUPABASE_URL)
  const [supabaseKey, setSupabaseKey] = useState(DEFAULT_SUPABASE_KEY)
  const [category, setCategory] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [specificDate, setSpecificDate] = useState('')
  const [response, setResponse] = useState<ApiResponse>({ data: null, error: null, status: null })
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const buildQueryParams = () => {
    const params: string[] = ['select=*', 'is_active=eq.true']
    
    if (category) {
      params.push(`category=eq.${encodeURIComponent(category)}`)
    }
    
    if (specificDate) {
      params.push(`date=eq.${specificDate}`)
    } else {
      if (dateStart) {
        params.push(`date=gte.${dateStart}`)
      }
      if (dateEnd) {
        params.push(`date=lte.${dateEnd}`)
      }
    }
    
    params.push('order=date.asc,time.asc')
    
    return params.join('&')
  }

  const testApi = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setResponse({
        data: null,
        error: 'กรุณากรอก Supabase URL และ Anon Key',
        status: null
      })
      return
    }

    setLoading(true)
    setResponse({ data: null, error: null, status: null })

    try {
      const queryParams = buildQueryParams()
      const url = `${supabaseUrl}/rest/v1/calendar_events?${queryParams}`
      
      const res = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      })

      const data = await res.json()
      
      if (!res.ok) {
        setResponse({
          data: null,
          error: data.message || `HTTP ${res.status}: ${res.statusText}`,
          status: res.status
        })
      } else {
        setResponse({
          data,
          error: null,
          status: res.status
        })
      }
    } catch (error: any) {
      setResponse({
        data: null,
        error: error.message || 'เกิดข้อผิดพลาดในการเรียก API',
        status: null
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, codeType: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(codeType)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const generateCodeSnippets = () => {
    const queryParams = buildQueryParams()
    const url = `${supabaseUrl}/rest/v1/calendar_events?${queryParams}`
    
    const jsCode = `const SUPABASE_URL = '${supabaseUrl}';
const SUPABASE_KEY = '${supabaseKey}';

const response = await fetch(
  \`\${SUPABASE_URL}/rest/v1/calendar_events?${queryParams}\`,
  {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': \`Bearer \${SUPABASE_KEY}\`
    }
  }
);

const events = await response.json();`

    const curlCode = `curl -X GET \\
  '${url}' \\
  -H 'apikey: ${supabaseKey}' \\
  -H 'Authorization: Bearer ${supabaseKey}'`

    const pythonCode = `import requests

url = '${supabaseUrl}/rest/v1/calendar_events'
headers = {
    'apikey': '${supabaseKey}',
    'Authorization': 'Bearer ${supabaseKey}'
}
params = {
    'select': '*',
    'is_active': 'eq.true',${category ? `\n    'category': 'eq.${category}',` : ''}${specificDate ? `\n    'date': 'eq.${specificDate}',` : ''}${dateStart ? `\n    'date': 'gte.${dateStart}',` : ''}${dateEnd ? `\n    'date': 'lte.${dateEnd}',` : ''}
    'order': 'date.asc,time.asc'
}

response = requests.get(url, headers=headers, params=params)
events = response.json()`

    return { jsCode, curlCode, pythonCode, url }
  }

  const { jsCode, curlCode, pythonCode, url } = generateCodeSnippets()

  // Auto-fetch เมื่อ component mount และมี URL + Key
  useEffect(() => {
    const autoFetch = async () => {
      // ใช้ค่า Happy MPM Supabase
      const url = DEFAULT_SUPABASE_URL
      const key = DEFAULT_SUPABASE_KEY
      
      if (!url || !key) return

      setLoading(true)
      setResponse({ data: null, error: null, status: null })

      try {
        const queryParams = 'select=*&is_active=eq.true&order=date.asc,time.asc'
        const apiUrl = `${url}/rest/v1/calendar_events?${queryParams}`
        
        const res = await fetch(apiUrl, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        })

        const data = await res.json()
        
        if (!res.ok) {
          setResponse({
            data: null,
            error: data.message || `HTTP ${res.status}: ${res.statusText}`,
            status: res.status
          })
        } else {
          setResponse({
            data,
            error: null,
            status: res.status
          })
        }
      } catch (error: any) {
        setResponse({
          data: null,
          error: error.message || 'เกิดข้อผิดพลาดในการเรียก API',
          status: null
        })
      } finally {
        setLoading(false)
      }
    }

    autoFetch()
  }, []) // เรียกครั้งเดียวเมื่อ component mount

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ทดสอบ Calendar Events API</h1>
        <p className="mt-1 text-sm text-gray-600">
          ทดสอบ Supabase REST API สำหรับดึงข้อมูล calendar_events สำหรับ External Sites / Mobile Apps
        </p>
      </div>

      {/* Configuration */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">การตั้งค่า</h2>
        <div className="space-y-4">
          <Input
            label="Supabase URL"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://xxx.supabase.co"
          />
          
          <Input
            label="Supabase Anon Key"
            type="password"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            placeholder="sb_publishable_xxx..."
            hint="หาได้จาก Supabase Dashboard > Settings > API"
          />
        </div>
      </Card>

      {/* Filter Options */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ตัวกรองข้อมูล (Filter Options)</h2>
        <div className="space-y-4">
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="เช่น MEET CEO"
            hint="กรอกเฉพาะ category ที่ต้องการ หรือเว้นว่างเพื่อดึงทั้งหมด"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="วันที่เริ่มต้น (Date Start)"
              type="date"
              value={dateStart}
              onChange={(e) => {
                setDateStart(e.target.value)
                if (e.target.value) setSpecificDate('')
              }}
            />
            
            <Input
              label="วันที่สิ้นสุด (Date End)"
              type="date"
              value={dateEnd}
              onChange={(e) => {
                setDateEnd(e.target.value)
                if (e.target.value) setSpecificDate('')
              }}
            />
          </div>

          <Input
            label="วันที่เฉพาะเจาะจง (Specific Date)"
            type="date"
            value={specificDate}
            onChange={(e) => {
              setSpecificDate(e.target.value)
              if (e.target.value) {
                setDateStart('')
                setDateEnd('')
              }
            }}
            hint="ถ้ากรอกฟิลด์นี้ ระบบจะใช้แทน Date Start/End"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={testApi}
            loading={loading}
            leftIcon={<Play className="w-4 h-4" />}
          >
            ทดสอบ API
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setCategory('')
              setDateStart('')
              setDateEnd('')
              setSpecificDate('')
              setResponse({ data: null, error: null, status: null })
            }}
          >
            ล้างตัวกรอง
          </Button>
        </div>
      </Card>

      {/* API Response */}
      {loading && (
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-600">กำลังดึงข้อมูล...</span>
          </div>
        </Card>
      )}

      {(response.data || response.error) && !loading && (
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ผลลัพธ์</h2>
            {response.status && (
              <Badge variant={response.error ? 'danger' : 'success'}>
                {response.status} {response.status === 200 ? 'OK' : 'Error'}
              </Badge>
            )}
          </div>

          {response.error ? (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-danger-700 font-medium">เกิดข้อผิดพลาด</p>
              <p className="text-danger-600 text-sm mt-1">{response.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  พบข้อมูล: {Array.isArray(response.data) ? response.data.length : 1} รายการ
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2), 'response')}
                  leftIcon={copiedCode === 'response' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedCode === 'response' ? 'คัดลอกแล้ว' : 'คัดลอก JSON'}
                </Button>
              </div>

              {/* แสดงข้อมูลในรูปแบบตาราง */}
              {Array.isArray(response.data) && response.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Active
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {response.data.map((event: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {event.date || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {event.time || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {event.category || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {event.title || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {event.description || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={event.is_active ? 'success' : 'warning'}>
                              {event.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* แสดง JSON สำหรับข้อมูลอื่นๆ หรือเมื่อไม่มีข้อมูลในรูปแบบตาราง */}
              {(!Array.isArray(response.data) || response.data.length === 0) && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  {Array.isArray(response.data) && response.data.length === 0 ? (
                    <p className="text-gray-600 text-sm">ไม่พบข้อมูล</p>
                  ) : (
                    <pre className="overflow-auto text-xs">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* แสดง JSON แบบเต็ม (collapsible) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  ดู JSON แบบเต็ม
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </Card>
      )}

      {/* Code Snippets */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">ตัวอย่างโค้ด</h2>
        </div>

        <div className="space-y-6">
          {/* JavaScript */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">JavaScript</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(jsCode, 'js')}
                leftIcon={copiedCode === 'js' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copiedCode === 'js' ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </Button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-xs font-mono">
              {jsCode}
            </pre>
          </div>

          {/* cURL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">cURL</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(curlCode, 'curl')}
                leftIcon={copiedCode === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copiedCode === 'curl' ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </Button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-xs font-mono">
              {curlCode}
            </pre>
          </div>

          {/* Python */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Python</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(pythonCode, 'python')}
                leftIcon={copiedCode === 'python' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copiedCode === 'python' ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </Button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-xs font-mono">
              {pythonCode}
            </pre>
          </div>

          {/* Direct URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Direct URL</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(url, 'url')}
                  leftIcon={copiedCode === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedCode === 'url' ? 'คัดลอกแล้ว' : 'คัดลอก URL'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(url, '_blank')}
                  leftIcon={<ExternalLink className="w-4 h-4" />}
                >
                  เปิดในแท็บใหม่
                </Button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 break-all">{url}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Instructions */}
      <Card variant="bordered" className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">วิธีใช้งาน</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>กรอก Supabase URL และ Anon Key (หาได้จาก Supabase Dashboard)</li>
          <li>ตั้งค่าตัวกรองข้อมูลตามต้องการ (Category, Date Range, หรือ Specific Date)</li>
          <li>คลิกปุ่ม "ทดสอบ API" เพื่อทดสอบ</li>
          <li>ดูผลลัพธ์และคัดลอกโค้ดตัวอย่างไปใช้งาน</li>
        </ol>
      </Card>
    </div>
  )
}

