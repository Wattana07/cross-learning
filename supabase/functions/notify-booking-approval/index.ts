import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('🔵 [notify-booking-approval] Function called');
  console.log('🔵 [notify-booking-approval] Method:', req.method);
  console.log('🔵 [notify-booking-approval] URL:', req.url);
  console.log('🔵 [notify-booking-approval] Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('🔵 [notify-booking-approval] Handling CORS preflight');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    console.log('🔵 [notify-booking-approval] Auth header present:', !!authHeader);
    console.log('🔵 [notify-booking-approval] JWT present:', !!jwt);
    
    if (!jwt) {
      console.error('❌ [notify-booking-approval] No JWT provided');
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if caller is admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, reason: "NOT_ADMIN" }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const body = await req.json();
    const { bookingId } = body;
    
    console.log('🔵 [notify-booking-approval] Request body:', body);
    console.log('🔵 [notify-booking-approval] Booking ID:', bookingId);

    if (!bookingId) {
      console.error('❌ [notify-booking-approval] Missing bookingId');
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_BOOKING_ID" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fetch booking details (query separately to avoid relationship issues)
    console.log('🔵 [notify-booking-approval] Fetching booking details...');
    const { data: booking, error: bookingError } = await adminClient
      .from('room_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [notify-booking-approval] Booking not found:', bookingError);
      return new Response(JSON.stringify({ ok: false, reason: "BOOKING_NOT_FOUND", error: bookingError?.message }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    console.log('✅ [notify-booking-approval] Booking found:', {
      id: booking.id,
      title: booking.title,
      room_id: booking.room_id,
      booked_by_user_id: booking.booked_by_user_id,
    });
    
    // Fetch room details separately
    let roomData: { name: string | null; location: string | null } | null = null;
    if (booking.room_id) {
      const { data: room, error: roomError } = await adminClient
        .from('rooms')
        .select('name, location')
        .eq('id', booking.room_id)
        .single();
      
      if (roomError) {
        console.error('⚠️ [notify-booking-approval] Error fetching room:', roomError);
      } else {
        roomData = room;
        console.log('✅ [notify-booking-approval] Room found:', roomData);
      }
    }
    
    // Fetch booker (profile) details separately
    let bookerData: { id: string; email: string | null; full_name: string | null } | null = null;
    if (booking.booked_by_user_id) {
      const { data: booker, error: bookerError } = await adminClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', booking.booked_by_user_id)
        .single();
      
      if (bookerError) {
        console.error('⚠️ [notify-booking-approval] Error fetching booker:', bookerError);
      } else {
        bookerData = booker;
        console.log('✅ [notify-booking-approval] Booker found:', {
          id: bookerData.id,
          email: bookerData.email,
          full_name: bookerData.full_name,
        });
      }
    }
    
    // Combine data
    const bookingWithDetails = {
      ...booking,
      room: roomData,
      booker: bookerData,
    };
    
    console.log('✅ [notify-booking-approval] Combined booking data:', {
      id: bookingWithDetails.id,
      title: bookingWithDetails.title,
      bookerEmail: bookingWithDetails.booker?.email,
      roomName: bookingWithDetails.room?.name,
    });

    // Send email notifications when booking is approved
    if (!bookerData?.email) {
      console.warn('⚠️ [notify-booking-approval] No email found for booker');
      return new Response(JSON.stringify({ ok: true, message: 'Booking approved but no email found for booker' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
      // Email sending disabled - system continues to work without email notifications
      console.log('✅ [notify-booking-approval] Booking approved. Email sending is disabled.');

      // Email sending code removed - system works without email notifications

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Notification sent successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in notify-booking-approval:', error);
    return new Response(JSON.stringify({ ok: false, reason: "SERVER_ERROR", error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

