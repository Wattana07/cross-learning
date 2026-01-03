// supabase/functions/update-booking/index.ts
// Deploy: supabase functions deploy update-booking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  bookingId: string;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
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
    if (!jwt) {
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const body = (await req.json()) as Body;
    const { bookingId, title, description, startAt, endAt } = body;

    if (!bookingId) {
      return new Response(JSON.stringify({ ok: false, reason: "BAD_REQUEST" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // get existing booking
    const existingBooking = await adminClient.from("room_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    
    if (existingBooking.error) {
      return new Response(JSON.stringify({ ok: false, reason: "BOOKING_NOT_FOUND" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const booking = existingBooking.data;

    // check ownership (unless admin)
    const profile = await adminClient.from("profiles").select("role").eq("id", userId).single();
    const isAdmin = profile.data?.role === 'admin';
    
    if (!isAdmin && booking.booked_by_user_id !== userId) {
      return new Response(JSON.stringify({ ok: false, reason: "NOT_OWNER" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check if booking can be modified (must be before start time by 2 hours)
    const bookingStart = new Date(booking.start_at);
    const minEditTime = new Date();
    minEditTime.setHours(minEditTime.getHours() + 2); // 2 hours before
    
    if (!isAdmin && bookingStart < minEditTime) {
      return new Response(JSON.stringify({ ok: false, reason: "TOO_LATE_TO_EDIT" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check status
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return new Response(JSON.stringify({ ok: false, reason: "BOOKING_NOT_ACTIVE" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // prepare update
    const start = startAt ? new Date(startAt) : new Date(booking.start_at);
    const end = endAt ? new Date(endAt) : new Date(booking.end_at);
    
    if (!(end > start)) {
      return new Response(JSON.stringify({ ok: false, reason: "INVALID_TIME" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // if time changed, check overlaps
    if (startAt || endAt) {
      // check blocks
      const blocks = await adminClient
        .from("room_blocks")
        .select("id")
        .eq("room_id", booking.room_id)
        .lt("start_at", end.toISOString())
        .gt("end_at", start.toISOString());

      if ((blocks.data ?? []).length > 0) {
        return new Response(JSON.stringify({ ok: false, reason: "BLOCKED" }), { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // check other bookings (exclude self)
      const otherBookings = await adminClient
        .from("room_bookings")
        .select("id")
        .eq("room_id", booking.room_id)
        .neq("id", bookingId)
        .in("status", ["approved", "pending"])
        .lt("start_at", end.toISOString())
        .gt("end_at", start.toISOString());

      if ((otherBookings.data ?? []).length > 0) {
        return new Response(JSON.stringify({ ok: false, reason: "TIME_CONFLICT" }), { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // update booking
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startAt) updateData.start_at = start.toISOString();
    if (endAt) updateData.end_at = end.toISOString();

    const upd = await adminClient.from("room_bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select("*")
      .single();

    if (upd.error) {
      return new Response(JSON.stringify({ ok: false, reason: "UPDATE_FAIL", error: upd.error.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, booking: upd.data }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    console.error('Update booking error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

