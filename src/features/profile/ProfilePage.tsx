import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { Card, Button, Input, Avatar, Badge, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { updateMyProfile, getMyWallet } from '@/lib/auth'
import { uploadAvatar } from '@/lib/storage'
import { User, Mail, Building, Save, Camera, X, Trophy, BookOpen, Award, Users, Shield, Calendar, ExternalLink } from 'lucide-react'
import { cn, formatPoints } from '@/lib/utils'
import { ChangePasswordForm } from './ChangePasswordForm'

// Calculate overall learning progress
async function getOverallProgress(userId: string): Promise<{ progressPercent: number; completedEpisodes: number; totalEpisodes: number }> {
  try {
    console.log('getOverallProgress - Starting for userId:', userId)
    
    // Get all published episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('status', 'published')

    if (episodesError) {
      console.error('getOverallProgress - Error fetching episodes:', episodesError)
      throw episodesError
    }

    const episodesList = episodes || []
    console.log('getOverallProgress - Found episodes:', episodesList.length)

    if (episodesList.length === 0) {
      return { progressPercent: 0, completedEpisodes: 0, totalEpisodes: 0 }
    }

    const episodeIds = episodesList.map((e) => e.id)

    // Get user progress
    const { data: progressData, error: progressError } = await supabase
      .from('user_episode_progress')
      .select('episode_id, completed_at, watched_percent')
      .eq('user_id', userId)
      .in('episode_id', episodeIds)

    if (progressError) {
      console.error('getOverallProgress - Error fetching progress:', progressError)
      throw progressError
    }

    const progressList = progressData || []
    const completedCount = progressList.filter(
      (p) => p.completed_at !== null || (p.watched_percent ?? 0) >= 90
    ).length

    const progressPercent = episodesList.length > 0 ? Math.round((completedCount / episodesList.length) * 100) : 0

    console.log('getOverallProgress - Result:', { progressPercent, completedEpisodes: completedCount, totalEpisodes: episodesList.length })

    return {
      progressPercent,
      completedEpisodes: completedCount,
      totalEpisodes: episodesList.length,
    }
  } catch (error) {
    console.error('getOverallProgress - Error:', error)
    // Return default values on error
    return { progressPercent: 0, completedEpisodes: 0, totalEpisodes: 0 }
  }
}

export function ProfilePage() {
  // This log should ALWAYS appear when component loads
  console.log('=== ProfilePage START - Component rendering ===')
  
  const { profile, refreshProfile, user } = useAuthContext()
  console.log('ProfilePage - Auth context:', { user: user?.id, profile: profile?.id })
  
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [department, setDepartment] = useState(profile?.department || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch wallet and overall progress
  const { data: wallet, isLoading: walletLoading, error: walletError } = useQuery({
    queryKey: ['profile', 'wallet', user?.id],
    queryFn: async () => {
      console.log('ProfilePage - Fetching wallet for user:', user?.id)
      try {
        const result = await getMyWallet()
        console.log('ProfilePage - Wallet result:', result)
        // If no wallet exists, return null (we handle null in render)
        return result
      } catch (error) {
        console.error('ProfilePage - Wallet error:', error)
        // Return null on error, we'll handle it in render
        return null
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })

  const { data: overallProgress, isLoading: progressLoading, error: progressError } = useQuery({
    queryKey: ['profile', 'overall-progress', user?.id],
    queryFn: () => {
      console.log('ProfilePage - Fetching overall progress for user:', user?.id)
      return getOverallProgress(user!.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  })

  // Debug
  useEffect(() => {
    console.log('ProfilePage - User:', user?.id)
    console.log('ProfilePage - Wallet:', { wallet, walletLoading, walletError })
    console.log('ProfilePage - Progress:', { overallProgress, progressLoading, progressError })
  }, [user, wallet, walletLoading, walletError, overallProgress, progressLoading, progressError])

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setDepartment(profile.department || '')
    }
  }, [profile])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload immediately
    if (profile?.id) {
      setUploadingAvatar(true)
      try {
        const avatarPath = await uploadAvatar(file, profile.id)
        
        // Update profile
        await supabase
          .from('profiles')
          .update({ avatar_path: avatarPath })
          .eq('id', profile.id)

        await refreshProfile()
        setAvatarPreview(null)
      } catch (error: any) {
        alert(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูป')
        setAvatarPreview(null)
      } finally {
        setUploadingAvatar(false)
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!profile?.id) return

    if (!confirm('ต้องการลบรูปโปรไฟล์หรือไม่?')) return

    try {
      await supabase
        .from('profiles')
        .update({ avatar_path: null })
        .eq('id', profile.id)

      await refreshProfile()
      setAvatarPreview(null)
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบรูป')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateMyProfile({
        full_name: fullName,
        department: department || null,
      })
      await refreshProfile()
      alert('บันทึกข้อมูลสำเร็จ')
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  console.log('ProfilePage - About to render JSX', { user: user?.id, profile: profile?.id, wallet, overallProgress })
  console.log('ProfilePage - Wallet data:', wallet)
  console.log('ProfilePage - Overall progress data:', overallProgress)
  
  // Force render even if data is not loaded
  const displayProgress = overallProgress || { progressPercent: 0, completedEpisodes: 0, totalEpisodes: 0 }
  const displayWallet = wallet || { total_points: 0, level: 1 }
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์</h1>
        <p className="text-gray-500 mt-1">จัดการข้อมูลส่วนตัวของคุณ</p>
      </div>

      {/* Profile Card */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative group">
            <Avatar
              src={avatarPreview || profile?.avatar_path}
              name={profile?.full_name}
              size="xl"
              className="w-24 h-24"
            />
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className={cn(
                'absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors',
                uploadingAvatar && 'opacity-50 cursor-not-allowed'
              )}
              title="เปลี่ยนรูปโปรไฟล์"
            >
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            {profile?.avatar_path && !avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-danger-600 transition-colors opacity-0 group-hover:opacity-100"
                title="ลบรูปโปรไฟล์"
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
            <h2 className="text-xl font-semibold text-gray-900">
              {profile?.full_name || 'ผู้ใช้'}
            </h2>
            <p className="text-gray-500">{profile?.email}</p>
            <Badge variant={profile?.role === 'admin' ? 'primary' : 'default'} className="mt-2">
              {profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้เรียน'}
            </Badge>

            {/* Progress and Points Stats */}
            <div className="mt-4 space-y-3">
              {/* Overall Progress - Always show */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200" style={{ minHeight: '80px' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">ความคืบหน้ารวม</span>
                  </div>
                  {progressLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="text-sm font-bold text-primary-600">
                      {displayProgress.progressPercent}%
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(displayProgress.progressPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {displayProgress.completedEpisodes} / {displayProgress.totalEpisodes} บทเรียน
                </p>
                {progressError && (
                  <p className="text-xs text-red-500 mt-1">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                )}
              </div>

              {/* Total Points - Always show */}
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200" style={{ minHeight: '60px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">แต้มสะสมทั้งหมด</span>
                  </div>
                  {walletLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="text-sm font-bold text-yellow-600">
                      {formatPoints(displayWallet.total_points)} แต้ม
                    </span>
                  )}
                  {!walletLoading && !wallet && (
                    <p className="text-xs text-gray-400 mt-1">ยังไม่มีข้อมูล wallet (แสดงค่าเริ่มต้น: 0 แต้ม)</p>
                  )}
                </div>
                {walletError && (
                  <p className="text-xs text-red-500 mt-1">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="ชื่อ-นามสกุล"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-5 h-5" />}
            placeholder="กรอกชื่อ-นามสกุล"
            required
          />

          <Input
            label="อีเมล"
            value={profile?.email || ''}
            disabled
            leftIcon={<Mail className="w-5 h-5" />}
            hint="ไม่สามารถเปลี่ยนอีเมลได้"
          />

          <Input
            label="แผนก/หน่วยงาน"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            leftIcon={<Building className="w-5 h-5" />}
            placeholder="กรอกแผนกหรือหน่วยงาน"
          />

          <div className="pt-4">
            <Button type="submit" loading={loading} leftIcon={<Save className="w-4 h-4" />}>
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card variant="bordered" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h2>
        <ChangePasswordForm />
      </Card>

      {/* Account Info */}
      <Card variant="bordered" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลบัญชี</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">สถานะบัญชี</span>
            <Badge variant={profile?.is_active ? 'success' : 'danger'}>
              {profile?.is_active ? 'ใช้งานได้' : 'ถูกระงับ'}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">ประเภท</span>
            <span className="text-gray-900">{profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้เรียน'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">สร้างเมื่อ</span>
            <span className="text-gray-900">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </span>
          </div>
        </div>
      </Card>

      {/* HMPM Information */}
      {profile?.hmpm_mcode && (
        <Card variant="bordered" padding="lg" className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">ข้อมูลสมาชิก HMPM</h3>
          </div>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">รหัสสมาชิก</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{profile.hmpm_mcode}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">สถานะสมาชิก</span>
                </div>
                <Badge variant={profile.hmpm_member_status === 1 ? 'success' : 'default'} className="text-sm">
                  {profile.hmpm_member_status === 1 ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {profile.hmpm_expire && (
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">วันหมดอายุ</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(profile.hmpm_expire).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Position Current */}
            {profile.hmpm_pos_cur && typeof profile.hmpm_pos_cur === 'object' && (
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">ตำแหน่งปัจจุบัน</span>
                </div>
                <div className="space-y-2">
                  {profile.hmpm_pos_cur.POS_NAME && (
                    <p className="text-lg font-semibold text-gray-900">{profile.hmpm_pos_cur.POS_NAME}</p>
                  )}
                  {profile.hmpm_pos_cur.POS_SHORT && (
                    <Badge variant="default" className="text-xs">
                      {profile.hmpm_pos_cur.POS_SHORT}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Honor Position */}
            {profile.hmpm_honor && typeof profile.hmpm_honor === 'object' && (
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-gray-900">ตำแหน่งเกียรติ</span>
                </div>
                <div className="space-y-2">
                  {profile.hmpm_honor.POS_NAME && (
                    <p className="text-lg font-semibold text-gray-900">{profile.hmpm_honor.POS_NAME}</p>
                  )}
                  {profile.hmpm_honor.POS_SHORT && (
                    <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">
                      {profile.hmpm_honor.POS_SHORT}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Member Groups */}
            {profile.hmpm_member_group && profile.hmpm_member_group.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">กลุ่มสมาชิก</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.hmpm_member_group.map((group, idx) => (
                    <Badge key={idx} variant="default" className="text-sm">
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data (Collapsible) */}
            {profile.hmpm_raw && (
              <details className="bg-white rounded-lg p-4 border border-blue-100">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  ดูข้อมูลทั้งหมด (JSON)
                </summary>
                <pre className="mt-3 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-60 border border-gray-200">
                  {JSON.stringify(profile.hmpm_raw, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
