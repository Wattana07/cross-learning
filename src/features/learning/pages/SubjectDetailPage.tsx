import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, Badge, Spinner } from '@/components/ui'
import {
  BookMarked,
  ArrowLeft,
  Lock,
  PlayCircle,
  CheckCircle2,
  Clock,
  Trophy,
} from 'lucide-react'
import { useSubject, useEpisodesInSubject, useUserProgress } from '@/hooks/useLearning'
import { getSubjectProgress } from '../api'
import type { UserProgress, Episode } from '@/lib/database.types'
import { formatDuration } from '@/lib/utils'
import { useAuthContext } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const { data: subjectData, isLoading: subjectLoading, error: subjectError } = useSubject(subjectId)
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodesInSubject(subjectId)
  
  const episodeIds = useMemo(() => episodes.map(e => e.id), [episodes])
  const { data: progressData = [] } = useUserProgress(episodeIds)

  // Load subject progress using React Query for caching
  const { data: subjectProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['subject-progress', user?.id, subjectId, episodeIds.sort().join(',')],
    queryFn: () => getSubjectProgress(subjectId!),
    enabled: !!subjectId && !!user && episodeIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  const loading = subjectLoading || episodesLoading || progressLoading
  const error = subjectError

  const subject = subjectData?.subject
  const coverUrl = subjectData?.coverUrl || null

  // Create progress map
  const progress = useMemo(() => {
    const map: Record<string, UserProgress> = {}
    progressData.forEach((p) => {
      map[p.episode_id] = p
    })
    return map
  }, [progressData])

  // Redirect if no subjectId
  if (!subjectId) {
    navigate('/categories')
    return null
  }

  // Check if episode is locked (for sequential mode)
  const isEpisodeLocked = (episode: Episode, index: number): boolean => {
    if (subject?.unlock_mode === 'open') return false
    if (index === 0) return false // First episode is always unlocked

    const previousEpisode = episodes[index - 1]
    const prevProgress = progress[previousEpisode.id]
    return !prevProgress || !prevProgress.completed_at
  }

  // Get episode status
  const getEpisodeStatus = (episode: Episode, index: number) => {
    const locked = isEpisodeLocked(episode, index)
    const epProgress = progress[episode.id]

    if (locked) return 'locked'
    if (epProgress?.completed_at) return 'completed'
    if (epProgress && epProgress.watched_percent > 0) return 'in_progress'
    return 'not_started'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="text-center py-20">
        <p className="text-danger-500 mb-4">{error || 'ไม่พบวิชานี้'}</p>
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าหมวดหมู่
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={subject.category_id ? `/categories/${subject.category_id}` : '/categories'}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          {subject.category_name && (
            <p className="text-sm text-gray-500 mb-1">{subject.category_name}</p>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{subject.title}</h1>
          {subject.description && (
            <p className="text-gray-500 mt-1">{subject.description}</p>
          )}
        </div>
      </div>

      {/* Cover Image */}
      {coverUrl && (
        <div className="relative h-64 rounded-xl overflow-hidden">
          <img
            src={coverUrl}
            alt={subject.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Subject Info & Progress */}
      <Card variant="bordered" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {subject.level && (
              <Badge variant="outline" size="sm">
                {subject.level === 'beginner' ? 'เริ่มต้น' : 
                 subject.level === 'intermediate' ? 'ปานกลาง' : 'ขั้นสูง'}
              </Badge>
            )}
            {subject.unlock_mode === 'sequential' && (
              <Badge variant="info" size="sm" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                ต้องเรียนตามลำดับ
              </Badge>
            )}
            {subject.unlock_mode === 'open' && (
              <Badge variant="info" size="sm" className="flex items-center gap-1">
                <PlayCircle className="w-3 h-3" />
                เปิดทุกบทเรียน
              </Badge>
            )}
            {user && subjectProgress && subjectProgress.hasStarted && (
              <>
                {subjectProgress.isCompleted && (
                  <Badge variant="success" size="sm" className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    เรียนจบแล้ว
                  </Badge>
                )}
                {!subjectProgress.isCompleted && (
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" />
                    กำลังเรียน {subjectProgress.progressPercent}%
                  </Badge>
                )}
              </>
            )}
          </div>
          
          {user && subjectProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ความคืบหน้า</span>
                <span className="font-medium text-gray-900">
                  {subjectProgress.completedEpisodes}/{subjectProgress.totalEpisodes} บทเรียน
                  {subjectProgress.progressPercent > 0 && ` (${subjectProgress.progressPercent}%)`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${subjectProgress.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>จบแล้ว: {subjectProgress.completedEpisodes}</span>
                <span>กำลังเรียน: {subjectProgress.inProgressEpisodes}</span>
                <span>ยังไม่เริ่ม: {subjectProgress.notStartedEpisodes}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Episodes List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">บทเรียนทั้งหมด ({episodes.length})</h2>
        
        {episodes.length === 0 ? (
          <Card variant="bordered" className="text-center py-12">
            <PlayCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ยังไม่มีบทเรียนในวิชานี้</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode, index) => {
              const status = getEpisodeStatus(episode, index)
              const locked = status === 'locked'
              const epProgress = progress[episode.id]

              return (
                <Link
                  key={episode.id}
                  to={locked ? '#' : `/subjects/${subjectId}/episodes/${episode.id}`}
                  onClick={(e) => {
                    if (locked) {
                      e.preventDefault()
                      alert('กรุณาเรียนบทเรียนก่อนหน้าจบก่อน')
                    }
                  }}
                >
                  <Card
                    variant="bordered"
                    className={`
                      p-4 transition-all
                      ${locked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-md hover:border-primary-200 cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Order Number / Status Icon */}
                      <div className="flex-shrink-0">
                        {locked ? (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-gray-500" />
                          </div>
                        ) : status === 'completed' ? (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                        ) : status === 'in_progress' ? (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <PlayCircle className="w-5 h-5 text-primary-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                            {episode.order_no}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 line-clamp-1">
                            {episode.title}
                          </h3>
                          {episode.points_reward && (
                            <div className="flex items-center gap-1 text-sm text-yellow-600 ml-2">
                              <Trophy className="w-4 h-4" />
                              <span>{episode.points_reward}</span>
                            </div>
                          )}
                        </div>
                        {episode.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {episode.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {episode.duration_seconds && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(episode.duration_seconds)}</span>
                            </div>
                          )}
                          {epProgress && epProgress.watched_percent > 0 && (
                            <span>
                              ดูแล้ว {Math.round(epProgress.watched_percent)}%
                            </span>
                          )}
                          {status === 'completed' && (
                            <Badge variant="success" size="sm">เรียนจบแล้ว</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

