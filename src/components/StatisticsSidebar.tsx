import { useAuthContext } from '@/contexts/AuthContext'
import { Card } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { Flame, BookOpen, TrendingUp } from 'lucide-react'
import { useStatistics } from '@/hooks/useStatistics'
import { Link } from 'react-router-dom'

export function StatisticsSidebar() {
  const { profile } = useAuthContext()
  const { activityData, progressPercent, currentStreak } = useStatistics()

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'สวัสดีตอนเช้า'
    if (hour < 18) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  }

  // Calculate max value for chart
  const maxValue = Math.max(...activityData, 1)
  const chartHeight = 120

  return (
    <aside className="hidden xl:block fixed right-0 top-0 bottom-0 w-80 p-6 space-y-6 border-l border-gray-200 bg-white overflow-y-auto">
      {/* User Profile with Progress Ring */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="relative w-24 h-24">
            {/* Progress Ring */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="48"
                cy="48"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progressPercent / 100)}`}
                className="text-primary-600"
                strokeLinecap="round"
              />
            </svg>
            {/* Avatar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar
                src={profile?.avatar_path}
                name={profile?.full_name}
                size="xl"
                className="w-20 h-20"
              />
            </div>
            {/* Progress Badge */}
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {Math.round(progressPercent)}%
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center justify-center gap-2">
            {getGreeting()} {profile?.full_name?.split(' ')[0] || 'ผู้ใช้'}
            {currentStreak > 0 && <Flame className="w-4 h-4 text-primary-600" />}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            เรียนต่อเพื่อไปถึงเป้าหมายของคุณ!
          </p>
        </div>
      </div>

      {/* Statistics Chart */}
      <Card variant="bordered" padding="sm" className="bg-primary-50/50">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">สถิติการเรียน</h4>
          <p className="text-xs text-gray-500">กิจกรรม 30 วันที่ผ่านมา</p>
        </div>

        {/* Bar Chart */}
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 h-full flex items-end gap-3">
            {activityData.map((value, index) => {
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0
              const periods = ['1-10', '11-20', '21-30']
              const currentDate = new Date()
              const monthNames = [
                'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
              ]
              const month = monthNames[currentDate.getMonth()]

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  {/* Bar */}
                  <div className="w-full flex gap-1 items-end justify-center" style={{ height: '100%' }}>
                    <div
                      className="w-full bg-primary-400 rounded-t transition-all hover:bg-primary-500"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                      title={`${value} กิจกรรม`}
                    />
                  </div>
                  {/* X-axis label */}
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {periods[index]} {month}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Recommended Subjects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900">แนะนำวิชา</h4>
          <Link
            to="/categories"
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="space-y-3">
          {/* Placeholder - จะดึงจาก API จริง */}
          <Card variant="bordered" padding="none" className="p-3 bg-primary-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  เริ่มเรียนวันนี้
                </p>
                <p className="text-xs text-gray-500">เลือกวิชาที่สนใจ</p>
              </div>
            </div>
          </Card>

          <Link to="/categories">
            <Card variant="bordered" padding="none" className="p-3 hover:bg-primary-50/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    ดูหมวดหมู่ทั้งหมด
                  </p>
                  <p className="text-xs text-gray-500">เลือกวิชาที่คุณสนใจ</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </aside>
  )
}

