import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { CreateRoomTypeModal } from './CreateRoomTypeModal'
import { EditRoomTypeModal } from './EditRoomTypeModal'
import {
  Tag,
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
import { cn, formatDate } from '@/lib/utils'
import { fetchRoomTypes, deleteRoomType, type RoomType } from './api'

export function AdminRoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null)
  const [actionMenuRoomType, setActionMenuRoomType] = useState<string | null>(null)

  // Fetch room types
  const loadRoomTypes = async () => {
    setLoading(true)
    try {
      const data = await fetchRoomTypes()
      setRoomTypes(data)
    } catch (error: any) {
      console.error('Error fetching room types:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoomTypes()
  }, [])

  // Filter by search and status
  const filteredRoomTypes = roomTypes.filter((roomType) => {
    const matchesSearch = !searchQuery || roomType.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      roomType.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && roomType.is_active) ||
      (statusFilter === 'inactive' && !roomType.is_active)
    return matchesSearch && matchesStatus
  })

  // Toggle active status
  const toggleActive = async (roomType: RoomType) => {
    try {
      const { error } = await supabase
        .from('room_types')
        .update({ is_active: !roomType.is_active })
        .eq('id', roomType.id)

      if (error) throw error
      await loadRoomTypes()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Handle delete
  const handleDelete = async (roomType: RoomType) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบประเภทของห้องประชุม "${roomType.name}"?`)) {
      return
    }

    try {
      await deleteRoomType(roomType.id)
      await loadRoomTypes()
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการประเภทของห้องประชุม</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการประเภทของห้องประชุมทั้งหมด</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มประเภท
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาประเภท..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
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

      {/* Room Types Grid */}
      {filteredRoomTypes.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบประเภทของห้องประชุม</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoomTypes.map((roomType) => (
            <Card key={roomType.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="relative">
                {/* Action Menu */}
                <div className="absolute top-0 right-0">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuRoomType(
                          actionMenuRoomType === roomType.id ? null : roomType.id
                        )
                      }
                      className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    {actionMenuRoomType === roomType.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuRoomType(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                          <button
                            onClick={() => {
                              setEditingRoomType(roomType)
                              setActionMenuRoomType(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              toggleActive(roomType)
                              setActionMenuRoomType(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {roomType.is_active ? (
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
                              handleDelete(roomType)
                              setActionMenuRoomType(null)
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
                    <Tag className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{roomType.name}</h3>
                  </div>
                  {roomType.is_active ? (
                    <Badge variant="success">ใช้งาน</Badge>
                  ) : (
                    <Badge variant="danger">ไม่ใช้งาน</Badge>
                  )}
                </div>
                {roomType.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2 ml-7">{roomType.description}</p>
                )}
                <p className="text-xs text-gray-400 ml-7">
                  สร้างเมื่อ {formatDate(roomType.created_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateRoomTypeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadRoomTypes}
      />

      {editingRoomType && (
        <EditRoomTypeModal
          roomType={editingRoomType}
          isOpen={!!editingRoomType}
          onClose={() => setEditingRoomType(null)}
          onSuccess={loadRoomTypes}
        />
      )}
    </div>
  )
}

