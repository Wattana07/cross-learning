// supabase/functions/delete-user/index.ts
// Deploy: supabase functions deploy delete-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  userId: string;
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response("Unauthorized", { status: 401 });

    const adminClient = createClient(supabaseUrl, serviceKey);
    
    // check if caller is admin
    const profile = await adminClient.from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    
    if (profile.data?.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, reason: "NOT_ADMIN" }), { 
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const body = (await req.json()) as Body;
    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_USER_ID" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Prevent deleting yourself
    if (userId === userData.user.id) {
      return new Response(JSON.stringify({ ok: false, reason: "CANNOT_DELETE_SELF" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if user exists
    const { data: targetUser, error: userCheckError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (userCheckError || !targetUser) {
      return new Response(JSON.stringify({ ok: false, reason: "USER_NOT_FOUND" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Delete related data first (due to foreign key constraints)
    // Note: Some tables have CASCADE delete, but we'll delete explicitly to be safe
    
    // Delete user wallet
    await adminClient.from("user_wallet").delete().eq("user_id", userId);
    
    // Delete user streaks
    await adminClient.from("user_streaks").delete().eq("user_id", userId);
    
    // Delete point transactions
    await adminClient.from("point_transactions").delete().eq("user_id", userId);
    
    // Delete episode progress
    await adminClient.from("user_episode_progress").delete().eq("user_id", userId);
    
    // Delete room bookings (if any)
    await adminClient.from("room_bookings").delete().eq("booked_by_user_id", userId);
    
    // Delete profile (this should cascade to other related data)
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return new Response(JSON.stringify({ ok: false, reason: "PROFILE_DELETE_ERROR", error: profileError.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Delete auth user (this must be last)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return new Response(JSON.stringify({ ok: false, reason: "AUTH_DELETE_ERROR", error: authError.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'User deleted successfully' 
    }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    console.error('Error in delete-user:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

