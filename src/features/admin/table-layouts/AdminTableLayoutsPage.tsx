import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { CreateTableLayoutModal } from './CreateTableLayoutModal'
import { EditTableLayoutModal } from './EditTableLayoutModal'
import { fetchRoomCategories } from '../room-categories/api'
import type { RoomCategory } from '../room-categories/api'
import {
  LayoutGrid,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Image as ImageIcon,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { fetchTableLayouts, deleteTableLayout, type TableLayout } from './api'

export function AdminTableLayoutsPage() {
  const [layouts, setLayouts] = useState<TableLayout[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLayout, setEditingLayout] = useState<TableLayout | null>(null)
  const [actionMenuLayout, setActionMenuLayout] = useState<string | null>(null)

  // Fetch layouts
  const loadLayouts = async () => {
    setLoading(true)
    try {
      const data = await fetchTableLayouts()
      setLayouts(data)
    } catch (error: any) {
      console.error('Error fetching table layouts:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories
  const loadCategories = async () => {
    try {
      const data = await fetchRoomCategories()
      setCategories(data.map(cat => ({ id: cat.id, name: cat.name })))
    } catch (error: any) {
      console.error('Error fetching room categories:', error)
    }
  }

  useEffect(() => {
    loadCategories()
    loadLayouts()
  }, [])

  // Filter by search, category, and status
  const filteredLayouts = layouts.filter((layout) => {
    const matchesSearch = !searchQuery || layout.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      layout.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || layout.room_category_id === categoryFilter
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && layout.is_active) ||
      (statusFilter === 'inactive' && !layout.is_active)
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'ไม่ทราบหมวดหมู่'
  }

  // Toggle active status
  const toggleActive = async (layout: TableLayout) => {
    try {
      const { error } = await supabase
        .from('table_layouts')
        .update({ is_active: !layout.is_active })
        .eq('id', layout.id)

      if (error) throw error
      await loadLayouts()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Handle delete
  const handleDelete = async (layout: TableLayout) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรูปแบบการจัดโต๊ะ "${layout.name}"?`)) {
      return
    }

    try {
      await deleteTableLayout(layout.id)
      await loadLayouts()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการรูปแบบการจัดโต๊ะ</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการรูปแบบการจัดโต๊ะสำหรับแต่ละหมวดหมู่</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มรูปแบบ
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหารูปแบบการจัดโต๊ะ..."
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
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ไม่ใช้งาน</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Layouts Grid */}
      {filteredLayouts.length === 0 ? (
        <Card className="p-12 text-center">
          <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบรูปแบบการจัดโต๊ะ</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLayouts.map((layout) => (
            <Card key={layout.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="relative">
                {/* Action Menu */}
                <div className="absolute top-0 right-0">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuLayout(
                          actionMenuLayout === layout.id ? null : layout.id
                        )
                      }
                      className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    {actionMenuLayout === layout.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuLayout(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                          <button
                            onClick={() => {
                              setEditingLayout(layout)
                              setActionMenuLayout(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              toggleActive(layout)
                              setActionMenuLayout(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {layout.is_active ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                ปิดใช้งาน
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                เปิดใช้งาน
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(layout)
                              setActionMenuLayout(null)
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

              {/* Image */}
              {layout.image_url && (
                <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32">
                  <img
                    src={layout.image_url}
                    alt={layout.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="pr-12">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <LayoutGrid className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{layout.name}</h3>
                  </div>
                  {layout.is_active ? (
                    <Badge variant="success">ใช้งาน</Badge>
                  ) : (
                    <Badge variant="danger">ไม่ใช้งาน</Badge>
                  )}
                </div>
                <p className="text-xs text-primary-600 mb-2 ml-7">
                  {getCategoryName(layout.room_category_id)}
                </p>
                {layout.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2 ml-7">{layout.description}</p>
                )}
                <div className="flex items-center gap-4 ml-7 mb-2">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>สูงสุด {layout.max_capacity} คน</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 ml-7">
                  สร้างเมื่อ {formatDate(layout.created_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTableLayoutModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadLayouts}
        categories={categories}
      />

      {editingLayout && (
        <EditTableLayoutModal
          layout={editingLayout}
          isOpen={!!editingLayout}
          onClose={() => setEditingLayout(null)}
          onSuccess={loadLayouts}
          categories={categories}
        />
      )}
    </div>
  )
}

