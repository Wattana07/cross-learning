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

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))))
}

function toMapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(i => [i.id, i]))
}

async function notifyBookingApproval(bookingId: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-booking-approval', {
      body: { bookingId },
    })

    if (error) {
      console.error('[notify-booking-approval] error:', error)
      const msg = error.message ?? ''
      if (msg.includes('404') || msg.includes('Not Found') || msg.includes('non-2xx')) {
        console.warn(
          '[notify-booking-approval] function not ready/not found (404/non-2xx). Status update succeeded.'
        )
      }
      return
    }

    console.log('[notify-booking-approval] success:', data)
  } catch (e) {
    console.error('[notify-booking-approval] exception:', e)
  }
}

export async function fetchAllBookings(): Promise<BookingWithDetails[]> {
  const { data: bookings, error: bookingsError } = await supabase
    .from('room_bookings')
    .select('*')
    .order('start_at', { ascending: false })

  if (bookingsError) throw bookingsError
  if (!bookings?.length) return []

  const bookingsTyped = bookings as RoomBooking[]
  const roomIds = uniqueStrings(bookingsTyped.map(b => b.room_id))
  const userIds = uniqueStrings(bookingsTyped.map(b => b.booked_by_user_id))

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

  return bookingsTyped.map(booking => {
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
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<RoomBooking> {
  // @ts-ignore - Supabase type inference issue with update
  const { data, error } = await supabase
    .from('room_bookings')
    .update({ status })
    .eq('id', bookingId)
    .select('*')
    .single()

  if (error) throw error
  if (!data) throw new Error('Booking not found or not accessible (RLS?)')

  const booking = data as RoomBooking

  if (status === 'approved' && isBrowser()) {
    setTimeout(() => void notifyBookingApproval(booking.id), 100)
  }

  return booking
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('room_bookings').delete().eq('id', bookingId)
  if (error) throw error
}
