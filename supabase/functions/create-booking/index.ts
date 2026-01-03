// supabase/functions/create-booking/index.ts
// Deploy: supabase functions deploy create-booking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  roomId: string;
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string;   // ISO
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
    const { roomId, title, description, startAt, endAt } = body;

    if (!roomId || !title || !startAt || !endAt) {
      return new Response(JSON.stringify({ ok: false, reason: "BAD_REQUEST" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!(end > start)) {
      return new Response(JSON.stringify({ ok: false, reason: "INVALID_TIME" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // check not in the past
    if (start < new Date()) {
      return new Response(JSON.stringify({ ok: false, reason: "CANNOT_BOOK_PAST" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check must be at least 7 days in advance
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    minDate.setHours(0, 0, 0, 0);
    const bookingDate = new Date(start);
    bookingDate.setHours(0, 0, 0, 0);
    
    if (bookingDate < minDate) {
      return new Response(JSON.stringify({ ok: false, reason: "TOO_SOON", minDate: minDate.toISOString() }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // check user is active
    const userProfile = await adminClient.from("profiles").select("is_active").eq("id", userId).single();
    if (!userProfile.data?.is_active) {
      return new Response(JSON.stringify({ ok: false, reason: "USER_INACTIVE" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check room active
    const room = await adminClient.from("rooms").select("status").eq("id", roomId).single();
    if (room.error) {
      return new Response(JSON.stringify({ ok: false, reason: "ROOM_NOT_FOUND" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    if (room.data.status !== "active") {
      return new Response(JSON.stringify({ ok: false, reason: "ROOM_NOT_ACTIVE" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // overlap check with blocks
    const blocks = await adminClient
      .from("room_blocks")
      .select("id")
      .eq("room_id", roomId)
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

    // overlap check with bookings (active statuses)
    const bookings = await adminClient
      .from("room_bookings")
      .select("id,status")
      .eq("room_id", roomId)
      .in("status", ["approved","pending"])
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());

    if ((bookings.data ?? []).length > 0) {
      return new Response(JSON.stringify({ ok: false, reason: "TIME_CONFLICT" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // create booking
    const ins = await adminClient.from("room_bookings").insert({
      room_id: roomId,
      booked_by_user_id: userId,
      title,
      description: description ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "pending",
    }).select("*").single();

    if (ins.error) {
      return new Response(JSON.stringify({ ok: false, reason: "INSERT_FAIL", error: ins.error.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, booking: ins.data }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    console.error('Create booking error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

