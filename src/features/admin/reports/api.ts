import { supabase } from '@/lib/supabaseClient'

export interface UserReport {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  learners: number
  admins: number
  newUsersThisMonth: number
  newUsersThisWeek: number
  usersByDepartment: Array<{ department: string; count: number }>
}

export interface LearningReport {
  totalEpisodes: number
  completedEpisodes: number
  totalProgress: number
  averageProgress: number
  topSubjects: Array<{ subject_id: string; subject_title: string; completed_count: number }>
  topUsers: Array<{ user_id: string; user_name: string; completed_count: number }>
}

export interface BookingReport {
  totalBookings: number
  approvedBookings: number
  pendingBookings: number
  cancelledBookings: number
  bookingsThisMonth: number
  bookingsThisWeek: number
  topRooms: Array<{ room_id: string; room_name: string; booking_count: number }>
  bookingsByStatus: Array<{ status: string; count: number }>
}

export interface PointsReport {
  totalPoints: number
  averagePoints: number
  topUsers: Array<{ user_id: string; user_name: string; total_points: number; level: number }>
  usersByLevel: Array<{ level: number; count: number }>
  topStreaks: Array<{ user_id: string; user_name: string; current_streak: number; max_streak: number }>
}

// Fetch User Reports
export async function fetchUserReports(): Promise<UserReport> {
  try {
    // Fetch all user data
    const { data: allUsers, error } = await supabase
      .from('profiles')
      .select('id, role, is_active, department, created_at')

    if (error) throw error

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalUsers = allUsers?.length || 0
    const activeUsers = allUsers?.filter(u => u.is_active).length || 0
    const inactiveUsers = totalUsers - activeUsers
    const learners = allUsers?.filter(u => u.role === 'learner').length || 0
    const admins = allUsers?.filter(u => u.role === 'admin').length || 0
    
    const newUsersThisWeek = allUsers?.filter(u => {
      const created = new Date(u.created_at)
      return created >= oneWeekAgo
    }).length || 0

    const newUsersThisMonth = allUsers?.filter(u => {
      const created = new Date(u.created_at)
      return created >= oneMonthAgo
    }).length || 0

    // Group by department
    const departmentMap = new Map<string, number>()
    allUsers?.forEach(user => {
      const dept = user.department || 'ไม่ระบุ'
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1)
    })

    const usersByDepartment = Array.from(departmentMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      learners,
      admins,
      newUsersThisMonth,
      newUsersThisWeek,
      usersByDepartment,
    }
  } catch (error) {
    console.error('Error fetching user reports:', error)
    throw error
  }
}

// Fetch Learning Reports
export async function fetchLearningReports(): Promise<LearningReport> {
  try {
    // Fetch all published episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('status', 'published')

    if (episodesError) throw episodesError

    const totalEpisodes = episodes?.length || 0

    // Fetch all progress
    const { data: progress, error: progressError } = await supabase
      .from('user_episode_progress')
      .select('episode_id, watched_percent, completed_at')

    if (progressError) throw progressError

    const completedEpisodes = progress?.filter(
      p => p.completed_at !== null || (p.watched_percent || 0) >= 90
    ).length || 0

    // Calculate total progress
    const totalProgress = progress?.reduce((sum, p) => sum + (p.watched_percent || 0), 0) || 0
    const averageProgress = progress && progress.length > 0 
      ? totalProgress / progress.length 
      : 0

    // Get top subjects by completion
    const episodeToSubject = new Map<string, string>()
    if (episodes) {
      const episodeIds = episodes.map(e => e.id)
      const { data: subjectsData } = await supabase
        .from('episodes')
        .select('id, subject_id, subjects!inner(title)')
        .in('id', episodeIds)

      subjectsData?.forEach((ep: any) => {
        episodeToSubject.set(ep.id, ep.subject_id)
      })
    }

    // Count completions by subject
    const subjectCompletions = new Map<string, { count: number; title: string }>()
    progress?.forEach(p => {
      const subjectId = episodeToSubject.get(p.episode_id)
      if (subjectId && (p.completed_at || (p.watched_percent || 0) >= 90)) {
        const current = subjectCompletions.get(subjectId) || { count: 0, title: 'Unknown' }
        subjectCompletions.set(subjectId, { count: current.count + 1, title: current.title })
      }
    })

    // Fetch subject titles
    const subjectIds = Array.from(subjectCompletions.keys())
    if (subjectIds.length > 0) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, title')
        .in('id', subjectIds)

      subjects?.forEach(sub => {
        const current = subjectCompletions.get(sub.id)
        if (current) {
          subjectCompletions.set(sub.id, { ...current, title: sub.title })
        }
      })
    }

    const topSubjects = Array.from(subjectCompletions.entries())
      .map(([subject_id, data]) => ({
        subject_id,
        subject_title: data.title,
        completed_count: data.count,
      }))
      .sort((a, b) => b.completed_count - a.completed_count)
      .slice(0, 10)

    // Get top users by completion
    const userCompletions = new Map<string, number>()
    progress?.forEach(p => {
      if (p.completed_at || (p.watched_percent || 0) >= 90) {
        // We need to get user_id from progress, but it's not in the select
        // For now, skip this or fetch separately
      }
    })

    // Fetch user progress separately
    const { data: userProgress } = await supabase
      .from('user_episode_progress')
      .select('user_id, completed_at, watched_percent')
      .or('completed_at.not.is.null,watched_percent.gte.90')

    const userCompletionCounts = new Map<string, number>()
    userProgress?.forEach(p => {
      userCompletionCounts.set(
        p.user_id,
        (userCompletionCounts.get(p.user_id) || 0) + 1
      )
    })

    // Get user names
    const userIds = Array.from(userCompletionCounts.keys()).slice(0, 10)
    let topUsers: Array<{ user_id: string; user_name: string; completed_count: number }> = []

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      topUsers = userIds
        .map(userId => ({
          user_id: userId,
          user_name: users?.find(u => u.id === userId)?.full_name || 'Unknown',
          completed_count: userCompletionCounts.get(userId) || 0,
        }))
        .sort((a, b) => b.completed_count - a.completed_count)
        .slice(0, 10)
    }

    return {
      totalEpisodes,
      completedEpisodes,
      totalProgress,
      averageProgress: Math.round(averageProgress * 100) / 100,
      topSubjects,
      topUsers,
    }
  } catch (error) {
    console.error('Error fetching learning reports:', error)
    throw error
  }
}

// Fetch Booking Reports
export async function fetchBookingReports(): Promise<BookingReport> {
  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch all bookings
    const { data: bookings, error } = await supabase
      .from('room_bookings')
      .select('id, status, room_id, created_at')

    if (error) throw error

    const totalBookings = bookings?.length || 0
    const approvedBookings = bookings?.filter(b => b.status === 'approved').length || 0
    const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0

    const bookingsThisWeek = bookings?.filter(b => {
      const created = new Date(b.created_at)
      return created >= oneWeekAgo
    }).length || 0

    const bookingsThisMonth = bookings?.filter(b => {
      const created = new Date(b.created_at)
      return created >= oneMonthAgo
    }).length || 0

    // Count by room
    const roomCounts = new Map<string, number>()
    bookings?.forEach(b => {
      if (b.room_id) {
        roomCounts.set(b.room_id, (roomCounts.get(b.room_id) || 0) + 1)
      }
    })

    // Get room names
    const roomIds = Array.from(roomCounts.keys())
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name')
      .in('id', roomIds)

    const topRooms = roomIds
      .map(roomId => ({
        room_id: roomId,
        room_name: rooms?.find(r => r.id === roomId)?.name || 'Unknown',
        booking_count: roomCounts.get(roomId) || 0,
      }))
      .sort((a, b) => b.booking_count - a.booking_count)
      .slice(0, 10)

    // Count by status
    const statusCounts = new Map<string, number>()
    bookings?.forEach(b => {
      statusCounts.set(b.status, (statusCounts.get(b.status) || 0) + 1)
    })

    const bookingsByStatus = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))

    return {
      totalBookings,
      approvedBookings,
      pendingBookings,
      cancelledBookings,
      bookingsThisMonth,
      bookingsThisWeek,
      topRooms,
      bookingsByStatus,
    }
  } catch (error) {
    console.error('Error fetching booking reports:', error)
    throw error
  }
}

// Fetch Points Reports
export async function fetchPointsReports(): Promise<PointsReport> {
  try {
    // Fetch all wallets
    const { data: wallets, error } = await supabase
      .from('user_wallet')
      .select('user_id, total_points, level')

    if (error) throw error

    const totalPoints = wallets?.reduce((sum, w) => sum + (w.total_points || 0), 0) || 0
    const averagePoints = wallets && wallets.length > 0
      ? Math.round((totalPoints / wallets.length) * 100) / 100
      : 0

    // Get top users
    const sortedWallets = [...(wallets || [])]
      .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
      .slice(0, 10)

    const userIds = sortedWallets.map(w => w.user_id)
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const topUsers = sortedWallets.map(wallet => ({
      user_id: wallet.user_id,
      user_name: users?.find(u => u.id === wallet.user_id)?.full_name || 'Unknown',
      total_points: wallet.total_points || 0,
      level: wallet.level || 1,
    }))

    // Count by level
    const levelCounts = new Map<number, number>()
    wallets?.forEach(w => {
      const level = w.level || 1
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1)
    })

    const usersByLevel = Array.from(levelCounts.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level)

    // Fetch streaks
    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('user_id, current_streak, max_streak')
      .order('current_streak', { ascending: false })
      .limit(10)

    const streakUserIds = streaks?.map(s => s.user_id) || []
    const { data: streakUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', streakUserIds)

    const topStreaks = streaks?.map(streak => ({
      user_id: streak.user_id,
      user_name: streakUsers?.find(u => u.id === streak.user_id)?.full_name || 'Unknown',
      current_streak: streak.current_streak || 0,
      max_streak: streak.max_streak || 0,
    })) || []

    return {
      totalPoints,
      averagePoints,
      topUsers,
      usersByLevel,
      topStreaks,
    }
  } catch (error) {
    console.error('Error fetching points reports:', error)
    throw error
  }
}

