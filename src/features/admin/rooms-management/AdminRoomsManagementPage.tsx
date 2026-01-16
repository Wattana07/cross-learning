import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { CreateRoomModal } from './CreateRoomModal'
import { EditRoomModal } from './EditRoomModal'
import { fetchRoomCategories } from '../room-categories/api'
import { fetchRoomTypes } from '../room-types/api'
import {
  DoorOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Users,
  Settings,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { fetchRooms, deleteRoom, type RoomWithRelations } from './api'
import type { RoomStatus } from '@/lib/database.types'

export function AdminRoomsManagementPage() {
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | RoomStatus>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomWithRelations | null>(null)
  const [actionMenuRoom, setActionMenuRoom] = useState<string | null>(null)

  // Fetch rooms
  const loadRooms = async () => {
    setLoading(true)
    try {
      const data = await fetchRooms()
      setRooms(data)
    } catch (error: any) {
      console.error('Error fetching rooms:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories and types
  const loadCategoriesAndTypes = async () => {
    try {
      const [categoriesData, typesData] = await Promise.all([
        fetchRoomCategories(),
        fetchRoomTypes(),
      ])
      setCategories(categoriesData.map(cat => ({ id: cat.id, name: cat.name })))
      setRoomTypes(typesData.map(type => ({ id: type.id, name: type.name })))
    } catch (error: any) {
      console.error('Error fetching categories/types:', error)
    }
  }

  useEffect(() => {
    loadCategoriesAndTypes()
    loadRooms()
  }, [])

  // Filter by search and status
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = !searchQuery || 
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      room.location?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Toggle status
  const toggleStatus = async (room: RoomWithRelations) => {
    const newStatus: RoomStatus = room.status === 'active' ? 'maintenance' : 'active'
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status: newStatus })
        .eq('id', room.id)

      if (error) throw error
      await loadRooms()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Handle delete
  const handleDelete = async (room: RoomWithRelations) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้องประชุม "${room.name}"?`)) {
      return
    }

    try {
      await deleteRoom(room.id)
      await loadRooms()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">ใช้งาน</Badge>
      case 'maintenance':
        return <Badge variant="warning">ซ่อมบำรุง</Badge>
      default:
        return <Badge variant="danger">ไม่ทราบ</Badge>
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการห้องประชุม</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการห้องประชุมทั้งหมด</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มห้องประชุม
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาห้องประชุม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | RoomStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="maintenance">ซ่อมบำรุง</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <Card className="p-12 text-center">
          <DoorOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบห้องประชุม</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="relative">
                {/* Action Menu */}
                <div className="absolute top-0 right-0">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuRoom(
                          actionMenuRoom === room.id ? null : room.id
                        )
                      }
                      className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    {actionMenuRoom === room.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuRoom(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-dropdown border border-gray-100 py-2 z-20">
                          <button
                            onClick={() => {
                              setEditingRoom(room)
                              setActionMenuRoom(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              toggleStatus(room)
                              setActionMenuRoom(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4" />
                            {room.status === 'active' ? 'ปิดใช้งานชั่วคราว' : 'เปิดใช้งาน'}
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(room)
                              setActionMenuRoom(null)
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
                    <DoorOpen className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{room.name}</h3>
                  </div>
                  {getStatusBadge(room.status)}
                </div>

                {room.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2 ml-7">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{room.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 ml-7 mb-2">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>ความจุ {room.capacity} คน</span>
                  </div>
                </div>

                {(room.room_category_name || room.room_type_name || room.table_layout_name) && (
                  <div className="ml-7 mb-2 space-y-1">
                    {room.room_category_name && (
                      <p className="text-xs text-primary-600">หมวดหมู่: {room.room_category_name}</p>
                    )}
                    {room.room_type_name && (
                      <p className="text-xs text-primary-600">ประเภท: {room.room_type_name}</p>
                    )}
                    {room.table_layout_name && (
                      <p className="text-xs text-primary-600">รูปแบบ: {room.table_layout_name}</p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 ml-7">
                  สร้างเมื่อ {formatDate(room.created_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadRooms}
        categories={categories}
        roomTypes={roomTypes}
      />

      {editingRoom && (
        <EditRoomModal
          room={editingRoom}
          isOpen={!!editingRoom}
          onClose={() => setEditingRoom(null)}
          onSuccess={loadRooms}
          categories={categories}
          roomTypes={roomTypes}
        />
      )}
    </div>
  )
}

