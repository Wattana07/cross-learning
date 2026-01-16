import { useState } from 'react'
import { Card, Spinner, Badge, Button } from '@/components/ui'
import {
  Users,
  BookOpen,
  DoorOpen,
  Trophy,
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchUserReports,
  fetchLearningReports,
  fetchBookingReports,
  fetchPointsReports,
  type UserReport,
  type LearningReport,
  type BookingReport,
  type PointsReport,
} from './api'
import { formatDate } from '@/lib/utils'
import { exportToCSV, exportToExcel, exportToPDF, formatDateForExport, formatDateTimeForExport } from '@/lib/export-utils'

type TabType = 'users' | 'learning' | 'bookings' | 'points'

export function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users')

  // Fetch reports
  const { data: userReport, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['admin-reports-users'],
    queryFn: fetchUserReports,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const { data: learningReport, isLoading: learningLoading, refetch: refetchLearning } = useQuery({
    queryKey: ['admin-reports-learning'],
    queryFn: fetchLearningReports,
    staleTime: 1000 * 60 * 5,
  })

  const { data: bookingReport, isLoading: bookingLoading, refetch: refetchBooking } = useQuery({
    queryKey: ['admin-reports-booking'],
    queryFn: fetchBookingReports,
    staleTime: 1000 * 60 * 5,
  })

  const { data: pointsReport, isLoading: pointsLoading, refetch: refetchPoints } = useQuery({
    queryKey: ['admin-reports-points'],
    queryFn: fetchPointsReports,
    staleTime: 1000 * 60 * 5,
  })

  const isLoading = userLoading || learningLoading || bookingLoading || pointsLoading

  const tabs = [
    { id: 'users' as TabType, name: 'รายงานผู้ใช้', icon: Users },
    { id: 'learning' as TabType, name: 'รายงานการเรียน', icon: BookOpen },
    { id: 'bookings' as TabType, name: 'รายงานการจองห้อง', icon: DoorOpen },
    { id: 'points' as TabType, name: 'รายงานแต้ม', icon: Trophy },
  ]

  const handleRefresh = () => {
    if (activeTab === 'users') refetchUser()
    else if (activeTab === 'learning') refetchLearning()
    else if (activeTab === 'bookings') refetchBooking()
    else if (activeTab === 'points') refetchPoints()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-gray-500 mt-1">ดูสถิติและรายงานต่างๆ ของระบบ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const reportId = `report-${activeTab}`
              const titles: Record<TabType, string> = {
                users: 'รายงานผู้ใช้',
                learning: 'รายงานการเรียน',
                bookings: 'รายงานการจองห้อง',
                points: 'รายงานแต้ม',
              }
              exportToPDF(reportId, `รายงาน-${titles[activeTab]}`, titles[activeTab])
            }}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            รีเฟรชข้อมูล
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <div>
          {activeTab === 'users' && userReport && (
            <UserReportsView report={userReport} onExportCSV={() => {
              const csvData = [
                { 'รายการ': 'ผู้ใช้ทั้งหมด', 'จำนวน': userReport.totalUsers },
                { 'รายการ': 'ผู้ใช้ที่ใช้งาน', 'จำนวน': userReport.activeUsers },
                { 'รายการ': 'ผู้ใช้ที่ไม่ได้ใช้งาน', 'จำนวน': userReport.inactiveUsers },
                { 'รายการ': 'ผู้เรียน', 'จำนวน': userReport.learners },
                { 'รายการ': 'ผู้ดูแลระบบ', 'จำนวน': userReport.admins },
                { 'รายการ': 'ผู้ใช้ใหม่สัปดาห์นี้', 'จำนวน': userReport.newUsersThisWeek },
                { 'รายการ': 'ผู้ใช้ใหม่เดือนนี้', 'จำนวน': userReport.newUsersThisMonth },
                ...userReport.usersByDepartment.map(dept => ({
                  'รายการ': `แผนก: ${dept.department}`,
                  'จำนวน': dept.count,
                })),
              ]
              exportToCSV(csvData, `รายงานผู้ใช้-${formatDateForExport(new Date())}`)
            }} />
          )}
          {activeTab === 'learning' && learningReport && (
            <LearningReportsView report={learningReport} />
          )}
          {activeTab === 'bookings' && bookingReport && (
            <BookingReportsView report={bookingReport} />
          )}
          {activeTab === 'points' && pointsReport && <PointsReportsView report={pointsReport} />}
        </div>
      )}
    </div>
  )
}

// User Reports View
function UserReportsView({ report, onExportCSV }: { report: UserReport; onExportCSV?: () => void }) {
  return (
    <div id="report-users" className="space-y-6">
      {onExportCSV && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={onExportCSV} leftIcon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ผู้ใช้ที่ใช้งาน</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{report.activeUsers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ผู้เรียน</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{report.learners}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ผู้ดูแลระบบ</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{report.admins}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Growth Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ผู้ใช้ใหม่</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">สัปดาห์นี้</span>
              <span className="text-xl font-bold text-gray-900">{report.newUsersThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">เดือนนี้</span>
              <span className="text-xl font-bold text-gray-900">{report.newUsersThisMonth}</span>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ผู้ใช้ตามแผนก</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {report.usersByDepartment.length > 0 ? (
              report.usersByDepartment.map((dept, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-gray-700">{dept.department}</span>
                  <Badge variant="primary">{dept.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// Learning Reports View
function LearningReportsView({ report }: { report: LearningReport }) {
  return (
    <div id="report-learning" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">บทเรียนทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.totalEpisodes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">บทเรียนที่เสร็จสิ้น</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{report.completedEpisodes}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ความคืบหน้าเฉลี่ย</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">
                {report.averageProgress.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Subjects and Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">วิชายอดนิยม</h3>
          <div className="space-y-2">
            {report.topSubjects.length > 0 ? (
              report.topSubjects.map((subject, index) => (
                <div key={subject.subject_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">#{index + 1}</span>
                    <span className="text-gray-700">{subject.subject_title}</span>
                  </div>
                  <Badge variant="primary">{subject.completed_count} ครั้ง</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
            )}
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ผู้ใช้ที่เรียนมากที่สุด</h3>
          <div className="space-y-2">
            {report.topUsers.length > 0 ? (
              report.topUsers.map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">#{index + 1}</span>
                    <span className="text-gray-700">{user.user_name}</span>
                  </div>
                  <Badge variant="success">{user.completed_count} บท</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// Booking Reports View
function BookingReportsView({ report }: { report: BookingReport }) {
  const statusLabels: Record<string, string> = {
    approved: 'อนุมัติ',
    pending: 'รออนุมัติ',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก',
  }

  return (
    <div id="report-bookings" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">การจองทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.totalBookings}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">อนุมัติ</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{report.approvedBookings}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">รออนุมัติ</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{report.pendingBookings}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ยกเลิก</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{report.cancelledBookings}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <DoorOpen className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Growth and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">การจองล่าสุด</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">สัปดาห์นี้</span>
              <span className="text-xl font-bold text-gray-900">{report.bookingsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">เดือนนี้</span>
              <span className="text-xl font-bold text-gray-900">{report.bookingsThisMonth}</span>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะการจอง</h3>
          <div className="space-y-2">
            {report.bookingsByStatus.map((status, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-gray-700">{statusLabels[status.status] || status.status}</span>
                <Badge variant="primary">{status.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Rooms */}
      <Card variant="bordered" className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ห้องที่จองมากที่สุด</h3>
        <div className="space-y-2">
          {report.topRooms.length > 0 ? (
            report.topRooms.map((room, index) => (
              <div key={room.room_id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">#{index + 1}</span>
                  <span className="text-gray-700">{room.room_name}</span>
                </div>
                <Badge variant="primary">{room.booking_count} ครั้ง</Badge>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
          )}
        </div>
      </Card>
    </div>
  )
}

// Points Reports View
function PointsReportsView({ report }: { report: PointsReport }) {
  return (
    <div id="report-points" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">แต้มรวมทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {report.totalPoints.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">แต้มเฉลี่ย</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {report.averagePoints.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Users and Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ผู้ใช้ที่มีแต้มสูงสุด</h3>
          <div className="space-y-2">
            {report.topUsers.length > 0 ? (
              report.topUsers.map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">#{index + 1}</span>
                    <div>
                      <p className="text-gray-900">{user.user_name}</p>
                      <p className="text-xs text-gray-500">Level {user.level}</p>
                    </div>
                  </div>
                  <Badge variant="primary">{user.total_points.toLocaleString()} แต้ม</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
            )}
          </div>
        </Card>

        <Card variant="bordered" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ผู้ใช้ตาม Level</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {report.usersByLevel.length > 0 ? (
              report.usersByLevel.map((level) => (
                <div key={level.level} className="flex items-center justify-between py-2">
                  <span className="text-gray-700">Level {level.level}</span>
                  <Badge variant="primary">{level.count} คน</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top Streaks */}
      <Card variant="bordered" className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Streak สูงสุด</h3>
        <div className="space-y-2">
          {report.topStreaks.length > 0 ? (
            report.topStreaks.map((streak, index) => (
              <div key={streak.user_id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">#{index + 1}</span>
                  <div>
                    <p className="text-gray-900">{streak.user_name}</p>
                    <p className="text-xs text-gray-500">
                      Max: {streak.max_streak} วัน | Current: {streak.current_streak} วัน
                    </p>
                  </div>
                </div>
                <Badge variant="success">{streak.current_streak} วัน</Badge>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">ไม่พบข้อมูล</p>
          )}
        </div>
      </Card>
    </div>
  )
}

