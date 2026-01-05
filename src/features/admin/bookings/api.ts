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
    // Send notification asynchronously - don't block the status update
    // Use setTimeout to avoid blocking the UI
    setTimeout(async () => {
      try {
        console.log('Calling notify-booking-approval for booking:', data.id)
        
        // Wait longer to ensure function is ready (sometimes takes a few seconds after deploy)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const { data: notifyData, error: notifyError } = await supabase.functions.invoke('notify-booking-approval', {
          body: { bookingId: data.id },
        })
        
        if (notifyError) {
          console.error('Error sending booking approval notification:', notifyError)
          console.error('Error details:', JSON.stringify(notifyError, null, 2))
          
          // If 404, function might not be ready yet - this is OK, email will be sent on next approval
          if (notifyError.message?.includes('404') || notifyError.message?.includes('Not Found') || notifyError.message?.includes('non-2xx')) {
            console.warn('⚠️ notify-booking-approval function not found (404) - this is OK, status update succeeded. Function may need a few minutes to be ready after deployment.')
          }
          // Don't show error to user - email sending failure shouldn't block approval
        } else {
          console.log('✅ Booking approval notification sent successfully:', notifyData)
        }
      } catch (notifyError: any) {
        // Log error but don't fail the status update
        console.error('❌ Exception sending booking approval notification:', notifyError)
        console.error('Exception details:', {
          message: notifyError?.message,
          stack: notifyError?.stack,
          name: notifyError?.name,
        })
        
        // If 404, function might not be ready yet - this is OK
        if (notifyError?.message?.includes('404') || notifyError?.message?.includes('Not Found') || notifyError?.message?.includes('non-2xx')) {
          console.warn('⚠️ notify-booking-approval function not found (404) - this is OK, status update succeeded. Function may need a few minutes to be ready after deployment.')
        }
        // Don't show error to user - email sending failure shouldn't block approval
      }
    }, 100) // Small delay to ensure status update completes first
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

