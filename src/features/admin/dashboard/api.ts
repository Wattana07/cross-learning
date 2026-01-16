import { supabase } from '@/lib/supabaseClient'

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalCategories: number
  totalSubjects: number
  totalEpisodes: number
  totalRooms: number
  bookingsToday: number
  newUsersThisWeek: number
}

export interface RecentUser {
  id: string
  full_name: string | null
  email: string
  department: string | null
  created_at: string
  avatar_path: string | null
}

export interface TodayBooking {
  id: string
  room_name: string
  user_name: string
  start_at: string
  end_at: string
  status: string
}

// Fetch dashboard statistics
export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    // Fetch all stats in parallel
    const [
      totalUsersResult,
      activeUsersResult,
      totalCategoriesResult,
      totalSubjectsResult,
      totalEpisodesResult,
      totalRoomsResult,
      bookingsTodayResult,
      newUsersThisWeekResult,
    ] = await Promise.all([
      // Total users (all roles)
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
      
      // Active users (is_active = true)
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      
      // Total categories (published)
      supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      
      // Total subjects (published)
      supabase
        .from('subjects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      
      // Total episodes (published)
      supabase
        .from('episodes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      
      // Total rooms (active)
      supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Bookings today (approved)
      supabase
        .from('room_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('start_at', new Date().toISOString().split('T')[0] + 'T00:00:00')
        .lt('start_at', new Date().toISOString().split('T')[0] + 'T23:59:59'),
      
      // New users this week
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('role', 'learner'),
    ])

    return {
      totalUsers: totalUsersResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      totalCategories: totalCategoriesResult.count || 0,
      totalSubjects: totalSubjectsResult.count || 0,
      totalEpisodes: totalEpisodesResult.count || 0,
      totalRooms: totalRoomsResult.count || 0,
      bookingsToday: bookingsTodayResult.count || 0,
      newUsersThisWeek: newUsersThisWeekResult.count || 0,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    // Return default values on error
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalCategories: 0,
      totalSubjects: 0,
      totalEpisodes: 0,
      totalRooms: 0,
      bookingsToday: 0,
      newUsersThisWeek: 0,
    }
  }
}

// Fetch recent users (last 5)
export async function fetchRecentUsers(): Promise<RecentUser[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, department, created_at, avatar_path')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching recent users:', error)
    return []
  }
}

// Fetch today's bookings
export async function fetchTodayBookings(): Promise<TodayBooking[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Fetch bookings first
    const { data: bookings, error: bookingsError } = await supabase
      .from('room_bookings')
      .select('id, start_at, end_at, status, room_id, booked_by_user_id')
      .eq('status', 'approved')
      .gte('start_at', `${today}T00:00:00`)
      .lt('start_at', `${today}T23:59:59`)
      .order('start_at', { ascending: true })
      .limit(10)

    if (bookingsError) throw bookingsError
    
    if (!bookings || bookings.length === 0) {
      return []
    }

    // Fetch rooms and profiles separately
    const roomIds = [...new Set(bookings.map((b: any) => b.room_id).filter(Boolean))]
    const userIds = [...new Set(bookings.map((b: any) => b.booked_by_user_id).filter(Boolean))]

    const [roomsResult, profilesResult] = await Promise.all([
      roomIds.length > 0 
        ? supabase.from('rooms').select('id, name').in('id', roomIds) 
        : { data: [], error: null },
      userIds.length > 0 
        ? supabase.from('profiles').select('id, full_name').in('id', userIds) 
        : { data: [], error: null },
    ])

    if (roomsResult.error) console.error('Error fetching rooms:', roomsResult.error)
    if (profilesResult.error) console.error('Error fetching profiles:', profilesResult.error)

    const roomsMap = new Map((roomsResult.data || []).map((r: any) => [r.id, r]))
    const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]))

    // Transform the data to match the interface
    return bookings.map((booking: any) => {
      const room = roomsMap.get(booking.room_id)
      const profile = profilesMap.get(booking.booked_by_user_id)
      
      return {
        id: booking.id,
        room_name: room?.name || 'Unknown Room',
        user_name: profile?.full_name || 'Unknown User',
        start_at: booking.start_at,
        end_at: booking.end_at,
        status: booking.status,
      }
    })
  } catch (error) {
    console.error('Error fetching today bookings:', error)
    return []
  }
}

