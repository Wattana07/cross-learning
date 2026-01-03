// supabase/functions/complete-episode/index.ts
// Deploy: supabase functions deploy complete-episode

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = { episodeId: string };

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content - required for CORS preflight
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
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

    // user client to identify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as Body;
    const { episodeId } = body;
    if (!episodeId) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_EPISODE_ID" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // service client for secure writes
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

    // load episode
    const epRes = await adminClient
      .from("episodes")
      .select("id, subject_id, points_reward, duration_seconds")
      .eq("id", episodeId)
      .single();
    
    if (epRes.error) {
      return new Response(JSON.stringify({ ok: false, reason: "EPISODE_NOT_FOUND" }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    const episode = epRes.data;

    // check progress
    const progRes = await adminClient
      .from("user_episode_progress")
      .select("watched_percent, completed_at")
      .eq("user_id", userId)
      .eq("episode_id", episodeId)
      .maybeSingle();

    const watched = progRes.data?.watched_percent ?? 0;
    const completedAt = progRes.data?.completed_at ?? null;
    const isComplete = completedAt !== null || watched >= 90;

    if (!isComplete) {
      return new Response(JSON.stringify({ ok: false, reason: "NOT_COMPLETE", watched }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // points for episode_complete
    const rule = await adminClient
      .from("point_rules")
      .select("points, is_active")
      .eq("key", "episode_complete")
      .single();
    
    const rulePoints = rule.data?.is_active ? rule.data.points : 0;
    const points = episode.points_reward ?? rulePoints;

    // insert transaction (unique prevents duplicate)
    const tx = await adminClient
      .from("point_transactions")
      .insert({
        user_id: userId,
        rule_key: "episode_complete",
        ref_type: "episode",
        ref_id: episodeId,
        points,
      })
      .select("id")
      .maybeSingle();

    // if duplicate, tx.error contains unique violation
    const gainedEpisodePoints = tx.error ? 0 : points;

    // ensure wallet exists
    await adminClient
      .from("user_wallet")
      .upsert({ user_id: userId }, { onConflict: "user_id" });

    // update wallet total
    if (gainedEpisodePoints > 0) {
      await adminClient.rpc("wallet_add_points", { 
        p_user_id: userId, 
        p_points: gainedEpisodePoints 
      });
    }

    // check subject completion
    const epsAll = await adminClient
      .from("episodes")
      .select("id")
      .eq("subject_id", episode.subject_id)
      .eq("status", "published");
    
    const epsIds = (epsAll.data ?? []).map((x: any) => x.id);

    let gainedSubjectPoints = 0;
    if (epsIds.length > 0) {
      const done = await adminClient
        .from("user_episode_progress")
        .select("episode_id, completed_at, watched_percent")
        .eq("user_id", userId)
        .in("episode_id", epsIds);

      const completedCount = (done.data ?? []).filter(
        (r: any) => r.completed_at || (r.watched_percent ?? 0) >= 90
      ).length;

      if (completedCount === epsIds.length) {
        const srule = await adminClient
          .from("point_rules")
          .select("points, is_active")
          .eq("key", "subject_complete")
          .single();
        
        const spoints = srule.data?.is_active ? srule.data.points : 0;

        const stx = await adminClient
          .from("point_transactions")
          .insert({
            user_id: userId,
            rule_key: "subject_complete",
            ref_type: "subject",
            ref_id: episode.subject_id,
            points: spoints,
          })
          .select("id")
          .maybeSingle();

        if (!stx.error && spoints > 0) {
          await adminClient.rpc("wallet_add_points", { 
            p_user_id: userId, 
            p_points: spoints 
          });
          gainedSubjectPoints = spoints;
        }
      }
    }

    // === STREAK LOGIC ===
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // get current streak
    const streakRes = await adminClient
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    let currentStreak = streakRes.data?.current_streak ?? 0;
    let maxStreak = streakRes.data?.max_streak ?? 0;
    const lastActivity = streakRes.data?.last_activity_date;
    
    let gainedStreakPoints = 0;
    
    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActivity === yesterdayStr) {
        // consecutive day
        currentStreak += 1;
      } else if (lastActivity === null || lastActivity < yesterdayStr) {
        // streak broken or first time
        currentStreak = 1;
      }
      
      maxStreak = Math.max(maxStreak, currentStreak);
      
      // update streak record
      await adminClient
        .from("user_streaks")
        .upsert({
          user_id: userId,
          current_streak: currentStreak,
          max_streak: maxStreak,
          last_activity_date: today,
        }, { onConflict: "user_id" });
      
      // check streak rewards
      if (currentStreak === 3) {
        const streak3Rule = await adminClient
          .from("point_rules")
          .select("points, is_active")
          .eq("key", "streak_3")
          .single();
        
        if (streak3Rule.data?.is_active) {
          const stx = await adminClient
            .from("point_transactions")
            .insert({
              user_id: userId,
              rule_key: "streak_3",
              ref_type: "streak",
              ref_id: today,
              points: streak3Rule.data.points,
            })
            .select("id")
            .maybeSingle();
          
          if (!stx.error) {
            await adminClient.rpc("wallet_add_points", { 
              p_user_id: userId, 
              p_points: streak3Rule.data.points 
            });
            gainedStreakPoints += streak3Rule.data.points;
          }
        }
      }
      
      if (currentStreak === 7) {
        const streak7Rule = await adminClient
          .from("point_rules")
          .select("points, is_active")
          .eq("key", "streak_7")
          .single();
        
        if (streak7Rule.data?.is_active) {
          const stx = await adminClient
            .from("point_transactions")
            .insert({
              user_id: userId,
              rule_key: "streak_7",
              ref_type: "streak",
              ref_id: today,
              points: streak7Rule.data.points,
            })
            .select("id")
            .maybeSingle();
          
          if (!stx.error) {
            await adminClient.rpc("wallet_add_points", { 
              p_user_id: userId, 
              p_points: streak7Rule.data.points 
            });
            gainedStreakPoints += streak7Rule.data.points;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      gainedEpisodePoints,
      gainedSubjectPoints,
      gainedStreakPoints,
      currentStreak,
      maxStreak,
    }), { 
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      } 
    });

  } catch (e) {
    console.error('Complete episode error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

