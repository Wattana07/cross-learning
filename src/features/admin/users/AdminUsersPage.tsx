import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Avatar, Spinner, Modal, ModalFooter } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { CreateUserModal } from './CreateUserModal'
import { EditUserModal } from './EditUserModal'
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  KeyRound,
  UserX,
  UserCheck,
  Mail,
  Building,
  Trash2,
} from 'lucide-react'
import type { Profile } from '@/lib/database.types'
import { cn, formatDate } from '@/lib/utils'

export function AdminUsersPage() {
  const { success, error: showError } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'learner'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resettingPasswordUser, setResettingPasswordUser] = useState<Profile | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active')
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, statusFilter])

  // Filter by search
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(q) ||
      user.full_name?.toLowerCase().includes(q) ||
      user.department?.toLowerCase().includes(q)
    )
  })

  // Toggle user status
  const toggleUserStatus = async (user: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)

      if (error) throw error
      success(user.is_active ? 'ระงับผู้ใช้สำเร็จ' : 'เปิดใช้งานผู้ใช้สำเร็จ')
      fetchUsers()
    } catch (error: any) {
      console.error('Error toggling user status:', error)
      showError('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถเปลี่ยนสถานะได้'))
    }
    setActionMenuUser(null)
  }

  // Reset user password
  const resetUserPassword = async (user: Profile) => {
    setResettingPassword(true)
    setResettingPasswordUser(user)
    setNewPassword(null)
    try {
      const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || 're_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K';
      let siteUrl = 'https://cross-learning.vercel.app';
      
      if (import.meta.env.VITE_SITE_URL && !import.meta.env.VITE_SITE_URL.includes('localhost')) {
        siteUrl = import.meta.env.VITE_SITE_URL;
      } else if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
        siteUrl = window.location.origin;
      }
      
      if (siteUrl && !siteUrl.startsWith('https://')) {
        siteUrl = siteUrl.replace(/^http:\/\//, 'https://');
      }
      siteUrl = siteUrl.replace(/\/$/, '');

      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: user.id,
          resendApiKey: resendApiKey,
          siteUrl: siteUrl,
        },
      })

      if (error) throw error
      
      if (!data.ok) {
        const errorMessages: Record<string, string> = {
          NOT_ADMIN: 'คุณไม่มีสิทธิ์ในการรีเซ็ตรหัสผ่าน',
          MISSING_USER_ID: 'ไม่พบ ID ผู้ใช้',
          USER_NOT_FOUND: 'ไม่พบผู้ใช้',
          UPDATE_FAILED: 'เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน',
        }
        throw new Error(errorMessages[data.reason] || data.reason || 'เกิดข้อผิดพลาด')
      }

      setNewPassword(data.password)
      success(`รีเซ็ตรหัสผ่านสำเร็จ! รหัสผ่านใหม่ถูกส่งไปยังอีเมล ${user.email} แล้ว`)
      setActionMenuUser(null)
    } catch (error: any) {
      console.error('Error resetting password:', error)
      showError(error.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้')
      setResettingPasswordUser(null)
    } finally {
      setResettingPassword(false)
    }
  }

  // Delete user
  const deleteUser = async (user: Profile) => {
    setDeleting(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      })

      if (error) throw error
      
      if (!data.ok) {
        const errorMessages: Record<string, string> = {
          NOT_ADMIN: 'คุณไม่มีสิทธิ์ในการลบผู้ใช้',
          MISSING_USER_ID: 'ไม่พบ ID ผู้ใช้',
          CANNOT_DELETE_SELF: 'ไม่สามารถลบบัญชีของตนเองได้',
          USER_NOT_FOUND: 'ไม่พบผู้ใช้',
          PROFILE_DELETE_ERROR: 'เกิดข้อผิดพลาดในการลบ profile',
          AUTH_DELETE_ERROR: 'เกิดข้อผิดพลาดในการลบ auth user',
        }
        throw new Error(errorMessages[data.reason] || data.reason || 'เกิดข้อผิดพลาด')
      }

      success(`ลบผู้ใช้ "${user.full_name || user.email}" สำเร็จ`)
      setDeletingUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      showError(error.message || 'ไม่สามารถลบผู้ใช้ได้')
    } finally {
      setDeleting(false)
      setActionMenuUser(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          <p className="text-gray-500 mt-1">เพิ่ม แก้ไข และจัดการผู้ใช้ในระบบ</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          เพิ่มผู้ใช้ใหม่
        </Button>
      </div>

      {/* Filters */}
      <Card variant="bordered" padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="ค้นหาชื่อ, อีเมล, แผนก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุก Role</option>
              <option value="admin">Admin</option>
              <option value="learner">Learner</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ระงับ</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card variant="elevated" padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ไม่พบผู้ใช้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    ผู้ใช้
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    แผนก
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Role
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    สถานะ
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    สร้างเมื่อ
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatar_path}
                          name={user.full_name}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.full_name || 'ไม่ระบุชื่อ'}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {user.department || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.role === 'admin' ? 'primary' : 'default'}
                        size="sm"
                      >
                        {user.role === 'admin' ? 'Admin' : 'Learner'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.is_active ? 'success' : 'danger'}
                        size="sm"
                      >
                        {user.is_active ? 'ใช้งาน' : 'ระงับ'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 relative">
                        <button
                          onClick={() =>
                            setActionMenuUser(
                              actionMenuUser === user.id ? null : user.id
                            )
                          }
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>

                        {/* Action Menu */}
                        {actionMenuUser === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setActionMenuUser(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-dropdown border border-gray-100 py-2 z-50">
                              <button
                                onClick={() => {
                                  setEditingUser(user)
                                  setActionMenuUser(null)
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                แก้ไขข้อมูล
                              </button>
                              <button
                                onClick={() => toggleUserStatus(user)}
                                className={cn(
                                  'flex items-center gap-3 w-full px-4 py-2 text-sm',
                                  user.is_active
                                    ? 'text-danger-600 hover:bg-danger-50'
                                    : 'text-success-600 hover:bg-green-50'
                                )}
                              >
                                {user.is_active ? (
                                  <>
                                    <UserX className="w-4 h-4" />
                                    ระงับผู้ใช้
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    เปิดใช้งาน
                                  </>
                                )}
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => {
                                  setDeletingUser(user)
                                  setActionMenuUser(null)
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                ลบบัญชี
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-500">ผู้ใช้ทั้งหมด</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.is_active).length}
              </p>
              <p className="text-sm text-gray-500">ใช้งานอยู่</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.role === 'learner').length}
              </p>
              <p className="text-sm text-gray-500">Learners</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.role === 'admin').length}
              </p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchUsers()
        }}
      />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            fetchUsers()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingUser !== null}
        onClose={() => {
          if (!deleting) {
            setDeletingUser(null)
          }
        }}
        title="ยืนยันการลบบัญชี"
        description="การลบบัญชีจะไม่สามารถกู้คืนได้"
      >
        {deletingUser && (
          <div className="space-y-4">
            {deleting ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Spinner size="lg" />
                <p className="mt-4 text-sm font-medium text-gray-700">กำลังลบบัญชี...</p>
                <p className="mt-1 text-xs text-gray-500">กรุณารอสักครู่ กำลังลบข้อมูลทั้งหมด</p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-danger-50 border border-danger-200">
                  <p className="text-sm text-danger-800 font-medium mb-2">
                    ⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีนี้?
                  </p>
                  <div className="text-sm text-danger-700 space-y-1">
                    <p><strong>ชื่อ:</strong> {deletingUser.full_name || 'ไม่ระบุชื่อ'}</p>
                    <p><strong>อีเมล:</strong> {deletingUser.email}</p>
                    <p><strong>Role:</strong> {deletingUser.role === 'admin' ? 'Admin' : 'Learner'}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm font-medium text-gray-800 mb-2">
                    การลบบัญชีจะลบข้อมูลทั้งหมดของผู้ใช้ รวมถึง:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                    <li>ข้อมูลโปรไฟล์</li>
                    <li>ประวัติการเรียน</li>
                    <li>แต้มและรางวัล</li>
                    <li>การจองห้องประชุม</li>
                  </ul>
                </div>
                <ModalFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setDeletingUser(null)}
                    disabled={deleting}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => deleteUser(deletingUser)}
                    loading={deleting}
                    disabled={deleting}
                  >
                    ลบบัญชี
                  </Button>
                </ModalFooter>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

