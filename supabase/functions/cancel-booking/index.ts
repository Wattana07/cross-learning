// supabase/functions/cancel-booking/index.ts
// Deploy: supabase functions deploy cancel-booking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  bookingId: string;
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
    const { bookingId } = body;

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

    // check if booking can be cancelled (must be before start time by 1 hour for non-admin)
    const bookingStart = new Date(booking.start_at);
    const minCancelTime = new Date();
    minCancelTime.setHours(minCancelTime.getHours() + 1); // 1 hour before
    
    if (!isAdmin && bookingStart < minCancelTime) {
      return new Response(JSON.stringify({ ok: false, reason: "TOO_LATE_TO_CANCEL" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check status
    if (booking.status === 'cancelled') {
      return new Response(JSON.stringify({ ok: false, reason: "ALREADY_CANCELLED" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // ============================================
    // Points System: Refund points when cancelling
    // ============================================
    const pointsToRefund = booking.points_used || 0;
    
    if (pointsToRefund > 0) {
      // Refund points
      await adminClient.rpc("wallet_add_points", {
        p_user_id: booking.booked_by_user_id,
        p_points: pointsToRefund
      });

      // Record transaction
      await adminClient.from("point_transactions").insert({
        user_id: booking.booked_by_user_id,
        rule_key: "booking_use",
        ref_type: "booking",
        ref_id: bookingId,
        points: pointsToRefund, // Positive for refund
      });
    }

    // update status to cancelled
    const upd = await adminClient.from("room_bookings")
      .update({ status: 'cancelled' })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (upd.error) {
      return new Response(JSON.stringify({ ok: false, reason: "CANCEL_FAIL", error: upd.error.message }), { 
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
    console.error('Cancel booking error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

