import { useState } from 'react'
import { Card } from '@/components/ui'
import { AdminRoomCategoriesPage } from '../room-categories'
import { AdminTableLayoutsPage } from '../table-layouts'
import { AdminRoomTypesPage } from '../room-types'
import { AdminRoomsManagementPage } from '../rooms-management'
import { AdminBookingsPage } from '../bookings'
import { AdminRoomBlocksPage } from '../room-blocks/AdminRoomBlocksPage'
import { DoorOpen, FolderOpen, LayoutGrid, Tag, Calendar, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'categories' | 'layouts' | 'types' | 'rooms' | 'bookings' | 'blocks'

export function AdminRoomsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings')

  const tabs = [
    { id: 'categories' as TabType, name: 'หมวดหมู่ห้องประชุม', icon: FolderOpen },
    { id: 'layouts' as TabType, name: 'รูปแบบการจัดโต๊ะ', icon: LayoutGrid },
    { id: 'types' as TabType, name: 'ประเภทของห้องประชุม', icon: Tag },
    { id: 'rooms' as TabType, name: 'ห้องประชุม', icon: DoorOpen },
    { id: 'bookings' as TabType, name: 'การจอง', icon: Calendar },
    { id: 'blocks' as TabType, name: 'บล็อกช่วงเวลา', icon: Ban },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการห้องประชุม</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการระบบห้องประชุมทั้งหมด</p>
      </div>

      {/* Tabs */}
      <Card className="p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'categories' && <AdminRoomCategoriesPage />}
        {activeTab === 'layouts' && <AdminTableLayoutsPage />}
        {activeTab === 'types' && <AdminRoomTypesPage />}
        {activeTab === 'rooms' && <AdminRoomsManagementPage />}
        {activeTab === 'bookings' && <AdminBookingsPage />}
        {activeTab === 'blocks' && <AdminRoomBlocksPage />}
      </div>
    </div>
  )
}

