import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { CreateEpisodeModal } from './CreateEpisodeModal'
import { EditEpisodeModal } from './EditEpisodeModal'
import {
  PlayCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookMarked,
  GripVertical,
  FolderOpen,
} from 'lucide-react'
import type { Episode, ContentStatus, MediaType } from '@/lib/database.types'
import { cn, formatDate, formatDuration } from '@/lib/utils'
import { fetchEpisodesBySubject, deleteEpisode, reorderEpisodes } from './api'
import { fetchCategories } from '@/features/admin/categories/api'
import { fetchSubjectsByCategory } from '@/features/admin/subjects/api'

type EpisodeWithSubject = Episode & { subject_title?: string }

export function AdminEpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; title: string }[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [actionMenuEpisode, setActionMenuEpisode] = useState<string | null>(null)
  const [draggedEpisode, setDraggedEpisode] = useState<string | null>(null)

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories()
        setCategories(data.map((cat) => ({ id: cat.id, name: cat.name })))
      } catch (error: any) {
        console.error('Error fetching categories:', error)
      }
    }
    loadCategories()
  }, [])

  // Load subjects when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      async function loadSubjects() {
        try {
          const data = await fetchSubjectsByCategory(selectedCategoryId)
          setSubjects(data.map((sub) => ({ id: sub.id, title: sub.title })))
          // Reset subject selection when category changes
          setSelectedSubjectId('')
          setEpisodes([])
        } catch (error: any) {
          console.error('Error fetching subjects:', error)
        }
      }
      loadSubjects()
    } else {
      setSubjects([])
      setSelectedSubjectId('')
      setEpisodes([])
    }
  }, [selectedCategoryId])

  // Load episodes when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      loadEpisodes()
    } else {
      setEpisodes([])
      setLoading(false)
    }
  }, [selectedSubjectId])

  const loadEpisodes = async () => {
    if (!selectedSubjectId) return

    setLoading(true)
    try {
      const data = await fetchEpisodesBySubject(selectedSubjectId)
      setEpisodes(data)
    } catch (error: any) {
      console.error('Error fetching episodes:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter episodes
  const filteredEpisodes = episodes.filter((ep) => {
    const matchesSearch =
      !searchQuery ||
      ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ep.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Handle drag and drop
  const handleDragStart = (episodeId: string) => {
    setDraggedEpisode(episodeId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetEpisodeId: string) => {
    if (!draggedEpisode || draggedEpisode === targetEpisodeId || !selectedSubjectId) return

    const draggedIndex = episodes.findIndex((e) => e.id === draggedEpisode)
    const targetIndex = episodes.findIndex((e) => e.id === targetEpisodeId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Create new order
    const newEpisodes = [...episodes]
    const [removed] = newEpisodes.splice(draggedIndex, 1)
    newEpisodes.splice(targetIndex, 0, removed)

    // Update order_no
    const orders = newEpisodes.map((ep, index) => ({
      id: ep.id,
      order_no: index + 1,
    }))

    try {
      await reorderEpisodes(selectedSubjectId, orders)
      await loadEpisodes()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการจัดลำดับ: ' + error.message)
    } finally {
      setDraggedEpisode(null)
    }
  }

  // Toggle status
  const toggleStatus = async (episode: Episode) => {
    const newStatus: ContentStatus = episode.status === 'published' ? 'hidden' : 'published'
    try {
      const { error } = await supabase
        .from('episodes')
        .update({ status: newStatus })
        .eq('id', episode.id)

      if (error) throw error
      await loadEpisodes()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Handle delete
  const handleDelete = async (episode: Episode) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ EP "${episode.title}"?`)) {
      return
    }

    try {
      await deleteEpisode(episode.id)
      await loadEpisodes()
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

  const getMediaTypeBadge = (type: MediaType) => {
    switch (type) {
      case 'video_url':
        return <Badge variant="info" size="sm">Video URL</Badge>
      case 'video_upload':
        return <Badge variant="info" size="sm">Video Upload</Badge>
      case 'pdf':
        return <Badge variant="info" size="sm">PDF</Badge>
    }
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการบทเรียน (EP)</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการบทเรียนในแต่ละวิชา</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedSubjectId}
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่ม EP
        </Button>
      </div>

      {/* Category and Subject Selection */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Category Selection */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">เลือกหมวดหมู่:</label>
            </div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selection */}
          {selectedCategoryId && (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">เลือกวิชา:</label>
              </div>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={!selectedCategoryId}
              >
                <option value="">-- เลือกวิชา --</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {!selectedCategoryId ? (
        <Card className="p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">กรุณาเลือกหมวดหมู่ก่อน</p>
        </Card>
      ) : !selectedSubjectId ? (
        <Card className="p-12 text-center">
          <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">กรุณาเลือกวิชาก่อน</p>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="ค้นหา EP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-5 h-5" />}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
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

          {/* Episodes List */}
          {filteredEpisodes.length === 0 ? (
            <Card className="p-12 text-center">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ไม่พบ EP</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredEpisodes.map((episode, index) => (
                <Card
                  key={episode.id}
                  className={cn(
                    'p-4 hover:shadow-lg transition-shadow',
                    draggedEpisode === episode.id && 'opacity-50'
                  )}
                  draggable
                  onDragStart={() => handleDragStart(episode.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(episode.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 pt-1 cursor-move">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Order Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                      {episode.order_no}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
                            {episode.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getMediaTypeBadge(episode.primary_media_type)}
                            {episode.duration_seconds && (
                              <Badge variant="outline" size="sm">
                                {formatDuration(episode.duration_seconds)}
                              </Badge>
                            )}
                            {episode.points_reward && (
                              <Badge variant="outline" size="sm">
                                {episode.points_reward} แต้ม
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(episode.status)}
                          {/* Action Menu */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActionMenuEpisode(
                                  actionMenuEpisode === episode.id ? null : episode.id
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-gray-100"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>

                            {actionMenuEpisode === episode.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActionMenuEpisode(null)}
                                />
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                                  <button
                                    onClick={() => {
                                      setEditingEpisode(episode)
                                      setActionMenuEpisode(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                    แก้ไข
                                  </button>
                                  <button
                                    onClick={() => {
                                      toggleStatus(episode)
                                      setActionMenuEpisode(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {episode.status === 'published' ? (
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
                                      handleDelete(episode)
                                      setActionMenuEpisode(null)
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
                      </div>
                      {episode.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {episode.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        สร้างเมื่อ {formatDate(episode.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateEpisodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadEpisodes}
        subjectId={selectedSubjectId}
      />

      {editingEpisode && (
        <EditEpisodeModal
          episode={editingEpisode}
          isOpen={!!editingEpisode}
          onClose={() => setEditingEpisode(null)}
          onSuccess={loadEpisodes}
        />
      )}
    </div>
  )
}

