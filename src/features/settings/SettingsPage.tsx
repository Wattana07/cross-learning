import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { Card, Button, Input, Avatar, Badge } from '@/components/ui'
import { Settings, User, Bell, Palette, Globe, Shield, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm'

type TabType = 'profile' | 'notifications' | 'preferences' | 'security'

export function SettingsPage() {
  const { profile } = useAuthContext()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [loading, setLoading] = useState(false)

  const tabs = [
    { id: 'profile' as TabType, name: 'โปรไฟล์', icon: User },
    { id: 'notifications' as TabType, name: 'การแจ้งเตือน', icon: Bell },
    { id: 'preferences' as TabType, name: 'การตั้งค่า', icon: Palette },
    { id: 'security' as TabType, name: 'ความปลอดภัย', icon: Shield },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>
        <p className="text-gray-500 mt-1">จัดการการตั้งค่าบัญชีและความปลอดภัย</p>
      </div>

      {/* Tabs */}
      <Card variant="bordered" className="p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && <ProfileSettingsTab />}
        {activeTab === 'notifications' && <NotificationsSettingsTab />}
        {activeTab === 'preferences' && <PreferencesSettingsTab />}
        {activeTab === 'security' && <SecuritySettingsTab />}
      </div>
    </div>
  )
}

// Profile Settings Tab
function ProfileSettingsTab() {
  const { profile, refreshProfile } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [department, setDepartment] = useState(profile?.department || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabaseClient')
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          department: department || null,
        })
        .eq('id', profile?.id)

      if (error) throw error
      await refreshProfile()
      alert('บันทึกข้อมูลสำเร็จ')
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="bordered" padding="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลโปรไฟล์</h2>
          <div className="flex items-center gap-4 mb-6">
            <Avatar
              src={profile?.avatar_path}
              name={profile?.full_name}
              size="lg"
              className="w-20 h-20"
            />
            <div>
              <p className="font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              <Link
                to="/profile"
                className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
              >
                จัดการรูปโปรไฟล์ →
              </Link>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อ-นามสกุล"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-5 h-5" />}
            required
          />

          <Input
            label="แผนก/หน่วยงาน"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            leftIcon={<User className="w-5 h-5" />}
          />

          <Button type="submit" loading={loading} leftIcon={<Save className="w-4 h-4" />}>
            บันทึกการเปลี่ยนแปลง
          </Button>
        </form>
      </div>
    </Card>
  )
}

// Notifications Settings Tab
function NotificationsSettingsTab() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [bookingNotifications, setBookingNotifications] = useState(true)
  const [learningNotifications, setLearningNotifications] = useState(true)
  const [pointsNotifications, setPointsNotifications] = useState(true)
  const [loading, setLoading] = useState(false)

  // TODO: Load from database when notification preferences table is created
  // TODO: Save to database

  const handleSave = async () => {
    setLoading(true)
    try {
      // TODO: Save notification preferences to database
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
      alert('บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ')
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="bordered" padding="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">การแจ้งเตือน</h2>
          <p className="text-sm text-gray-500">เลือกประเภทการแจ้งเตือนที่คุณต้องการรับ</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">การแจ้งเตือนทางอีเมล</p>
              <p className="text-sm text-gray-500">รับการแจ้งเตือนทางอีเมล</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">การแจ้งเตือนการจองห้อง</p>
              <p className="text-sm text-gray-500">แจ้งเตือนเมื่อมีการจองห้องหรือสถานะเปลี่ยน</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bookingNotifications}
                onChange={(e) => setBookingNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">การแจ้งเตือนการเรียน</p>
              <p className="text-sm text-gray-500">แจ้งเตือนเมื่อมีบทเรียนใหม่หรือความคืบหน้า</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={learningNotifications}
                onChange={(e) => setLearningNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">การแจ้งเตือนแต้มและรางวัล</p>
              <p className="text-sm text-gray-500">แจ้งเตือนเมื่อได้รับแต้มหรือรางวัลใหม่</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pointsNotifications}
                onChange={(e) => setPointsNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} loading={loading} leftIcon={<Save className="w-4 h-4" />}>
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Preferences Settings Tab
function PreferencesSettingsTab() {
  const [language, setLanguage] = useState('th')
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light')
  const [timezone, setTimezone] = useState('Asia/Bangkok')
  const [loading, setLoading] = useState(false)

  // TODO: Load from database when user preferences table is created
  // TODO: Save to database
  // TODO: Apply theme changes immediately

  const handleSave = async () => {
    setLoading(true)
    try {
      // TODO: Save preferences to database
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
      alert('บันทึกการตั้งค่าสำเร็จ')
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="bordered" padding="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">การตั้งค่า</h2>
          <p className="text-sm text-gray-500">ปรับแต่งประสบการณ์การใช้งาน</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ภาษา</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ธีม</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="light">สว่าง</option>
              <option value="dark">มืด</option>
              <option value="auto">อัตโนมัติ (ตามระบบ)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Dark Mode กำลังพัฒนา</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">เขตเวลา</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
              <option value="UTC">UTC (GMT+0)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} loading={loading} leftIcon={<Save className="w-4 h-4" />}>
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Security Settings Tab
function SecuritySettingsTab() {
  const { profile } = useAuthContext()

  return (
    <Card variant="bordered" padding="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">ความปลอดภัย</h2>
          <p className="text-sm text-gray-500">จัดการรหัสผ่านและความปลอดภัยบัญชี</p>
        </div>

        <div className="space-y-6">
          {/* Change Password */}
          <div className="border-b pb-6">
            <h3 className="font-medium text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h3>
            <ChangePasswordForm />
          </div>

          {/* Account Info */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">ข้อมูลบัญชี</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">สถานะบัญชี</span>
                <Badge variant={profile?.is_active ? 'success' : 'danger'}>
                  {profile?.is_active ? 'ใช้งานได้' : 'ถูกระงับ'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">อีเมล</span>
                <span className="text-gray-900">{profile?.email}</span>
              </div>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">ลืมรหัสผ่าน?</p>
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              ตั้งค่ารหัสผ่านใหม่ →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

