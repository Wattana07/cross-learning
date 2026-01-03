import { supabase } from '@/lib/supabaseClient'
import type { RoomBooking, BookingStatus } from '@/lib/database.types'

export interface BookingWithDetails extends RoomBooking {
  room_name?: string
  room_location?: string
  booker_name?: string
  booker_email?: string
}

// Fetch all bookings
export async function fetchAllBookings(): Promise<BookingWithDetails[]> {
  // Fetch bookings first
  const { data: bookings, error: bookingsError } = await supabase
    .from('room_bookings')
    .select('*')
    .order('start_at', { ascending: false })

  if (bookingsError) throw bookingsError
  
  if (!bookings || bookings.length === 0) {
    return []
  }

  // Fetch rooms and profiles separately
  const roomIds = [...new Set(bookings.map((b: any) => b.room_id).filter(Boolean))]
  const userIds = [...new Set(bookings.map((b: any) => b.booked_by_user_id).filter(Boolean))]

  const [roomsResult, profilesResult] = await Promise.all([
    roomIds.length > 0 ? supabase.from('rooms').select('id, name, location').in('id', roomIds) : { data: [], error: null },
    userIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', userIds) : { data: [], error: null },
  ])

  if (roomsResult.error) console.error('Error fetching rooms:', roomsResult.error)
  if (profilesResult.error) console.error('Error fetching profiles:', profilesResult.error)

  const roomsMap = new Map((roomsResult.data || []).map((r: any) => [r.id, r]))
  const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]))

  return bookings.map((booking: any) => {
    const room = roomsMap.get(booking.room_id)
    const booker = profilesMap.get(booking.booked_by_user_id)
    
    return {
      ...booking,
      room_name: room?.name,
      room_location: room?.location,
      booker_name: booker?.full_name,
      booker_email: booker?.email,
    }
  })
}

// Update booking status
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<RoomBooking> {
  const { data, error } = await supabase
    .from('room_bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error

  // If status is approved, send notification
  if (status === 'approved' && data) {
    try {
      await supabase.functions.invoke('notify-booking-approval', {
        body: { bookingId: data.id },
      })
    } catch (notifyError) {
      // Log error but don't fail the status update
      console.error('Error sending booking approval notification:', notifyError)
    }
  }

  return data
}

// Delete booking
export async function deleteBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('room_bookings')
    .delete()
    .eq('id', bookingId)

  if (error) throw error
}

