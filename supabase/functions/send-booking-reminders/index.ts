// supabase/functions/send-booking-reminders/index.ts
// Deploy: supabase functions deploy send-booking-reminders
// This function should be called daily via cron job or scheduled task
// To set up: Use Supabase Cron Jobs or external scheduler (e.g., GitHub Actions, Vercel Cron)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalKey = Deno.env.get("INTERNAL_FUNCTION_KEY") || "";
    
    // Email sending disabled - system continues to work without email notifications
    console.log('✅ [send-booking-reminders] Email sending is disabled. System continues to work.');

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get production site URL
    let productionUrl = Deno.env.get("SITE_URL") || 
      Deno.env.get("VITE_SITE_URL") ||
      `https://cross-learning.vercel.app`;
    
    if (productionUrl && !productionUrl.startsWith('https://')) {
      productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
    }
    productionUrl = productionUrl.replace(/\/$/, '');

    // Get bookings that start within 24 hours (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const { data: bookings, error: bookingsError } = await adminClient
      .from('room_bookings')
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        room_id,
        booked_by_user_id,
        rooms(name, location),
        profiles!room_bookings_booked_by_user_id_fkey(email, full_name)
      `)
      .eq('status', 'approved')
      .gte('start_at', tomorrow.toISOString())
      .lt('start_at', dayAfter.toISOString());

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return new Response(JSON.stringify({ ok: false, error: bookingsError.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'No bookings to remind',
        count: 0 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Email sending disabled - just log the bookings that would have been notified
    console.log(`Found ${bookings.length} bookings for reminder (email sending disabled)`);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      message: `Found ${bookings.length} bookings. Email sending is disabled.`,
      count: bookings.length,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (e) {
    console.error('Send booking reminders error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

