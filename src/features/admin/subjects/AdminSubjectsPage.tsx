import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { CreateSubjectModal } from './CreateSubjectModal'
import { EditSubjectModal } from './EditSubjectModal'
import {
  BookMarked,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FolderOpen,
  GripVertical,
} from 'lucide-react'
import type { Subject, ContentStatus } from '@/lib/database.types'
import { cn, formatDate } from '@/lib/utils'
import { fetchSubjects, deleteSubject, reorderSubjects } from './api'
import { getSubjectCoverUrl, deleteSubjectCover } from '@/lib/storage'

type SubjectWithCategory = Subject & { category_name?: string }

export function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectWithCategory | null>(null)
  const [actionMenuSubject, setActionMenuSubject] = useState<string | null>(null)
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({})
  const [draggedSubject, setDraggedSubject] = useState<string | null>(null)

  // Fetch subjects
  const loadSubjects = async () => {
    setLoading(true)
    try {
      const data = await fetchSubjects()
      setSubjects(data)

      // Load covers
      const urls: Record<string, string> = {}
      for (const subject of data) {
        if (subject.cover_path) {
          const url = await getSubjectCoverUrl(subject.cover_path)
          if (url) urls[subject.id] = url
        }
      }
      setCoverUrls(urls)
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  // Filter by search, status, and category
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      !searchQuery ||
      subject.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || subject.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || subject.category_id === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Group filtered subjects by category for display
  const subjectsByCategory = filteredSubjects.reduce((acc, subject) => {
    const categoryId = subject.category_id
    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryName: subject.category_name || 'ไม่มีหมวดหมู่',
        subjects: [],
      }
    }
    acc[categoryId].subjects.push(subject)
    return acc
  }, {} as Record<string, { categoryName: string; subjects: SubjectWithCategory[] }>)

  // Handle drag and drop
  const handleDragStart = (subjectId: string) => {
    setDraggedSubject(subjectId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetSubjectId: string, categoryId: string) => {
    if (!draggedSubject || draggedSubject === targetSubjectId) return

    const categorySubjects = subjectsByCategory[categoryId]?.subjects || []
    const draggedIndex = categorySubjects.findIndex((s) => s.id === draggedSubject)
    const targetIndex = categorySubjects.findIndex((s) => s.id === targetSubjectId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Create new order
    const newSubjects = [...categorySubjects]
    const [removed] = newSubjects.splice(draggedIndex, 1)
    newSubjects.splice(targetIndex, 0, removed)

    // Update order_no
    const orders = newSubjects.map((sub, index) => ({
      id: sub.id,
      order_no: index + 1,
    }))

    try {
      await reorderSubjects(categoryId, orders)
      await loadSubjects()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการจัดลำดับ: ' + error.message)
    } finally {
      setDraggedSubject(null)
    }
  }

  // Get unique categories for filter
  const categories = Array.from(
    new Map(subjects.map((s) => [s.category_id, s.category_name])).entries()
  ).map(([id, name]) => ({ id, name: name || 'Unknown' }))

  // Toggle status
  const toggleStatus = async (subject: Subject) => {
    const newStatus: ContentStatus = subject.status === 'published' ? 'hidden' : 'published'
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ status: newStatus })
        .eq('id', subject.id)

      if (error) throw error
      await loadSubjects()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Handle delete
  const handleDelete = async (subject: Subject) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบวิชา "${subject.title}"?`)) {
      return
    }

    try {
      // Delete cover first
      await deleteSubjectCover(subject.id)
      // Delete subject
      await deleteSubject(subject.id)
      await loadSubjects()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">เผยแพร่</Badge>
      case 'draft':
        return <Badge variant="warning">ร่าง</Badge>
      case 'hidden':
        return <Badge variant="danger">ซ่อน</Badge>
    }
  }

  const getUnlockModeBadge = (mode: string) => {
    return mode === 'sequential' ? (
      <Badge variant="info" size="sm">ตามลำดับ</Badge>
    ) : (
      <Badge variant="info" size="sm">เปิดทั้งหมด</Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการวิชา</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการวิชาการเรียนรู้ทั้งหมด</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มวิชา
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาวิชา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ContentStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="published">เผยแพร่</option>
              <option value="draft">ร่าง</option>
              <option value="hidden">ซ่อน</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Subjects List by Category */}
      {filteredSubjects.length === 0 ? (
        <Card className="p-12 text-center">
          <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบวิชา</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(subjectsByCategory).map(([categoryId, { categoryName, subjects: categorySubjects }]) => (
            <div key={categoryId} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
                <Badge variant="outline" size="sm">{categorySubjects.length} วิชา</Badge>
              </div>

              {/* Subjects List with Drag and Drop */}
              <div className="space-y-2">
                {categorySubjects.map((subject, index) => (
                  <Card
                    key={subject.id}
                    draggable
                    onDragStart={() => handleDragStart(subject.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDrop(subject.id, categoryId)
                    }}
                    className={cn(
                      'p-4 hover:shadow-lg transition-all cursor-move',
                      draggedSubject === subject.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Drag Handle */}
                      <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Order Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                        {subject.order_no || index + 1}
                      </div>

                      {/* Cover Image */}
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        {coverUrls[subject.id] ? (
                          <img
                            src={coverUrls[subject.id]}
                            alt={subject.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookMarked className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
                              {subject.title}
                            </h3>
                            {subject.description && (
                              <p className="text-sm text-gray-600 line-clamp-1">{subject.description}</p>
                            )}
                          </div>
                          {getStatusBadge(subject.status)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getUnlockModeBadge(subject.unlock_mode)}
                          {subject.level && (
                            <Badge variant="outline" size="sm">{subject.level}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Menu */}
                      <div className="flex-shrink-0 relative">
                        <button
                          onClick={() =>
                            setActionMenuSubject(
                              actionMenuSubject === subject.id ? null : subject.id
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        {actionMenuSubject === subject.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuSubject(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  setEditingSubject(subject)
                                  setActionMenuSubject(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                แก้ไข
                              </button>
                              <button
                                onClick={() => {
                                  toggleStatus(subject)
                                  setActionMenuSubject(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {subject.status === 'published' ? (
                                  <>
                                    <EyeOff className="w-4 h-4" />
                                    ซ่อน
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    เผยแพร่
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(subject)
                                  setActionMenuSubject(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                ลบ
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateSubjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadSubjects}
      />

      {editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          isOpen={!!editingSubject}
          onClose={() => setEditingSubject(null)}
          onSuccess={loadSubjects}
        />
      )}
    </div>
  )
}

