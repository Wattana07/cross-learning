// supabase/functions/create-booking/index.ts
// Deploy: supabase functions deploy create-booking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  roomId: string;
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  email?: string; // Optional contact email
  resendApiKey?: string; // Optional: Resend API Key from frontend
  siteUrl?: string; // Optional: Production site URL
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
    const { roomId, title, description, startAt, endAt, email, resendApiKey, siteUrl } = body;

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
    const userProfileCheck = await adminClient.from("profiles").select("is_active").eq("id", userId).single();
    if (!userProfileCheck.data?.is_active) {
      return new Response(JSON.stringify({ ok: false, reason: "USER_INACTIVE" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check room active and get room details
    const room = await adminClient.from("rooms").select("id, name, location, status").eq("id", roomId).single();
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

    // Get user profile for email
    const userProfile = await adminClient.from("profiles").select("full_name, email").eq("id", userId).single();
    const userEmail = email || userProfile.data?.email || userData?.user?.email;
    const userName = userProfile.data?.full_name || 'ผู้ใช้';

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

    // ============================================
    // Points System: Calculate hours and points
    // ============================================
    const hoursDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
    const bookingHours = Math.ceil(hoursDiff); // Round up
    const pointsRequired = bookingHours * 10; // 1 hour = 10 points

    // Check user wallet
    const wallet = await adminClient
      .from("user_wallet")
      .select("total_points")
      .eq("user_id", userId)
      .single();

    const availablePoints = wallet.data?.total_points || 0;

    if (availablePoints < pointsRequired) {
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: "INSUFFICIENT_POINTS",
        required: pointsRequired,
        available: availablePoints,
        hours: bookingHours
      }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check daily limit (8 hours per day)
    const bookingDateForLimit = new Date(start);
    bookingDateForLimit.setHours(0, 0, 0, 0);
    const dateStr = bookingDateForLimit.toISOString().split('T')[0]; // YYYY-MM-DD

    const dailyHoursResult = await adminClient.rpc("get_daily_booking_hours", {
      p_user_id: userId,
      p_date: dateStr
    });

    const dailyHours = parseFloat(dailyHoursResult.data || "0");
    if (dailyHours + bookingHours > 8) {
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: "DAILY_LIMIT_EXCEEDED",
        current: dailyHours,
        requested: bookingHours,
        limit: 8
      }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check monthly limit (20 hours per month)
    const bookingYear = start.getFullYear();
    const bookingMonth = start.getMonth() + 1; // 1-12

    const monthlyHoursResult = await adminClient.rpc("get_monthly_booking_hours", {
      p_user_id: userId,
      p_year: bookingYear,
      p_month: bookingMonth
    });

    const monthlyHours = parseFloat(monthlyHoursResult.data || "0");
    if (monthlyHours + bookingHours > 20) {
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: "MONTHLY_LIMIT_EXCEEDED",
        current: monthlyHours,
        requested: bookingHours,
        limit: 20
      }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Deduct points
    console.log('[DEBUG] Deducting points:', { userId, pointsRequired });
    const deductResult = await adminClient.rpc("wallet_deduct_points", {
      p_user_id: userId,
      p_points: pointsRequired
    });
    
    if (deductResult.error) {
      console.error('[DEBUG] Failed to deduct points:', deductResult.error);
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: "DEDUCT_POINTS_FAIL", 
        error: deductResult.error.message 
      }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    console.log('[DEBUG] Points deducted successfully');

    // Record point transaction
    const txResult = await adminClient.from("point_transactions").insert({
      user_id: userId,
      rule_key: "booking_use",
      ref_type: "booking",
      ref_id: "pending", // Will update after booking is created
      points: -pointsRequired, // Negative for deduction
    });
    
    if (txResult.error) {
      console.error('[DEBUG] Failed to record transaction:', txResult.error);
      // ไม่ return error เพราะแต้มหักไปแล้ว แค่ log ไว้
    }

    // create booking (ไม่ใส่ points_used เพื่อหลีกเลี่ยง schema cache issue)
    // แล้วค่อย update ด้วย raw SQL ทีหลัง
    const ins = await adminClient.from("room_bookings").insert({
      room_id: roomId,
      booked_by_user_id: userId,
      title,
      description: description ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "pending",
      // ไม่ใส่ points_used ตรงนี้ เพราะ schema cache ยังไม่เห็น
    }).select("*").single();

    if (ins.error) {
      console.error('[DEBUG] Insert failed:', ins.error);
      return new Response(JSON.stringify({ ok: false, reason: "INSERT_FAIL", error: ins.error.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const booking = ins.data;

    // Update points_used ด้วย raw SQL (bypass schema cache)
    if (booking && booking.id) {
      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          query: `UPDATE public.room_bookings SET points_used = ${pointsRequired} WHERE id = '${booking.id}'`
        }),
      }).catch(() => {
        // ถ้า rpc ไม่มี ก็ข้ามไป - points_used จะเป็น default 0
        console.log('[DEBUG] exec_raw_sql not available, skipping points_used update');
      });

      // Update point transaction with booking ID
      await adminClient
        .from("point_transactions")
        .update({ ref_id: booking.id })
        .eq("user_id", userId)
        .eq("rule_key", "booking_use")
        .eq("ref_type", "booking")
        .eq("ref_id", "pending")
        .limit(1);
    }

    // Email notifications will be sent when admin approves the booking
    // See notify-booking-approval function

    return new Response(JSON.stringify({ ok: true, booking: booking }), {
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

