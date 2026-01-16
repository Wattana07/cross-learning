import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner, Modal, ModalFooter } from '@/components/ui'
import { Plus, Edit, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { fetchActiveRooms } from '@/features/rooms/api'
import type { RoomWithDetails } from '@/features/rooms/api'
import { useToast } from '@/contexts/ToastContext'

interface RoomBlock {
  id: string
  room_id: string
  start_at: string
  end_at: string
  reason: string | null
  created_at: string
  room?: {
    name: string
  }
}

export function AdminRoomBlocksPage() {
  const { success, error: showError } = useToast()
  const [blocks, setBlocks] = useState<RoomBlock[]>([])
  const [rooms, setRooms] = useState<RoomWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState<RoomBlock | null>(null)
  const [deletingBlock, setDeletingBlock] = useState<RoomBlock | null>(null)

  const [formData, setFormData] = useState({
    room_id: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    reason: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [roomsData, { data: blocksData, error }] = await Promise.all([
        fetchActiveRooms(),
        supabase
          .from('room_blocks')
          .select(`
            *,
            room:rooms!inner(name)
          `)
          .order('start_at', { ascending: false }),
      ])

      if (error) throw error
      setRooms(roomsData)
      setBlocks((blocksData || []) as RoomBlock[])
    } catch (error: any) {
      console.error('Error loading data:', error)
      showError('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setFormData({
      room_id: '',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      reason: '',
    })
    setShowCreateModal(true)
  }

  const handleOpenEdit = (block: RoomBlock) => {
    const startDate = new Date(block.start_at)
    const endDate = new Date(block.end_at)
    
    setFormData({
      room_id: block.room_id,
      start_date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split('T')[0],
      end_time: endDate.toTimeString().slice(0, 5),
      reason: block.reason || '',
    })
    setEditingBlock(block)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.room_id || !formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
      showError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`)
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}:00`)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      showError('รูปแบบวันที่หรือเวลาไม่ถูกต้อง')
      return
    }

    if (endDateTime <= startDateTime) {
      showError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      return
    }

    try {
      const data: any = {
        room_id: formData.room_id,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
      }

      if (formData.reason.trim()) {
        data.reason = formData.reason.trim()
      }

      if (editingBlock) {
        const { error } = await supabase
          .from('room_blocks')
          .update(data)
          .eq('id', editingBlock.id)

        if (error) throw error
        success('แก้ไขการบล็อกสำเร็จ')
      } else {
        const { error } = await supabase
          .from('room_blocks')
          .insert(data)

        if (error) throw error
        success('เพิ่มการบล็อกสำเร็จ')
      }

      loadData()
      setShowCreateModal(false)
      setEditingBlock(null)
      setFormData({
        room_id: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        reason: '',
      })
    } catch (error: any) {
      console.error('Error saving block:', error)
      showError('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (!deletingBlock) return

    try {
      const { error } = await supabase
        .from('room_blocks')
        .delete()
        .eq('id', deletingBlock.id)

      if (error) throw error
      success('ลบการบล็อกสำเร็จ')
      loadData()
      setDeletingBlock(null)
    } catch (error: any) {
      console.error('Error deleting block:', error)
      showError('เกิดข้อผิดพลาด: ' + error.message)
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
          <h2 className="text-xl font-bold text-gray-900">จัดการการบล็อกช่วงเวลา</h2>
          <p className="text-sm text-gray-500 mt-1">บล็อกช่วงเวลาที่ไม่สามารถจองได้</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          เพิ่มการบล็อก
        </Button>
      </div>

      {/* Blocks List */}
      <Card variant="elevated" padding="lg">
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ยังไม่มีการบล็อกช่วงเวลา</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => {
              const startDate = new Date(block.start_at)
              const endDate = new Date(block.end_at)
              const room = rooms.find(r => r.id === block.room_id)

              return (
                <Card key={block.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {room?.name || 'ไม่พบห้อง'}
                        </h3>
                        <Badge variant="warning">บล็อก</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(startDate.toISOString())} {startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            ถึง {formatDate(endDate.toISOString())} {endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {block.reason && (
                          <p className="text-gray-500 mt-2">{block.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Edit className="w-4 h-4" />}
                        onClick={() => handleOpenEdit(block)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => setDeletingBlock(block)}
                      >
                        ลบ
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || editingBlock !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingBlock(null)
          setFormData({
            room_id: '',
            start_date: '',
            start_time: '',
            end_date: '',
            end_time: '',
            reason: '',
          })
        }}
        title={editingBlock ? 'แก้ไขการบล็อก' : 'เพิ่มการบล็อก'}
        description={editingBlock ? 'แก้ไขข้อมูลการบล็อกช่วงเวลา' : 'บล็อกช่วงเวลาที่ไม่สามารถจองได้'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              ห้องประชุม <span className="text-danger-500">*</span>
            </label>
            <select
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">-- เลือกห้อง --</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                วันที่เริ่มต้น <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                เวลาเริ่มต้น <span className="text-danger-500">*</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                วันที่สิ้นสุด <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                เวลาสิ้นสุด <span className="text-danger-500">*</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              เหตุผล (ไม่บังคับ)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="ระบุเหตุผลในการบล็อก..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setEditingBlock(null)
                setFormData({
                  room_id: '',
                  start_date: '',
                  start_time: '',
                  end_date: '',
                  end_time: '',
                  reason: '',
                })
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit">
              {editingBlock ? 'บันทึกการแก้ไข' : 'เพิ่มการบล็อก'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingBlock !== null}
        onClose={() => setDeletingBlock(null)}
        title="ยืนยันการลบ"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบการบล็อกนี้?"
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeletingBlock(null)}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            ลบ
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

