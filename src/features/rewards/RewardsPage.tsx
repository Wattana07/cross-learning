import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, Badge, Spinner, Button } from '@/components/ui'
import { Trophy, Flame, Star, Gift, ArrowUp, BookOpen, Award, RefreshCw } from 'lucide-react'
import { getMyWallet, getMyStreak, getMyTransactions, getPointRules } from './api'
import { awardRetroactivePoints } from './utils'
import { getLevelFromPoints, getNextLevelPoints, getProgressToNextLevel, formatPoints, getRelativeTime } from '@/lib/utils'
import type { PointTransaction, PointRule } from '@/lib/database.types'
import { useToast } from '@/contexts/ToastContext'

// Helper function to get transaction description
function getTransactionDescription(transaction: PointTransaction, rules: PointRule[]): string {
  const rule = rules.find((r) => r.key === transaction.rule_key)
  if (rule?.description) {
    return rule.description
  }

  // Fallback descriptions
  switch (transaction.rule_key) {
    case 'episode_complete':
      return 'จบบทเรียน'
    case 'subject_complete':
      return 'จบทั้งวิชา'
    case 'streak_3':
      return 'Streak 3 วัน'
    case 'streak_7':
      return 'Streak 7 วัน'
    default:
      return 'รับแต้ม'
  }
}

// Helper function to get transaction icon
function getTransactionIcon(ruleKey: string) {
  switch (ruleKey) {
    case 'episode_complete':
      return <BookOpen className="w-5 h-5" />
    case 'subject_complete':
      return <Award className="w-5 h-5" />
    case 'streak_3':
    case 'streak_7':
      return <Flame className="w-5 h-5" />
    default:
      return <Star className="w-5 h-5" />
  }
}

export function RewardsPage() {
  // Fetch data
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['rewards', 'wallet'],
    queryFn: getMyWallet,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: ['rewards', 'streak'],
    queryFn: getMyStreak,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['rewards', 'transactions'],
    queryFn: () => getMyTransactions(50),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['rewards', 'rules'],
    queryFn: getPointRules,
    staleTime: 1000 * 60 * 10, // 10 minutes (rules don't change often)
  })

  const isLoading = walletLoading || streakLoading || transactionsLoading || rulesLoading

  // Calculate values
  const totalPoints = wallet?.total_points ?? 0
  const level = wallet?.level ?? getLevelFromPoints(totalPoints)
  const nextLevelPoints = getNextLevelPoints(totalPoints)
  const progressPercent = getProgressToNextLevel(totalPoints)

  const currentStreak = streak?.current_streak ?? 0
  const maxStreak = streak?.max_streak ?? 0

  // Handle retroactive point awarding
  const handleAwardRetroactivePoints = async () => {
    if (!confirm('ต้องการให้แต้มย้อนหลังสำหรับบทเรียนที่เรียนจบแล้วหรือไม่?')) {
      return
    }

    setAwardingPoints(true)
    try {
      const result = await awardRetroactivePoints()
      if (result.totalAwarded > 0) {
        success(`✅ ได้รับแต้มย้อนหลังสำหรับ ${result.totalAwarded} บทเรียน!`, 5000)
        // Refresh wallet and transactions
        queryClient.invalidateQueries({ queryKey: ['rewards'] })
        queryClient.invalidateQueries({ queryKey: ['sidebar'] })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      } else {
        success('ไม่มีบทเรียนที่ต้องให้แต้มย้อนหลัง', 3000)
      }
      if (result.errors.length > 0) {
        console.error('Errors awarding points:', result.errors)
      }
    } catch (error: any) {
      console.error('Error awarding retroactive points:', error)
      showError('เกิดข้อผิดพลาดในการให้แต้มย้อนหลัง: ' + (error.message || 'Unknown error'))
    } finally {
      setAwardingPoints(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รางวัลและแต้มสะสม</h1>
          <p className="text-gray-500 mt-1">ดูแต้มสะสม, เลเวล และ streak ของคุณ</p>
        </div>
        <Button
          onClick={handleAwardRetroactivePoints}
          disabled={awardingPoints}
          variant="outline"
        >
          {awardingPoints ? (
            <>
              <Spinner size="sm" className="mr-2" />
              กำลังให้แต้ม...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              ให้แต้มย้อนหลัง
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Points & Level */}
        <Card variant="elevated" className="md:col-span-2">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">แต้มสะสมทั้งหมด</p>
              <p className="text-4xl font-bold text-gray-900">{formatPoints(totalPoints)}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Level {level}</span>
                  <span className="text-gray-400">{formatPoints(totalPoints)}/{formatPoints(nextLevelPoints)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  อีก {formatPoints(nextLevelPoints - totalPoints)} แต้มถึง Level {level + 1}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Streak */}
        <Card variant="elevated">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <p className="text-sm text-gray-500">Streak ปัจจุบัน</p>
            <p className="text-3xl font-bold text-gray-900">{currentStreak} วัน</p>
            <p className="text-xs text-gray-400 mt-2">สูงสุด: {maxStreak} วัน</p>
          </div>
        </Card>
      </div>

      {/* Point Rules */}
      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">วิธีรับแต้ม</h2>
        {rules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">ยังไม่มีการตั้งกติกาแต้ม</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const iconColor =
                rule.key === 'episode_complete'
                  ? 'bg-green-100 text-green-600'
                  : rule.key === 'subject_complete'
                  ? 'bg-blue-100 text-blue-600'
                  : rule.key === 'streak_3'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-red-100 text-red-600'

              const icon =
                rule.key === 'episode_complete' ? (
                  <BookOpen className="w-5 h-5" />
                ) : rule.key === 'subject_complete' ? (
                  <Award className="w-5 h-5" />
                ) : (
                  <Flame className="w-5 h-5" />
                )

              return (
                <div key={rule.key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center`}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rule.description || rule.key}</p>
                    <p className="text-sm text-gray-500">+{formatPoints(rule.points)} แต้ม</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Transactions */}
      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ประวัติแต้ม</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">ยังไม่มีประวัติแต้ม</p>
            <p className="text-sm text-gray-400 mt-1">เริ่มเรียนเพื่อสะสมแต้ม!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const description = getTransactionDescription(transaction, rules)
              const iconColor =
                transaction.rule_key === 'episode_complete'
                  ? 'bg-green-100 text-green-600'
                  : transaction.rule_key === 'subject_complete'
                  ? 'bg-blue-100 text-blue-600'
                  : transaction.rule_key === 'streak_3'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-red-100 text-red-600'

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center`}>
                      {getTransactionIcon(transaction.rule_key)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{description}</p>
                      <p className="text-sm text-gray-500">{getRelativeTime(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-bold text-green-600">+{formatPoints(transaction.points)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

