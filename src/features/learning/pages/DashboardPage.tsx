import { useState, useMemo } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { Card, Badge, Spinner, Input } from '@/components/ui'
import {
  Trophy,
  Flame,
  BookOpen,
  PlayCircle,
  ArrowRight,
  Search,
  Bell,
  Users,
  FileText,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMyWallet, getMyStreak } from '@/lib/auth'
import {
  fetchContinueWatching,
  fetchAllSubjects,
  getSubjectsProgress,
  getSubjectsLearnerCounts,
} from '../api'
import { getSubjectCoverUrl } from '@/lib/storage'
import type { Subject, Episode, UserProgress } from '@/lib/database.types'
import { getLevelFromPoints, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useCategoriesWithSubjects } from '@/hooks/useCategoriesWithSubjects'
import { useQuery } from '@tanstack/react-query'

type ContinueWatchingItem = {
  episode: Episode
  subject: Subject & { category_name?: string }
  progress: UserProgress
}

type TabType = 'all' | 'active' | 'completed'

export function DashboardPage() {
  const { profile, user } = useAuthContext()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Load categories with subjects for "all" tab
  const { data: categoriesWithSubjects = [], isLoading: loadingCategories } = useCategoriesWithSubjects()

  // Load wallet using React Query
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['dashboard', 'wallet', user?.id],
    queryFn: async () => {
      try {
        const result = await getMyWallet()
        return result || { total_points: 0, level: 1 }
      } catch (err) {
        return { total_points: 0, level: 1 }
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })
  const wallet = walletData || { total_points: 0, level: 1 }

  // Load streak using React Query
  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: ['dashboard', 'streak', user?.id],
    queryFn: async () => {
      try {
        const result = await getMyStreak()
        return result || { current_streak: 0, max_streak: 0 }
      } catch (err) {
        return { current_streak: 0, max_streak: 0 }
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })
  const streak = streakData || { current_streak: 0, max_streak: 0 }

  // Load continue watching using React Query
  const { data: continueWatching = [], isLoading: continueLoading } = useQuery({
    queryKey: ['dashboard', 'continue-watching', user?.id],
    queryFn: fetchContinueWatching,
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  // Load subjects using React Query
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['dashboard', 'subjects'],
    queryFn: fetchAllSubjects,
    staleTime: 1000 * 60 * 10, // 10 minutes (subjects don't change often)
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  // Load cover URLs using React Query
  const { data: subjectCoverUrls = {}, isLoading: coversLoading } = useQuery({
    queryKey: ['dashboard', 'subject-covers', subjects.map(s => s.id).sort().join(',')],
    queryFn: async () => {
      const urls: Record<string, string> = {}
      for (const subject of subjects) {
        if (subject.cover_path) {
          try {
            const url = await getSubjectCoverUrl(subject.cover_path)
            if (url) urls[subject.id] = url
          } catch {
            // Ignore errors
          }
        }
      }
      return urls
    },
    enabled: subjects.length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes (cover URLs are stable)
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  // Get all subject IDs from both subjects array (for active/completed tabs) and categoriesWithSubjects (for all tab)
  const allSubjectIdsFromCategories = useMemo(
    () => categoriesWithSubjects.flatMap((c) => c.subjects.map((s) => s.id)),
    [categoriesWithSubjects]
  )
  const subjectIdsFromSubjects = useMemo(() => subjects.map(s => s.id), [subjects])
  
  // Combine and deduplicate subject IDs
  const allSubjectIds = useMemo(() => {
    const combined = [...allSubjectIdsFromCategories, ...subjectIdsFromSubjects]
    return Array.from(new Set(combined)).sort()
  }, [allSubjectIdsFromCategories, subjectIdsFromSubjects])

  // Load subject progress using React Query (using optimized batch function)
  // Use same query key as CategoriesPage to share cache
  const { data: subjectsProgressMap = {}, isLoading: progressLoading } = useQuery({
    queryKey: ['subjects-progress', user?.id, allSubjectIds.join(',')],
    queryFn: () => getSubjectsProgress(allSubjectIds),
    enabled: !!user && allSubjectIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  // Load learner counts for all subjects
  const { data: learnerCountsMap = {}, isLoading: learnerCountsLoading } = useQuery({
    queryKey: ['subjects-learner-counts', allSubjectIds.join(',')],
    queryFn: () => getSubjectsLearnerCounts(allSubjectIds),
    enabled: allSubjectIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes - learner counts don't change frequently
    refetchOnMount: false,
  })

  // Use subjectsProgressMap directly - it has all the data we need (isCompleted, hasStarted, etc.)
  // Also create a simplified progress map for backward compatibility
  const subjectProgress = useMemo(() => {
    const progress: Record<string, { watched: number; total: number }> = {}
    subjects.forEach((subject) => {
      const subjProgress = subjectsProgressMap[subject.id]
      if (subjProgress) {
        progress[subject.id] = {
          watched: subjProgress.completedEpisodes,
          total: subjProgress.totalEpisodes,
        }
      } else {
        progress[subject.id] = { watched: 0, total: 0 }
      }
    })
    return progress
  }, [subjects, subjectsProgressMap])

  const loading = walletLoading || streakLoading || continueLoading || subjectsLoading || coversLoading || progressLoading || loadingCategories

  const totalPoints = wallet.total_points || 0
  const level = wallet.level || getLevelFromPoints(totalPoints)
  const currentStreak = streak.current_streak || 0
  const maxStreak = streak.max_streak || 0

  // Filter subjects by tab
  const filteredSubjects = subjects.filter((subject) => {
    const progress = subjectProgress[subject.id] || { watched: 0, total: 0 }
    const percent = progress.total > 0 ? (progress.watched / progress.total) * 100 : 0

    if (activeTab === 'active') {
      return percent > 0 && percent < 100
    } else if (activeTab === 'completed') {
      return percent === 100
    }
    return true
  })

  // Filter by search
  const searchFilteredSubjects = filteredSubjects.filter((subject) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      subject.title.toLowerCase().includes(query) ||
      subject.description?.toLowerCase().includes(query) ||
      subject.category_name?.toLowerCase().includes(query)
    )
  })

  // For "all" tab, group by category
  const categoriesWithFilteredSubjects = categoriesWithSubjects.map((category) => {
    const sortedSubjects = [...category.subjects]
      .sort((a, b) => (a.order_no ?? 999999) - (b.order_no ?? 999999))
      .filter((subject) => {
        // Apply search filter if exists
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            subject.title.toLowerCase().includes(query) ||
            subject.description?.toLowerCase().includes(query) ||
            category.name.toLowerCase().includes(query)
          )
        }
        return true
      })
    
    return {
      ...category,
      subjects: sortedSubjects,
    }
  }).filter((cat) => cat.subjects.length > 0)

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'สวัสดีตอนเช้า'
    if (hour < 18) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  }

  if (loading || loadingCategories) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Greeting and Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'ผู้ใช้'} 👋
          </h1>
          <p className="text-gray-500 mt-1">เริ่มเรียนรู้วันนี้กันเถอะ</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="ค้นหาวิชา, งาน, ฯลฯ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full" />
          </button>
        </div>
      </div>

      {/* My Courses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">คอร์สของฉัน</h2>
          <Link
            to="/categories"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
          {(['all', 'active', 'completed'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'all' ? 'ทั้งหมด' : tab === 'active' ? 'กำลังเรียน' : 'เรียนจบแล้ว'}
            </button>
          ))}
        </div>

        {/* Course Cards - Different layout for "all" tab */}
        {activeTab === 'all' ? (
          // Show by category for "all" tab
          categoriesWithFilteredSubjects.length === 0 ? (
            <Card variant="bordered" className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">ไม่พบคอร์ส</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {categoriesWithFilteredSubjects.map((category) => (
                <div key={category.id} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg">
                      <FolderOpen className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
                    <Badge variant="outline" size="sm">
                      {category.subjects.length} วิชา
                    </Badge>
                  </div>

                  {/* Subjects Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.subjects.map((subject) => {
                      const progress = subjectProgress[subject.id] || { watched: 0, total: 0 }
                      const coverUrl = subjectCoverUrls[subject.id] || subject.coverUrl
                      const subjProgress = subjectsProgressMap[subject.id]
                      // Use subjProgress.progressPercent if available, otherwise calculate from progress
                      const percent = subjProgress?.progressPercent ?? (progress.total > 0 ? (progress.watched / progress.total) * 100 : 0)

                      // Get level badge
                      const getLevelBadge = () => {
                        if (!subject.level) return null
                        if (subject.level === 'beginner') return 'เริ่มต้น'
                        if (subject.level === 'intermediate') return 'ปานกลาง'
                        return 'ขั้นสูง'
                      }

                      return (
                        <Link key={subject.id} to={`/subjects/${subject.id}`}>
                          <Card
                            variant="bordered"
                            className="p-5 hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer"
                          >
                            {/* Course Cover Image */}
                            {coverUrl ? (
                              <div className="w-full h-48 mb-4 rounded-xl overflow-hidden bg-gray-100">
                                <img
                                  src={coverUrl}
                                  alt={subject.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-48 mb-4 rounded-xl bg-primary-100 flex items-center justify-center">
                                <BookOpen className="w-16 h-16 text-primary-600" />
                              </div>
                            )}

                            {/* Course Info */}
                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                              {subject.title}
                            </h3>

                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {getLevelBadge() && (
                                <Badge variant="outline" size="sm">
                                  {getLevelBadge()}
                                </Badge>
                              )}
                              {user && subjProgress && (
                                <>
                                  {subjProgress.isCompleted && (
                                    <Badge variant="success" size="sm" className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      จบแล้ว
                                    </Badge>
                                  )}
                                  {subjProgress.hasStarted && !subjProgress.isCompleted && (
                                    <Badge variant="info" size="sm" className="flex items-center gap-1">
                                      <PlayCircle className="w-3 h-3" />
                                      {subjProgress.progressPercent}%
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>

                      {/* Stats Icons */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1" title="จำนวนผู้เรียน">
                          <Users className="w-4 h-4" />
                          <span>{learnerCountsMap[subject.id] || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="จำนวนบทเรียน">
                          <FileText className="w-4 h-4" />
                          <span>{subjProgress?.totalEpisodes || progress.total || 0}</span>
                        </div>
                        {user && subjProgress && subjProgress.hasStarted && (
                          <div className="flex items-center gap-1" title="ความคืบหน้า">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{subjProgress.progressPercent}%</span>
                          </div>
                        )}
                      </div>

                            {/* Progress Bar - Only show if user has started */}
                            {user && subjProgress && subjProgress.hasStarted && (
                              <>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                  <div
                                    className="bg-primary-600 h-2 rounded-full transition-all"
                                    style={{ width: `${subjProgress.progressPercent}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500">
                                  เรียนแล้ว: {subjProgress.progressPercent}%
                                </p>
                              </>
                            )}
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Show as grid for "active" and "completed" tabs
          searchFilteredSubjects.length === 0 ? (
            <Card variant="bordered" className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">ไม่พบคอร์ส</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchFilteredSubjects.slice(0, 6).map((subject) => {
                const progress = subjectProgress[subject.id] || { watched: 0, total: 0 }
                const coverUrl = subjectCoverUrls[subject.id]
                const subjProgress = subjectsProgressMap[subject.id]
                // Use subjProgress.progressPercent if available, otherwise calculate from progress
                const percent = subjProgress?.progressPercent ?? (progress.total > 0 ? (progress.watched / progress.total) * 100 : 0)

                // Get level badge
                const getLevelBadge = () => {
                  if (!subject.level) return null
                  if (subject.level === 'beginner') return 'เริ่มต้น'
                  if (subject.level === 'intermediate') return 'ปานกลาง'
                  return 'ขั้นสูง'
                }

                return (
                  <Link key={subject.id} to={`/subjects/${subject.id}`}>
                    <Card
                      variant="bordered"
                      className="p-5 hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer"
                    >
                      {/* Course Cover Image */}
                      {coverUrl ? (
                        <div className="w-full h-48 mb-4 rounded-xl overflow-hidden bg-gray-100">
                          <img
                            src={coverUrl}
                            alt={subject.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 mb-4 rounded-xl bg-primary-100 flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-primary-600" />
                        </div>
                      )}

                      {/* Course Info */}
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {subject.title}
                      </h3>
                      {subject.category_name && (
                        <p className="text-sm text-gray-500 mb-3">{subject.category_name}</p>
                      )}

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {getLevelBadge() && (
                          <Badge variant="outline" size="sm">
                            {getLevelBadge()}
                          </Badge>
                        )}
                        {user && subjProgress && (
                          <>
                            {subjProgress.isCompleted && (
                              <Badge variant="success" size="sm" className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                จบแล้ว
                              </Badge>
                            )}
                            {subjProgress.hasStarted && !subjProgress.isCompleted && (
                              <Badge variant="info" size="sm" className="flex items-center gap-1">
                                <PlayCircle className="w-3 h-3" />
                                {subjProgress.progressPercent}%
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* Stats Icons */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1" title="จำนวนผู้เรียน">
                          <Users className="w-4 h-4" />
                          <span>{learnerCountsMap[subject.id] || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="จำนวนบทเรียน">
                          <FileText className="w-4 h-4" />
                          <span>{subjProgress?.totalEpisodes || progress.total || 0}</span>
                        </div>
                        {user && subjProgress && subjProgress.hasStarted && (
                          <div className="flex items-center gap-1" title="ความคืบหน้า">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{subjProgress.progressPercent}%</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar - Only show if user has started */}
                      {user && subjProgress && subjProgress.hasStarted && (
                        <>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all"
                              style={{ width: `${subjProgress.progressPercent}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            เรียนแล้ว: {subjProgress.progressPercent}%
                          </p>
                        </>
                      )}
                    </Card>
                  </Link>
                )
              })}
            </div>
          )
        )}
      </div>

    </div>
  )
}
