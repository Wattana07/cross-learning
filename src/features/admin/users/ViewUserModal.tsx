import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Modal, ModalFooter, Spinner, Badge } from '@/components/ui'
import { Avatar } from '@/components/ui'
import type { Profile } from '@/lib/database.types'
import { formatDate } from '@/lib/utils'
import {
  User,
  Mail,
  Building,
  Calendar,
  Trophy,
  Flame,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react'

interface ViewUserModalProps {
  user: Profile | null
  isOpen: boolean
  onClose: () => void
}

interface UserStats {
  wallet: {
    total_points: number
    level: number
  } | null
  streak: {
    current_streak: number
    max_streak: number
  } | null
  learning: {
    total_episodes: number
    completed_episodes: number
    in_progress_episodes: number
    progress_percent: number
  } | null
  bookings: {
    total: number
    approved: number
    pending: number
  } | null
}

export function ViewUserModal({ user, isOpen, onClose }: ViewUserModalProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({
    wallet: null,
    streak: null,
    learning: null,
    bookings: null,
  })

  useEffect(() => {
    if (isOpen && user) {
      fetchUserStats()
    } else {
      setStats({
        wallet: null,
        streak: null,
        learning: null,
        bookings: null,
      })
    }
  }, [isOpen, user])

  const fetchUserStats = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Fetch all data in parallel
      const [
        walletResult,
        streakResult,
        episodesResult,
        bookingsResult,
      ] = await Promise.all([
        // Fetch wallet (use maybeSingle to handle null)
        supabase
          .from('user_wallet')
          .select('total_points, level')
          .eq('user_id', user.id)
          .maybeSingle(),

        // Fetch streak (use maybeSingle to handle null)
        supabase
          .from('user_streaks')
          .select('current_streak, max_streak')
          .eq('user_id', user.id)
          .maybeSingle(),

        // Get all published episodes first
        supabase
          .from('episodes')
          .select('id')
          .eq('status', 'published'),

        // Fetch bookings
        supabase
          .from('room_bookings')
          .select('status')
          .eq('booked_by_user_id', user.id),
      ])

      // Get episode IDs
      const episodesList = episodesResult.data || []
      const episodeIds = episodesList.map((e) => e.id)
      const totalPublishedEpisodes = episodesList.length

      // Fetch learning progress for all published episodes
      let progressData: any[] = []
      if (episodeIds.length > 0) {
        const progressResult = await supabase
          .from('user_episode_progress')
          .select('episode_id, watched_percent, completed_at')
          .eq('user_id', user.id)
          .in('episode_id', episodeIds)
        
        if (progressResult.error) {
          console.error('❌ Error fetching user progress:', progressResult.error)
        }
        
        progressData = progressResult.data || []
        
        // Debug logging
        console.log('🔍 ViewUserModal Debug:', {
          userId: user.id,
          userEmail: user.email,
          totalPublishedEpisodes,
          episodeIds: episodeIds.length,
          episodeIdsSample: episodeIds.slice(0, 3),
          progressDataCount: progressData.length,
          progressData: progressData,
          progressError: progressResult.error,
        })
      } else {
        console.log('⚠️ No published episodes found')
      }

      // Handle wallet
      const wallet = walletResult.data || null
      const walletError = walletResult.error
      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError)
      }

      // Handle streak
      const streak = streakResult.data || null
      const streakError = streakResult.error
      if (streakError && streakError.code !== 'PGRST116') {
        console.error('Error fetching streak:', streakError)
      }

      // Calculate learning progress
      const completedEpisodes = progressData.filter(
        (p) => p.completed_at !== null || (p.watched_percent ?? 0) >= 90
      ).length
      const inProgressEpisodes = progressData.filter(
        (p) => p.completed_at === null && (p.watched_percent ?? 0) > 0 && (p.watched_percent ?? 0) < 90
      ).length
      const progressPercent = totalPublishedEpisodes > 0
        ? Math.round((completedEpisodes / totalPublishedEpisodes) * 100)
        : 0
      
      console.log('📊 Calculated Stats:', {
        completedEpisodes,
        inProgressEpisodes,
        totalPublishedEpisodes,
        progressPercent,
        progressDataDetails: progressData.map(p => ({
          episode_id: p.episode_id,
          watched_percent: p.watched_percent,
          completed_at: p.completed_at,
          isCompleted: p.completed_at !== null || (p.watched_percent ?? 0) >= 90,
        })),
      })

      // Calculate bookings
      const bookings = bookingsResult.data || []
      const totalBookings = bookings.length
      const approvedBookings = bookings.filter((b) => b.status === 'approved').length
      const pendingBookings = bookings.filter((b) => b.status === 'pending').length

      setStats({
        wallet: wallet ? {
          total_points: wallet.total_points || 0,
          level: wallet.level || 1,
        } : null,
        streak: streak ? {
          current_streak: streak.current_streak || 0,
          max_streak: streak.max_streak || 0,
        } : null,
        learning: {
          total_episodes: totalPublishedEpisodes,
          completed_episodes,
          in_progress_episodes,
          progress_percent,
        },
        bookings: {
          total: totalBookings,
          approved: approvedBookings,
          pending: pendingBookings,
        },
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
      // Set default values on error
      setStats({
        wallet: null,
        streak: null,
        learning: {
          total_episodes: 0,
          completed_episodes: 0,
          in_progress_episodes: 0,
          progress_percent: 0,
        },
        bookings: {
          total: 0,
          approved: 0,
          pending: 0,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="รายละเอียดผู้ใช้"
      size="lg"
    >
      <div className="space-y-6">
        {/* User Info */}
        <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
          <Avatar
            src={user.avatar_path}
            name={user.full_name}
            size="xl"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {user.full_name || 'ไม่ระบุชื่อ'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant={user.role === 'admin' ? 'primary' : 'default'}
                size="sm"
              >
                {user.role === 'admin' ? 'Admin' : 'Learner'}
              </Badge>
              <Badge
                variant={user.is_active ? 'success' : 'danger'}
                size="sm"
              >
                {user.is_active ? 'ใช้งาน' : 'ระงับ'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Building className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">แผนก</p>
              <p className="text-sm font-medium text-gray-900">
                {user.department || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">สร้างเมื่อ</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(user.created_at)}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Wallet & Streak */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900">คะแนน</p>
                </div>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.wallet?.total_points?.toLocaleString('th-TH') || 0}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  ระดับ {stats.wallet?.level || 1}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <Flame className="w-5 h-5 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Streak</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.streak?.current_streak || 0} วัน
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  สูงสุด {stats.streak?.max_streak || 0} วัน
                </p>
              </div>
            </div>

            {/* Learning Progress */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900">ความคืบหน้าการเรียน</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">ความคืบหน้า</span>
                  <span className="text-sm font-bold text-blue-900">
                    {stats.learning?.progress_percent ?? 0}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${stats.learning?.progress_percent ?? 0}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.learning?.completed_episodes ?? 0}
                    </p>
                    <p className="text-xs text-blue-700">เรียนจบ</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.learning?.in_progress_episodes ?? 0}
                    </p>
                    <p className="text-xs text-blue-700">กำลังเรียน</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.learning?.total_episodes ?? 0}
                    </p>
                    <p className="text-xs text-blue-700">ทั้งหมด</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-900">การจองห้องประชุม</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900">
                    {stats.bookings?.total ?? 0}
                  </p>
                  <p className="text-xs text-green-700">ทั้งหมด</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {stats.bookings?.approved ?? 0}
                  </p>
                  <p className="text-xs text-green-700">อนุมัติแล้ว</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.bookings?.pending ?? 0}
                  </p>
                  <p className="text-xs text-green-700">รออนุมัติ</p>
                </div>
              </div>
            </div>
          </>
        )}

        <ModalFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ปิด
          </button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

