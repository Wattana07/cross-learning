import React, { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, Badge, Spinner } from '@/components/ui'
import { BookMarked, ArrowLeft, CheckCircle2, PlayCircle } from 'lucide-react'
import { useCategory, useSubjectsWithCovers } from '@/hooks/useLearning'
import { getSubjectsProgress, getCategoryProgress, getBookmarkedSubjectIds, toggleBookmark } from '../api'
import { useAuthContext } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'

export function SubjectsPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  
  const { data: category, isLoading: categoryLoading, error: categoryError } = useCategory(categoryId)
  const { data: subjectsData, isLoading: subjectsLoading } = useSubjectsWithCovers(categoryId)

  const subjects = subjectsData.subjects
  const coverUrls = subjectsData.coverUrls

  // Memoize subject IDs
  const subjectIds = useMemo(() => subjects.map((s) => s.id).sort(), [subjects])

  // Load progress using React Query for caching
  const { data: subjectProgress = {}, isLoading: loadingSubjectProgress } = useQuery({
    queryKey: ['subjects-progress', user?.id, subjectIds.join(',')],
    queryFn: () => getSubjectsProgress(subjectIds),
    enabled: !!user && subjectIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  const { data: categoryProgress, isLoading: loadingCategoryProgress } = useQuery({
    queryKey: ['category-progress', user?.id, categoryId],
    queryFn: () => getCategoryProgress(categoryId!),
    enabled: !!user && !!categoryId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  // Load bookmarked subjects for this category
  const { data: bookmarkedIds, refetch: refetchBookmarks } = useQuery({
    queryKey: ['bookmarked-subject-ids', user?.id, subjectIds.join(',')],
    queryFn: () => getBookmarkedSubjectIds(subjectIds),
    enabled: !!user && subjectIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  const isBookmarked = (subjectId: string) => {
    if (!bookmarkedIds) return false
    return (bookmarkedIds as Set<string>).has(subjectId)
  }

  const handleToggleBookmark = async (
    e: React.MouseEvent<HTMLButtonElement>,
    subjectId: string
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนบันทึกวิชา')
      return
    }

    try {
      await toggleBookmark(subjectId)
      await refetchBookmarks()
    } catch (err) {
      console.error('Error toggling bookmark:', err)
      alert('ไม่สามารถบันทึกบุ๊คมาร์คได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const loading = categoryLoading || subjectsLoading || loadingSubjectProgress || loadingCategoryProgress
  const error = categoryError

  // Redirect if no categoryId
  if (!categoryId) {
    navigate('/categories')
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="text-center py-20">
        <p className="text-danger-500 mb-4">{error || 'ไม่พบหมวดหมู่นี้'}</p>
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
          to="/categories"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            {user && categoryProgress && (
              <>
                {categoryProgress.isCompleted && (
                  <Badge variant="success" size="sm" className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    เรียนจบแล้ว
                  </Badge>
                )}
                {categoryProgress.hasStarted && !categoryProgress.isCompleted && (
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" />
                    กำลังเรียน {categoryProgress.progressPercent}%
                  </Badge>
                )}
              </>
            )}
          </div>
          {category.description && (
            <p className="text-gray-500 mt-1">{category.description}</p>
          )}
          {user && categoryProgress && categoryProgress.hasStarted && (
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <span>จบแล้ว: {categoryProgress.completedSubjects}/{categoryProgress.totalSubjects} วิชา</span>
              <span>กำลังเรียน: {categoryProgress.inProgressSubjects} วิชา</span>
            </div>
          )}
        </div>
      </div>

      {/* Subjects grid */}
      {subjects.length === 0 ? (
        <Card variant="bordered" className="text-center py-16">
          <BookMarked className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-gray-900 font-medium mb-1">ยังไม่มีวิชาในหมวดหมู่นี้</h3>
          <p className="text-gray-500 text-sm">รอผู้ดูแลระบบเพิ่มวิชา</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Link key={subject.id} to={`/subjects/${subject.id}`}>
              <Card
                variant="bordered"
                padding="none"
                className="group hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer overflow-hidden"
              >
                {/* Cover Image */}
                {coverUrls[subject.id] ? (
                  <img
                    src={coverUrls[subject.id]}
                    alt={subject.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                    <BookMarked className="w-16 h-16 text-primary-300" />
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 flex-1">
                      {subject.title}
                    </h3>
                    {user && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(e, subject.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isBookmarked(subject.id)
                            ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700'
                        }`}
                        title={isBookmarked(subject.id) ? 'ลบออกจากบุ๊คมาร์ค' : 'บันทึกวิชานี้ไว้ดูภายหลัง'}
                      >
                        <BookMarked
                          className={
                            isBookmarked(subject.id)
                              ? 'w-4 h-4 text-yellow-600 fill-yellow-500'
                              : 'w-4 h-4'
                          }
                        />
                        <span>{isBookmarked(subject.id) ? 'บันทึกไว้แล้ว' : 'บันทึกวิชา'}</span>
                      </button>
                    )}
                  </div>
                  {subject.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {subject.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {subject.level && (
                        <Badge variant="outline" size="sm">
                          {subject.level === 'beginner' ? 'เริ่มต้น' : 
                           subject.level === 'intermediate' ? 'ปานกลาง' : 'ขั้นสูง'}
                        </Badge>
                      )}
                      {subject.unlock_mode === 'sequential' && (
                        <Badge variant="info" size="sm">ตามลำดับ</Badge>
                      )}
                      {user && subjectProgress[subject.id] && (
                        <>
                          {subjectProgress[subject.id].isCompleted && (
                            <Badge variant="success" size="sm" className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              จบแล้ว
                            </Badge>
                          )}
                          {subjectProgress[subject.id].hasStarted && !subjectProgress[subject.id].isCompleted && (
                            <Badge variant="info" size="sm" className="flex items-center gap-1">
                              <PlayCircle className="w-3 h-3" />
                              {subjectProgress[subject.id].progressPercent}%
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    {user && subjectProgress[subject.id] && subjectProgress[subject.id].hasStarted && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${subjectProgress[subject.id].progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

