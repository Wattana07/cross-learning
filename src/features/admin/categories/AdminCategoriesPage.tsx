import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { CreateCategoryModal } from './CreateCategoryModal'
import { EditCategoryModal } from './EditCategoryModal'
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react'
import type { Category, ContentStatus } from '@/lib/database.types'
import { cn, formatDate } from '@/lib/utils'
import { fetchCategories, deleteCategory } from './api'

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [actionMenuCategory, setActionMenuCategory] = useState<string | null>(null)

  // Fetch categories
  const loadCategories = async () => {
    setLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // Filter by search and status
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = !searchQuery || cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || cat.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Toggle status
  const toggleStatus = async (category: Category) => {
    const newStatus: ContentStatus = category.status === 'published' ? 'hidden' : 'published'
    try {
      const { error } = await supabase
        .from('categories')
        .update({ status: newStatus })
        .eq('id', category.id)

      if (error) throw error
      await loadCategories()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Handle delete
  const handleDelete = async (category: Category) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${category.name}"?`)) {
      return
    }

    try {
      await deleteCategory(category.id)
      await loadCategories()
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการหมวดหมู่</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการหมวดหมู่การเรียนรู้ทั้งหมด</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาหมวดหมู่..."
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

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบหมวดหมู่</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="relative">
                {/* Action Menu */}
                <div className="absolute top-0 right-0">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuCategory(
                          actionMenuCategory === category.id ? null : category.id
                        )
                      }
                      className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    {actionMenuCategory === category.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuCategory(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                          <button
                            onClick={() => {
                              setEditingCategory(category)
                              setActionMenuCategory(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              toggleStatus(category)
                              setActionMenuCategory(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {category.status === 'published' ? (
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
                              handleDelete(category)
                              setActionMenuCategory(null)
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

              {/* Info */}
              <div className="pr-12">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderOpen className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{category.name}</h3>
                  </div>
                  {getStatusBadge(category.status)}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2 ml-7">{category.description}</p>
                )}
                <p className="text-xs text-gray-400 ml-7">
                  สร้างเมื่อ {formatDate(category.created_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCategoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadCategories}
      />

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          isOpen={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={loadCategories}
        />
      )}
    </div>
  )
}

