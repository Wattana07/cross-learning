import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import { EditRuleModal } from './EditRuleModal'
import {
  Trophy,
  Edit,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react'
import type { PointRule } from '@/lib/database.types'
import { formatDate } from '@/lib/utils'
import { fetchPointRules, updatePointRule } from './api'

export function AdminRewardsPage() {
  const [rules, setRules] = useState<PointRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingRule, setEditingRule] = useState<PointRule | null>(null)

  // Fetch rules
  const loadRules = async () => {
    setLoading(true)
    try {
      const data = await fetchPointRules()
      setRules(data)
    } catch (error: any) {
      console.error('Error fetching point rules:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  // Filter by search and status
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      !searchQuery ||
      rule.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.points.toString().includes(searchQuery)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && rule.is_active) ||
      (statusFilter === 'inactive' && !rule.is_active)
    return matchesSearch && matchesStatus
  })

  // Toggle active status
  const toggleActive = async (rule: PointRule) => {
    try {
      await updatePointRule(rule.key, { is_active: !rule.is_active })
      await loadRules()
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  // Get rule display name in Thai
  const getRuleDisplayName = (key: string): string => {
    const names: Record<string, string> = {
      episode_complete: 'จบบทเรียน',
      subject_complete: 'จบทั้งวิชา',
      streak_3: 'เรียนต่อเนื่อง 3 วัน',
      streak_7: 'เรียนต่อเนื่อง 7 วัน',
    }
    return names[key] || key
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการกติกาแต้ม</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการกฎการให้แต้มสำหรับกิจกรรมต่างๆ</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหากฎการให้แต้ม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Rules Table */}
      {filteredRules.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่พบกฎการให้แต้ม</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    กฎการให้แต้ม
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    คำอธิบาย
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    แต้ม
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    อัพเดทล่าสุด
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRules.map((rule) => (
                  <tr key={rule.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getRuleDisplayName(rule.key)}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{rule.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {rule.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="warning" className="text-base font-semibold">
                        {rule.points} แต้ม
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rule.is_active ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          ใช้งาน
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          ปิดใช้งาน
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(rule.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(rule)}
                        >
                          {rule.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setEditingRule(rule)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          แก้ไข
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          isOpen={!!editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={loadRules}
        />
      )}
    </div>
  )
}

