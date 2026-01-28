import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { AdminLayout } from '@/app/layout/AdminLayout'
import { RequireAuth } from '@/app/guards/RequireAuth'
import { RequireAdmin } from '@/app/guards/RequireAdmin'

// Auth
import { LoginPage } from '@/features/auth/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'

// Test pages
import { HmpmLoginTestPage } from '@/features/test/HmpmLoginTestPage'
import { HmpmApiTestPage } from '@/features/test/HmpmApiTestPage'

// Learner pages
import { DashboardPage } from '@/features/learning/pages/DashboardPage'
import { CategoriesPage } from '@/features/learning/pages/CategoriesPage'
import { SubjectsPage } from '@/features/learning/pages/SubjectsPage'
import { SubjectDetailPage } from '@/features/learning/pages/SubjectDetailPage'
import { EpisodePlayerPage } from '@/features/learning/pages/EpisodePlayerPage'
import { RewardsPage } from '@/features/rewards/RewardsPage'
import { RoomsPage } from '@/features/rooms/RoomsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { SettingsPage } from '@/features/settings'
import { ActivityFeedPage } from '@/features/activity'

// Admin pages
import { AdminDashboard } from '@/features/admin/dashboard/AdminDashboard'
import { AdminUsersPage } from '@/features/admin/users/AdminUsersPage'
import { AdminCategoriesPage } from '@/features/admin/categories'
import { AdminSubjectsPage } from '@/features/admin/subjects'
import { AdminEpisodesPage } from '@/features/admin/episodes'
import { AdminRewardsPage } from '@/features/admin/rewards'
import { AdminRoomsPage } from '@/features/admin/rooms'
import { ApiTestPage } from '@/features/admin/api-test'
import { AdminReportsPage } from '@/features/admin/reports'
import { AdminLogsPage } from '@/features/admin/logs'
import { AdminStatusPage } from '@/features/admin/status'

// Placeholder pages for routes that aren't implemented yet
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500">หน้านี้กำลังพัฒนา</p>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/test-hmpm-login',
    element: <HmpmLoginTestPage />,
  },
  {
    path: '/test-hmpm-api',
    element: <HmpmApiTestPage />,
  },

  // Protected learner routes
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'categories/:categoryId', element: <SubjectsPage /> },
      { path: 'subjects/:subjectId', element: <SubjectDetailPage /> },
      { path: 'subjects/:subjectId/episodes/:episodeId', element: <EpisodePlayerPage /> },
      { path: 'messages', element: <PlaceholderPage title="ข้อความ" /> },
      { path: 'online-courses', element: <PlaceholderPage title="คอร์สออนไลน์" /> },
      { path: 'assignments', element: <PlaceholderPage title="งานที่ได้รับมอบหมาย" /> },
      { path: 'payment', element: <PlaceholderPage title="การชำระเงิน" /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'activity', element: <ActivityFeedPage /> },
      { path: 'rewards', element: <RewardsPage /> },
      { path: 'rooms', element: <RoomsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // Admin routes
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'subjects', element: <AdminSubjectsPage /> },
      { path: 'episodes', element: <AdminEpisodesPage /> },
      { path: 'rewards', element: <AdminRewardsPage /> },
      { path: 'rooms', element: <AdminRoomsPage /> },
      { path: 'api-test', element: <ApiTestPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'logs', element: <AdminLogsPage /> },
      { path: 'status', element: <AdminStatusPage /> },
    ],
  },

  // Catch all - redirect to home
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export function Router() {
  return <RouterProvider router={router} />
}

