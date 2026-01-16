import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import { Button, Input } from '@/components/ui'
import type { PointRule } from '@/lib/database.types'
import { updatePointRule } from './api'

interface EditRuleModalProps {
  rule: PointRule
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditRuleModal({ rule, isOpen, onClose, onSuccess }: EditRuleModalProps) {
  const [points, setPoints] = useState(rule.points.toString())
  const [description, setDescription] = useState(rule.description || '')
  const [isActive, setIsActive] = useState(rule.is_active)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && rule) {
      setPoints(rule.points.toString())
      setDescription(rule.description || '')
      setIsActive(rule.is_active)
    }
  }, [isOpen, rule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const pointsNum = parseInt(points, 10)
    if (isNaN(pointsNum) || pointsNum < 0) {
      alert('กรุณากรอกจำนวนแต้มที่ถูกต้อง (ต้องเป็นตัวเลขและไม่ติดลบ)')
      return
    }

    setLoading(true)
    try {
      await updatePointRule(rule.key, {
        points: pointsNum,
        description: description.trim() || null,
        is_active: isActive,
      })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error updating point rule:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขกฎการให้แต้ม">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rule Key (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสกฎ (ไม่สามารถแก้ไขได้)
          </label>
          <Input
            value={rule.key}
            disabled
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Display Name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อกฎ
          </label>
          <Input
            value={getRuleDisplayName(rule.key)}
            disabled
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Points */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนแต้ม <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="เช่น 10"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            คำอธิบาย
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Is Active */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            เปิดใช้งานกฎนี้
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

