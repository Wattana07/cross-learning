import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/logger'
import type { Room, RoomBooking, BookingStatus } from '@/lib/database.types'

export interface RoomWithDetails extends Room {
  room_category_name?: string
  room_type_name?: string
  table_layout_name?: string
  table_layout_max_capacity?: number
}

// Fetch all active rooms
export async function fetchActiveRooms(): Promise<RoomWithDetails[]> {
  try {
    // Try with relations first
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_category:room_categories!left(name),
        room_type:room_types!left(name),
        table_layout:table_layouts!left(name, max_capacity)
      `)
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (error) {
      console.warn('Error fetching rooms with relations, trying without:', error)
      throw error
    }
    
    if (!data) return []
    
    return data.map((room: any) => ({
      ...room,
      room_category_name: room.room_category?.name,
      room_type_name: room.room_type?.name,
      table_layout_name: room.table_layout?.name,
      table_layout_max_capacity: room.table_layout?.max_capacity,
    }))
  } catch (error: any) {
    // Fallback if relations don't exist or fail
    console.warn('Falling back to simple room fetch:', error.message)
    const { data, error: simpleError } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true })
    
    if (simpleError) {
      console.error('Error fetching rooms:', simpleError)
      throw simpleError
    }
    
    if (!data) return []
    
    return data.map((room: any) => ({
      ...room,
      room_category_name: undefined,
      room_type_name: undefined,
      table_layout_name: undefined,
      table_layout_max_capacity: undefined,
    }))
  }
}

// Fetch my bookings
export async function fetchMyBookings(): Promise<RoomBooking[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('room_bookings')
    .select('*')
    .eq('booked_by_user_id', user.id)
    .order('start_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Fetch all bookings (for calendar view - everyone can see all bookings)
export async function fetchAllBookings(): Promise<RoomBooking[]> {
  const { data, error } = await supabase
    .from('room_bookings')
    .select('*')
    .order('start_at', { ascending: true })

  if (error) {
    console.error('Error fetching all bookings:', error)
    throw error
  }
  return data || []
}

// Fetch room categories (for frontend selection)
export async function fetchRoomCategories(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('room_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch table layouts by room category
export async function fetchTableLayoutsByCategory(categoryId: string): Promise<Array<{ id: string; name: string; max_capacity: number }>> {
  const { data, error } = await supabase
    .from('table_layouts')
    .select('id, name, max_capacity')
    .eq('room_category_id', categoryId)
    .eq('is_active', true)
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch table layouts by room
export async function fetchTableLayoutsByRoom(roomId: string): Promise<Array<{ id: string; name: string; max_capacity: number }>> {
  // First get the room's category
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('room_category_id')
    .eq('id', roomId)
    .single()

  if (roomError || !room?.room_category_id) return []

  return fetchTableLayoutsByCategory(room.room_category_id)
}

// Fetch rooms by category
export async function fetchRoomsByCategory(categoryId: string): Promise<RoomWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_category:room_categories!left(name),
        room_type:room_types!left(name),
        table_layout:table_layouts!left(name, max_capacity)
      `)
      .eq('status', 'active')
      .eq('room_category_id', categoryId)
      .order('name', { ascending: true })

    if (error) throw error
    
    if (!data) return []
    
    return data.map((room: any) => ({
      ...room,
      room_category_name: room.room_category?.name,
      room_type_name: room.room_type?.name,
      table_layout_name: room.table_layout?.name,
      table_layout_max_capacity: room.table_layout?.max_capacity,
    }))
  } catch (error: any) {
    // Fallback
    const { data, error: simpleError } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'active')
      .eq('room_category_id', categoryId)
      .order('name', { ascending: true })
    
    if (simpleError) throw simpleError
    return (data || []).map((room: any) => ({
      ...room,
      room_category_name: undefined,
      room_type_name: undefined,
      table_layout_name: undefined,
      table_layout_max_capacity: undefined,
    }))
  }
}

// Create booking (using Edge Function for server-side validation)
export async function createBooking(booking: {
  room_id: string
  title: string
  description?: string | null
  start_at: string
  end_at: string
  speaker_name?: string
  additional_equipment?: string
  email?: string
}): Promise<RoomBooking> {
  // ============================================
  // DEBUG: Step 1 - Check Environment Variables
  // ============================================
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  console.log('='.repeat(60))
  console.log('[DEBUG] Step 1: Environment Check')
  console.log('[DEBUG] VITE_SUPABASE_URL:', supabaseUrl)
  console.log('[DEBUG] VITE_SUPABASE_ANON_KEY (first 50 chars):', supabaseAnonKey?.substring(0, 50))
  console.log('[DEBUG] ANON_KEY starts with "eyJ"?:', supabaseAnonKey?.startsWith('eyJ'))
  console.log('[DEBUG] ANON_KEY length:', supabaseAnonKey?.length)

  // ============================================
  // DEBUG: Step 2 - Check User Authentication
  // ============================================
  console.log('[DEBUG] Step 2: Checking user authentication...')
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('[DEBUG] User:', user ? { id: user.id, email: user.email } : 'null')
  console.log('[DEBUG] User error:', userError)
  
  if (!user) throw new Error('User not authenticated')

  // ============================================
  // DEBUG: Step 3 - Check Session/Token
  // ============================================
  console.log('[DEBUG] Step 3: Getting session...')
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  console.log('[DEBUG] Session exists:', !!sessionData?.session)
  console.log('[DEBUG] Session error:', sessionError)
  console.log('[DEBUG] Access token (first 50 chars):', sessionData?.session?.access_token?.substring(0, 50))
  console.log('[DEBUG] Token expires at:', sessionData?.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toISOString() : 'N/A')

  // Validate room_id is present
  if (!booking.room_id) {
    throw new Error('room_id is required')
  }

  // Build description with speaker, equipment, and email info
  let description = booking.description || ''
  const additionalInfo: string[] = []
  
  if (booking.email) {
    additionalInfo.push(`อีเมลติดต่อ: ${booking.email}`)
  }
  if (booking.speaker_name) {
    additionalInfo.push(`วิทยากร: ${booking.speaker_name}`)
  }
  if (booking.additional_equipment) {
    additionalInfo.push(`อุปกรณ์เพิ่มเติม: ${booking.additional_equipment}`)
  }
  
  if (additionalInfo.length > 0) {
    description = description 
      ? `${description}\n\n${additionalInfo.join('\n')}`
      : additionalInfo.join('\n')
  }

  // Get Resend API Key and site URL for email notifications
  const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || 're_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K';
  let siteUrl = 'https://cross-learning.vercel.app';
  
  if (import.meta.env.VITE_SITE_URL && !import.meta.env.VITE_SITE_URL.includes('localhost')) {
    siteUrl = import.meta.env.VITE_SITE_URL;
  } else if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
    siteUrl = window.location.origin;
  }
  
  if (siteUrl && !siteUrl.startsWith('https://')) {
    siteUrl = siteUrl.replace(/^http:\/\//, 'https://');
  }
  siteUrl = siteUrl.replace(/\/$/, '');

  // ============================================
  // DEBUG: Step 4 - Prepare Function Call
  // ============================================
  const functionUrl = `${supabaseUrl}/functions/v1/create-booking`
  const requestBody = {
    roomId: booking.room_id,
    title: booking.title,
    description: description || undefined,
    startAt: booking.start_at,
    endAt: booking.end_at,
    email: booking.email,
    resendApiKey: resendApiKey,
    siteUrl: siteUrl,
  }
  console.log('[DEBUG] Step 4: Preparing function call')
  console.log('[DEBUG] Function URL:', functionUrl)
  console.log('[DEBUG] Request body:', JSON.stringify(requestBody, null, 2))

  // ============================================
  // DEBUG: Step 5 - Test direct fetch FIRST
  // ============================================
  console.log('[DEBUG] Step 5: Testing direct fetch to Edge Function...')
  try {
    const directResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData?.session?.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(requestBody),
    })
    console.log('[DEBUG] Direct fetch status:', directResponse.status)
    console.log('[DEBUG] Direct fetch statusText:', directResponse.statusText)
    console.log('[DEBUG] Direct fetch headers:', Object.fromEntries(directResponse.headers.entries()))
    
    const directText = await directResponse.text()
    console.log('[DEBUG] Direct fetch response body:', directText)
    
    // If direct fetch worked, parse and return
    if (directResponse.ok) {
      try {
        const directData = JSON.parse(directText)
        console.log('[DEBUG] Direct fetch parsed data:', directData)
        
        if (directData.ok && directData.booking) {
          console.log('[DEBUG] SUCCESS via direct fetch!')
          await logger.success('booking_create', {
            resourceType: 'booking',
            resourceId: directData.booking.id,
            details: { room_id: booking.room_id, title: booking.title, start_at: booking.start_at },
          })
          return directData.booking
        } else if (!directData.ok) {
          // Handle business logic errors
          const reasonMessages: Record<string, string> = {
            'INVALID_TIME': 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
            'CANNOT_BOOK_PAST': 'ไม่สามารถจองเวลาในอดีตได้',
            'TOO_SOON': 'ต้องจองล่วงหน้าอย่างน้อย 7 วัน',
            'USER_INACTIVE': 'บัญชีผู้ใช้ถูกปิดการใช้งาน',
            'ROOM_NOT_FOUND': 'ไม่พบห้องประชุม',
            'ROOM_NOT_ACTIVE': 'ห้องประชุมไม่พร้อมใช้งาน',
            'BLOCKED': 'ช่วงเวลานี้ถูกบล็อกไว้',
            'TIME_CONFLICT': 'ช่วงเวลานี้มีการจองแล้ว',
            'INSERT_FAIL': 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
            'INSUFFICIENT_POINTS': `แต้มไม่พอ ต้องการ ${directData.required || 0} แต้ม แต่มีเพียง ${directData.available || 0} แต้ม`,
            'DAILY_LIMIT_EXCEEDED': `เกินขีดจำกัดรายวัน (จองได้ไม่เกิน 8 ชั่วโมงต่อวัน)`,
            'MONTHLY_LIMIT_EXCEEDED': `เกินขีดจำกัดรายเดือน (จองได้ไม่เกิน 20 ชั่วโมงต่อเดือน)`,
          }
          const errorMsg = reasonMessages[directData.reason] || directData.reason || 'เกิดข้อผิดพลาดในการจอง'
          throw new Error(errorMsg)
        }
      } catch (parseError) {
        console.log('[DEBUG] Direct fetch parse error:', parseError)
      }
    }
  } catch (fetchError: any) {
    console.log('[DEBUG] Direct fetch FAILED:', fetchError.message)
    console.log('[DEBUG] Fetch error details:', fetchError)
  }

  // ============================================
  // DEBUG: Step 6 - Call via Supabase SDK
  // ============================================
  console.log('[DEBUG] Step 6: Calling via supabase.functions.invoke...')
  const { data, error } = await supabase.functions.invoke('create-booking', {
    body: requestBody,
  })
  console.log('[DEBUG] SDK invoke data:', data)
  console.log('[DEBUG] SDK invoke error:', error)

  if (error) {
    // ============================================
    // DEBUG: Step 7 - Error Details
    // ============================================
    console.log('[DEBUG] Step 7: SDK invoke ERROR')
    console.log('[DEBUG] Error name:', error.name)
    console.log('[DEBUG] Error message:', error.message)
    console.log('[DEBUG] Error stack:', error.stack)
    console.log('[DEBUG] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.log('='.repeat(60))
    
    await logger.error('booking_create', {
      resourceType: 'booking',
      errorMessage: error.message,
      details: { room_id: booking.room_id, title: booking.title },
    })
    
    // Provide helpful error message for Edge Function connection issues
    if (error.message?.includes('Failed to send') || error.message?.includes('fetch failed') || error.message?.includes('NetworkError')) {
      throw new Error(
        'ไม่สามารถเชื่อมต่อกับ Edge Function ได้\n\n' +
        'วิธีแก้ไข:\n' +
        '1. ตรวจสอบว่า Edge Function "create-booking" ถูก deploy แล้ว\n' +
        '   - เปิด Terminal และรัน: npx supabase functions deploy create-booking\n' +
        '2. ตรวจสอบว่า Supabase Project ถูก link แล้ว\n' +
        '   - รัน: npx supabase link --project-ref wmfuzaahfdknfjvqwwsi\n' +
        '3. ตรวจสอบ Network Connection\n\n' +
        `Error: ${error.message}`
      )
    }
    
    throw error
  }
  
  if (!data.ok) {
    const reasonMessages: Record<string, string> = {
      'INVALID_TIME': 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
      'CANNOT_BOOK_PAST': 'ไม่สามารถจองเวลาในอดีตได้',
      'TOO_SOON': 'ต้องจองล่วงหน้าอย่างน้อย 7 วัน',
      'USER_INACTIVE': 'บัญชีผู้ใช้ถูกปิดการใช้งาน',
      'ROOM_NOT_FOUND': 'ไม่พบห้องประชุม',
      'ROOM_NOT_ACTIVE': 'ห้องประชุมไม่พร้อมใช้งาน',
      'BLOCKED': 'ช่วงเวลานี้ถูกบล็อกไว้',
      'TIME_CONFLICT': 'ช่วงเวลานี้มีการจองแล้ว',
      'INSERT_FAIL': 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      'INSUFFICIENT_POINTS': `แต้มไม่พอ ต้องการ ${data.required || 0} แต้ม แต่มีเพียง ${data.available || 0} แต้ม (${data.hours || 0} ชั่วโมง = ${data.required || 0} แต้ม)`,
      'DAILY_LIMIT_EXCEEDED': `เกินขีดจำกัดรายวัน (จองได้ไม่เกิน 8 ชั่วโมงต่อวัน) ปัจจุบัน: ${data.current || 0} ชั่วโมง, ต้องการ: ${data.requested || 0} ชั่วโมง`,
      'MONTHLY_LIMIT_EXCEEDED': `เกินขีดจำกัดรายเดือน (จองได้ไม่เกิน 20 ชั่วโมงต่อเดือน) ปัจจุบัน: ${data.current || 0} ชั่วโมง, ต้องการ: ${data.requested || 0} ชั่วโมง`,
    }
    const errorMsg = reasonMessages[data.reason] || data.reason || 'เกิดข้อผิดพลาดในการจอง'
    await logger.error('booking_create', {
      resourceType: 'booking',
      errorMessage: errorMsg,
      details: { room_id: booking.room_id, title: booking.title, reason: data.reason },
    })
    throw new Error(errorMsg)
  }

  await logger.success('booking_create', {
    resourceType: 'booking',
    resourceId: data.booking.id,
    details: { room_id: booking.room_id, title: booking.title, start_at: booking.start_at },
  })

  return data.booking
}

// Update booking (using Edge Function)
export async function updateBooking(booking: {
  bookingId: string
  title?: string
  description?: string
  start_at?: string
  end_at?: string
}): Promise<RoomBooking> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase.functions.invoke('update-booking', {
    body: {
      bookingId: booking.bookingId,
      title: booking.title,
      description: booking.description,
      startAt: booking.start_at,
      endAt: booking.end_at,
    },
  })

  if (error) {
    await logger.error('booking_update', {
      resourceType: 'booking',
      resourceId: booking.bookingId,
      errorMessage: error.message,
    })
    
    if (error.message?.includes('Failed to send') || error.message?.includes('fetch failed') || error.message?.includes('NetworkError')) {
      throw new Error(
        'ไม่สามารถเชื่อมต่อกับ Edge Function ได้\n\n' +
        'ตรวจสอบว่า Edge Function "update-booking" ถูก deploy แล้ว\n' +
        `Error: ${error.message}`
      )
    }
    
    throw error
  }
  
  if (!data.ok) {
    const reasonMessages: Record<string, string> = {
      'BOOKING_NOT_FOUND': 'ไม่พบการจอง',
      'NOT_OWNER': 'คุณไม่มีสิทธิ์แก้ไขการจองนี้',
      'TOO_LATE_TO_EDIT': 'ไม่สามารถแก้ไขได้ เนื่องจากเหลือเวลาไม่ถึง 2 ชั่วโมง',
      'BOOKING_NOT_ACTIVE': 'การจองนี้ไม่สามารถแก้ไขได้',
      'INVALID_TIME': 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
      'BLOCKED': 'ช่วงเวลานี้ถูกบล็อกไว้',
      'TIME_CONFLICT': 'ช่วงเวลานี้มีการจองแล้ว',
      'UPDATE_FAIL': 'เกิดข้อผิดพลาดในการอัปเดต',
      'INSUFFICIENT_POINTS': `แต้มไม่พอสำหรับการแก้ไข ต้องการ ${data.required || 0} แต้ม แต่มีเพียง ${data.available || 0} แต้ม`,
    }
    const errorMsg = reasonMessages[data.reason] || data.reason || 'เกิดข้อผิดพลาดในการแก้ไข'
    await logger.error('booking_update', {
      resourceType: 'booking',
      resourceId: booking.bookingId,
      errorMessage: errorMsg,
      details: { reason: data.reason },
    })
    throw new Error(errorMsg)
  }

  await logger.success('booking_update', {
    resourceType: 'booking',
    resourceId: booking.bookingId,
    details: { 
      title: booking.title,
      start_at: booking.start_at,
      end_at: booking.end_at,
    },
  })

  return data.booking
}

// Cancel booking (using Edge Function)
export async function cancelBooking(bookingId: string): Promise<RoomBooking> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase.functions.invoke('cancel-booking', {
    body: { bookingId },
  })

  if (error) {
    await logger.error('booking_cancel', {
      resourceType: 'booking',
      resourceId: bookingId,
      errorMessage: error.message,
    })
    
    if (error.message?.includes('Failed to send') || error.message?.includes('fetch failed') || error.message?.includes('NetworkError')) {
      throw new Error(
        'ไม่สามารถเชื่อมต่อกับ Edge Function ได้\n\n' +
        'ตรวจสอบว่า Edge Function "cancel-booking" ถูก deploy แล้ว\n' +
        `Error: ${error.message}`
      )
    }
    
    throw error
  }
  
  if (!data.ok) {
    const reasonMessages: Record<string, string> = {
      'BOOKING_NOT_FOUND': 'ไม่พบการจอง',
      'NOT_OWNER': 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้',
      'TOO_LATE_TO_CANCEL': 'ไม่สามารถยกเลิกได้ เนื่องจากเหลือเวลาไม่ถึง 1 ชั่วโมง',
      'ALREADY_CANCELLED': 'การจองนี้ถูกยกเลิกแล้ว',
      'CANCEL_FAIL': 'เกิดข้อผิดพลาดในการยกเลิก',
    }
    throw new Error(reasonMessages[data.reason] || data.reason || 'เกิดข้อผิดพลาดในการยกเลิก')
  }

  return data.booking
}

// Fetch room types
export async function fetchRoomTypes(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('room_types')
    .select('id, name')
    .eq('is_active', true)
    .order('order_no', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Calendar Event from Happy MPM
export interface CalendarEvent {
  id?: string
  date: string
  time?: string
  category?: string
  title: string
  description?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Fetch calendar events from Happy MPM Supabase
export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const SUPABASE_URL = 'https://efysmnckgicgojgskzoj.supabase.co'
  const SUPABASE_KEY = 'sb_publishable__oSW-E864aWhf63JKWZIHA_VkvKFpta'
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/calendar_events?select=*&is_active=eq.true&order=date.asc,time.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    )

    if (!response.ok) {
      console.warn('Error fetching calendar events:', response.statusText)
      return []
    }

    const data = await response.json()
    return data || []
  } catch (error) {
    console.warn('Error fetching calendar events:', error)
    return []
  }
}
