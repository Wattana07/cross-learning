import { supabase } from '@/lib/supabaseClient'
import type { RoomBooking, BookingStatus } from '@/lib/database.types'

export interface BookingWithDetails extends RoomBooking {
  room_name?: string
  room_location?: string
  booker_name?: string
  booker_email?: string
}

type RoomLite = { id: string; name: string | null; location: string | null }
type ProfileLite = { id: string; full_name: string | null; email: string | null }

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))))
}

function toMapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(i => [i.id, i]))
}

// ไม่ต้องใช้ function นี้แล้ว - ใช้ Database Webhook แทน
// Webhook จะส่งอีเมลอัตโนมัติเมื่อ status เปลี่ยนเป็น 'approved'

export interface FetchBookingsOptions {
  limit?: number
  offset?: number
  status?: BookingStatus
  searchQuery?: string
}

export interface FetchBookingsResult {
  bookings: BookingWithDetails[]
  total: number
}

export async function fetchAllBookings(options: FetchBookingsOptions = {}): Promise<FetchBookingsResult> {
  const { limit = 50, offset = 0, status, searchQuery } = options
  
  // Build query with filters
  let query = supabase
    .from('room_bookings')
    .select('*', { count: 'exact' })
    .order('start_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  // If search query, we'll filter after fetching (or use full-text search if available)
  // For now, fetch and filter client-side for simplicity
  const { data: bookings, error: bookingsError, count } = await query

  if (bookingsError) throw bookingsError
  if (!bookings?.length) return { bookings: [], total: count || 0 }

  const bookingsTyped = bookings as RoomBooking[]
  
  // Apply search filter if provided
  let filteredBookings = bookingsTyped
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filteredBookings = bookingsTyped.filter(b => 
      b.title?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    )
  }

  const roomIds = uniqueStrings(filteredBookings.map(b => b.room_id))
  const userIds = uniqueStrings(filteredBookings.map(b => b.booked_by_user_id))

  const [roomsRes, profilesRes] = await Promise.all([
    roomIds.length
      ? supabase.from('rooms').select('id, name, location').in('id', roomIds)
      : Promise.resolve({ data: [] as RoomLite[], error: null as any }),
    userIds.length
      ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
      : Promise.resolve({ data: [] as ProfileLite[], error: null as any }),
  ])

  if (roomsRes.error) console.error('Error fetching rooms:', roomsRes.error)
  if (profilesRes.error) console.error('Error fetching profiles:', profilesRes.error)

  const roomsMap = toMapById((roomsRes.data ?? []) as RoomLite[])
  const profilesMap = toMapById((profilesRes.data ?? []) as ProfileLite[])

  const bookingsWithDetails = filteredBookings.map(booking => {
    const room = booking.room_id ? roomsMap.get(booking.room_id) : undefined
    const booker = booking.booked_by_user_id
      ? profilesMap.get(booking.booked_by_user_id)
      : undefined

    return {
      ...booking,
      room_name: room?.name ?? undefined,
      room_location: room?.location ?? undefined,
      booker_name: booker?.full_name ?? undefined,
      booker_email: booker?.email ?? undefined,
    }
  })

  return {
    bookings: bookingsWithDetails,
    total: count || 0
  }
}

async function sendBookingApprovalEmail(bookingId: string): Promise<void> {
  console.log('[DEBUG] sendBookingApprovalEmail called with bookingId:', bookingId)
  
  try {
    // ลองเรียก function โดยตรงผ่าน fetch ก่อน เพื่อดู response จริง
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    console.log('[DEBUG] Calling notify-booking-approval function...')
    console.log('[DEBUG] Function name: notify-booking-approval')
    console.log('[DEBUG] Supabase URL:', supabaseUrl)
    console.log('[DEBUG] Has session token:', !!token)
    console.log('[DEBUG] Request body:', { bookingId })
    
    // เรียก function โดยตรงผ่าน fetch เพื่อดู response จริง
    const functionUrl = `${supabaseUrl}/functions/v1/notify-booking-approval`
    console.log('[DEBUG] Function URL:', functionUrl)
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || anonKey}`,
        'apikey': anonKey || '',
      },
      body: JSON.stringify({ bookingId }),
    })
    
    console.log('[DEBUG] Response status:', response.status)
    console.log('[DEBUG] Response statusText:', response.statusText)
    console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('[DEBUG] Response body (raw):', responseText)
    
    if (!response.ok) {
      console.error('[ERROR] Function returned non-2xx status:', response.status)
      console.error('[ERROR] Response body:', responseText)
      
      // พยายาม parse JSON ถ้าเป็นไปได้
      try {
        const errorJson = JSON.parse(responseText)
        console.error('[ERROR] Parsed error:', errorJson)
      } catch (e) {
        console.error('[ERROR] Cannot parse error as JSON')
      }
      
      // ไม่ throw error - ให้ status update สำเร็จแม้อีเมลจะล้มเหลว
      return
    }
    
    // Parse response
    let responseData: any = null
    try {
      responseData = JSON.parse(responseText)
      console.log('[SUCCESS] notify-booking-approval success:', responseData)
      console.log('[SUCCESS] Email notification sent successfully')
    } catch (e) {
      console.log('[SUCCESS] Response (not JSON):', responseText)
    }
    
  } catch (e: any) {
    console.error('[EXCEPTION] notify-booking-approval exception:', e)
    console.error('[EXCEPTION] Exception type:', e?.constructor?.name)
    console.error('[EXCEPTION] Exception message:', e?.message)
    console.error('[EXCEPTION] Exception stack:', e?.stack)
    
    // ไม่ throw error - ให้ status update สำเร็จแม้อีเมลจะล้มเหลว
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<RoomBooking> {
  // @ts-ignore - Supabase type inference issue with update
  const { data, error } = await supabase
    .from('room_bookings')
    // @ts-ignore
    .update({ status })
    .eq('id', bookingId)
    .select('*')
    .single()

  if (error) throw error
  if (!data) throw new Error('Booking not found or not accessible (RLS?)')

  const booking = data as RoomBooking

  // Email sending disabled - system continues to work without email notifications
  console.log('[DEBUG] Booking status updated. Email sending is disabled.')

  return booking
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('room_bookings').delete().eq('id', bookingId)
  if (error) throw error
}
