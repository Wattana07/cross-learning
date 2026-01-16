import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge, Spinner, Input } from '@/components/ui'
import { FolderOpen, BookMarked, ArrowRight, CheckCircle2, PlayCircle, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { useCategoriesWithSubjects } from '@/hooks/useCategoriesWithSubjects'
import { getCategoriesProgress, getSubjectsProgress } from '../api'
import { useAuthContext } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'

export function CategoriesPage() {
  const { data: categoriesWithSubjects = [], isLoading: loading, error } = useCategoriesWithSubjects()
  const { user } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all')

  // Memoize IDs to avoid unnecessary recalculations
  const categoryIds = useMemo(() => categoriesWithSubjects.map((c) => c.id), [categoriesWithSubjects])
  const allSubjectIds = useMemo(
    () => categoriesWithSubjects.flatMap((c) => c.subjects.map((s) => s.id)),
    [categoriesWithSubjects]
  )

  // Load progress using React Query for caching
  const { data: categoryProgress = {}, isLoading: loadingCategoryProgress } = useQuery({
    queryKey: ['categories-progress', user?.id, categoryIds.sort().join(',')],
    queryFn: () => getCategoriesProgress(categoryIds),
    enabled: !!user && categoryIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  const { data: subjectProgress = {}, isLoading: loadingSubjectProgress } = useQuery({
    queryKey: ['subjects-progress', user?.id, allSubjectIds.sort().join(',')],
    queryFn: () => getSubjectsProgress(allSubjectIds),
    enabled: !!user && allSubjectIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  const loadingProgress = loadingCategoryProgress || loadingSubjectProgress

  // Expand all categories by default
  useEffect(() => {
    if (categoriesWithSubjects.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categoriesWithSubjects.map((c) => c.id)))
    }
  }, [categoriesWithSubjects, expandedCategories.size])

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Filter and search - Show all categories, but filter subjects within them
  const filteredCategories = categoriesWithSubjects.map((category) => {
    const sortedSubjects = [...category.subjects].sort((a, b) => {
      const orderA = a.order_no ?? 999999
      const orderB = b.order_no ?? 999999
      return orderA - orderB
    })

    // Filter subjects by search query and status
    const searchFiltered = sortedSubjects.filter((subject) => {
      // If there's a search query, check if subject matches
      const matchesSearch =
        !searchQuery ||
        subject.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      // Filter by status
      if (filterStatus === 'all') return true
      if (!user || !subjectProgress[subject.id]) {
        return filterStatus === 'not-started'
      }

      const progress = subjectProgress[subject.id]
      if (filterStatus === 'completed' && progress.isCompleted) return true
      if (filterStatus === 'in-progress' && progress.hasStarted && !progress.isCompleted) return true
      if (filterStatus === 'not-started' && !progress.hasStarted) return true

      return false
    })

    return { ...category, filteredSubjects: searchFiltered }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-danger-500">{error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">คอร์สทั้งหมด</h1>
        <p className="text-gray-500 mt-2">เลือกคอร์สและวิชาที่คุณสนใจเรียนรู้</p>
      </div>

      {/* Search and Filter */}
      <Card variant="bordered" className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาคอร์สหรือวิชา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="completed">เรียนจบแล้ว</option>
              <option value="in-progress">กำลังเรียน</option>
              <option value="not-started">ยังไม่เริ่ม</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Categories with Subjects - Show all categories */}
      {categoriesWithSubjects.length === 0 ? (
        <Card variant="bordered" className="text-center py-16">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ยังไม่มีคอร์ส</h3>
          <p className="text-gray-500 text-sm">รอผู้ดูแลระบบเพิ่มคอร์ส</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            const progress = categoryProgress[category.id]
            const sortedSubjects = category.filteredSubjects

            return (
              <Card key={category.id} variant="bordered" className="overflow-hidden">
                {/* Category Header - Clickable to expand/collapse */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex-shrink-0 shadow-md">
                        <FolderOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                          <Badge variant="outline" size="sm">
                            {sortedSubjects.length} วิชา
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">{category.description}</p>
                        )}
                        {user && progress && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {progress.isCompleted && (
                              <Badge variant="success" size="sm" className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                เรียนจบแล้ว
                              </Badge>
                            )}
                            {progress.hasStarted && !progress.isCompleted && (
                              <Badge variant="info" size="sm" className="flex items-center gap-1.5">
                                <PlayCircle className="w-3.5 h-3.5" />
                                กำลังเรียน {progress.progressPercent}%
                              </Badge>
                            )}
                            {progress.hasStarted && (
                              <span className="text-sm text-gray-600">
                                จบแล้ว: {progress.completedSubjects}/{progress.totalSubjects} วิชา
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {user && progress && progress.hasStarted && (
                        <div className="hidden sm:block w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress.progressPercent}%` }}
                          />
                        </div>
                      )}
                      <div className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Subjects Grid - Collapsible */}
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                    {sortedSubjects.length === 0 ? (
                      <div className="text-center py-12">
                        <BookMarked className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">
                          {searchQuery || filterStatus !== 'all'
                            ? 'ไม่พบวิชาที่ตรงกับเงื่อนไข'
                            : 'ยังไม่มีวิชาในคอร์สนี้'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedSubjects.map((subject, index) => {
                        const subjProgress = subjectProgress[subject.id]
                        return (
                          <Link key={subject.id} to={`/subjects/${subject.id}`}>
                            <Card
                              variant="bordered"
                              className="group hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer overflow-hidden h-full bg-white"
                            >
                              {/* Cover Image */}
                              {subject.coverUrl ? (
                                <div className="relative h-36 overflow-hidden">
                                  <img
                                    src={subject.coverUrl}
                                    alt={subject.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute top-2 left-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                                    {subject.order_no ?? index + 1}
                                  </div>
                                  {user && subjProgress && subjProgress.isCompleted && (
                                    <div className="absolute top-2 right-2">
                                      <Badge variant="success" size="sm" className="shadow-lg">
                                        <CheckCircle2 className="w-3 h-3" />
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative h-36 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                                  <BookMarked className="w-16 h-16 text-primary-300" />
                                  <div className="absolute top-2 left-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                                    {subject.order_no ?? index + 1}
                                  </div>
                                </div>
                              )}

                              {/* Content */}
                              <div className="p-4">
                                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2 text-base leading-tight">
                                  {subject.title}
                                </h3>
                                {subject.description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                                    {subject.description}
                                  </p>
                                )}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {subject.level && (
                                      <Badge variant="outline" size="sm" className="text-xs">
                                        {subject.level === 'beginner' ? 'เริ่มต้น' : 
                                         subject.level === 'intermediate' ? 'ปานกลาง' : 'ขั้นสูง'}
                                      </Badge>
                                    )}
                                    {subject.unlock_mode === 'sequential' && (
                                      <Badge variant="info" size="sm" className="text-xs">ตามลำดับ</Badge>
                                    )}
                                    {user && subjProgress && (
                                      <>
                                        {subjProgress.isCompleted && (
                                          <Badge variant="success" size="sm" className="text-xs flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            จบแล้ว
                                          </Badge>
                                        )}
                                        {subjProgress.hasStarted && !subjProgress.isCompleted && (
                                          <Badge variant="info" size="sm" className="text-xs">
                                            {subjProgress.progressPercent}%
                                          </Badge>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {user && subjProgress && subjProgress.hasStarted && (
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className="bg-primary-600 h-1.5 rounded-full transition-all"
                                        style={{ width: `${subjProgress.progressPercent}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </Link>
                        )
                      })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
