// supabase/functions/hmpm-login/index.ts
// Deploy: supabase functions deploy hmpm-login
//
// หน้าที่:
// 1) รับ mem_id + mem_pass จาก frontend
// 2) เรียก API HMPM (ระบบหลัก) เพื่อตรวจสอบสิทธิ์และดึงข้อมูลสมาชิก
// 3) ใช้ service role ของ Supabase:
//    - สร้าง/อัปเดต user ใน auth.users (email จำลองจาก mcode)
//    - ตั้งรหัสผ่านให้ตรงกับ mem_pass ทุกครั้งที่ login สำเร็จ
//    - upsert ข้อมูลลงตาราง public.profiles + wallet + streaks
// 4) ส่งกลับ supabase_email ที่ frontend จะใช้ signInWithPassword

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type HmpmLoginBody = {
  mem_id: string;
  mem_pass: string;
};

type HmpmTokenResponse = {
  STATUS: string;
  STATUS_CODE: number;
  MESSAGE: string;
  DATA?: {
    access_token: string;
    expire: number;
  };
};

type HmpmMemberResponse = {
  STATUS: string;
  STATUS_CODE: number;
  MESSAGE: string;
  DATA?: {
    access_token: string;
    expire: string;
    mcode: string;
    name: string;
    member_group: string[];
    pos_cur?: {
      POS_SHORT?: string;
      POS_NAME?: string;
    } | null;
    honor?: {
      POS_SHORT?: string;
      POS_NAME?: string;
    } | null;
    member_status?: number;
  };
};

// ใช้ URL ตามที่ใช้ใน Postman
const HMPM_BASE_URL = "https://myhmpm.com/app/v1.0/index.php";
const HMPM_AUTH_URL = "https://myhmpm.com/app/v1.0/index.php/auth/"; // API 1: Get Token
const HMPM_MEMBER_URL = "https://myhmpm.com/app/v1.0/index.php/auth/member/"; // API 2: Get Member

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Debug: Log request start
  console.log(`[${requestId}] ========== HMPM LOGIN REQUEST START ==========`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] CORS preflight request`);
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    console.error(`[${requestId}] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  // ตรวจสอบ headers (สำหรับ debugging)
  const apikey = req.headers.get("apikey") || req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  const allHeaders = Object.fromEntries(req.headers.entries());
  
  console.log(`[${requestId}] Headers check:`, {
    hasApikey: !!apikey,
    hasAuthHeader: !!authHeader,
    apikeyLength: apikey?.length || 0,
    allHeaders: allHeaders,
  });

  // หมายเหตุ: Supabase Functions อาจต้องการ apikey header
  // แต่ถ้าไม่มีก็ยังทำงานได้ (public function)
  // ถ้า Supabase ต้องการ apikey มันจะ reject ที่ระดับ platform

  try {
    console.log(`[${requestId}] Step 1: Loading environment variables...`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const hmpmAuthUser = Deno.env.get("HMPM_AUTH_USER");
    const hmpmAuthPass = Deno.env.get("HMPM_AUTH_PASS");

    console.log(`[${requestId}] Environment check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!anonKey,
      hasServiceKey: !!serviceKey,
      hasHmpmAuthUser: !!hmpmAuthUser,
      hasHmpmAuthPass: !!hmpmAuthPass,
    });

    if (!hmpmAuthUser || !hmpmAuthPass) {
      console.error(`[${requestId}] HMPM_AUTH_USER or HMPM_AUTH_PASS is not set`);
      return new Response(
        JSON.stringify({ ok: false, error: "HMPM_CONFIG_MISSING" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    console.log(`[${requestId}] Step 2: Parsing request body...`);
    const body = (await req.json()) as HmpmLoginBody;
    const memId = body.mem_id?.trim();
    const memPass = body.mem_pass;
    
    console.log(`[${requestId}] Request body:`, {
      mem_id: memId,
      mem_pass_length: memPass?.length || 0,
      has_mem_id: !!memId,
      has_mem_pass: !!memPass,
    });

    if (!memId || !memPass) {
      console.error(`[${requestId}] Missing credentials:`, { memId: !!memId, memPass: !!memPass });
      return new Response(
        JSON.stringify({ ok: false, error: "MISSING_CREDENTIALS" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // 1) เรียก API แรกเพื่อขอ system access_token
    console.log(`[${requestId}] Step 3: Calling HMPM API 1 (Get Token)...`);
    console.log(`[${requestId}] API URL: ${HMPM_AUTH_URL}`);
    const tokenBody = new URLSearchParams({
      auth_user: hmpmAuthUser,
      auth_pass: hmpmAuthPass,
    }).toString();
    
    const api1StartTime = Date.now();
    const tokenRes = await fetch(HMPM_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      body: tokenBody,
    });
    const api1Duration = Date.now() - api1StartTime;
    
    console.log(`[${requestId}] API 1 Response:`, {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      duration: `${api1Duration}ms`,
      headers: Object.fromEntries(tokenRes.headers.entries()),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text().catch(() => "Could not read error response");
      console.error("HMPM token request failed", {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        url: HMPM_AUTH_URL,
        errorBody: errorText.substring(0, 500),
      });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "HMPM_TOKEN_HTTP_ERROR",
          message: `API returned ${tokenRes.status} ${tokenRes.statusText}`,
          details: {
            url: HMPM_AUTH_URL,
            status: tokenRes.status,
            statusText: tokenRes.statusText,
          }
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const tokenJson = (await tokenRes.json()) as HmpmTokenResponse;
    
    console.log(`[${requestId}] API 1 JSON Response:`, {
      STATUS: tokenJson.STATUS,
      STATUS_CODE: tokenJson.STATUS_CODE,
      MESSAGE: tokenJson.MESSAGE,
      hasAccessToken: !!tokenJson.DATA?.access_token,
      tokenLength: tokenJson.DATA?.access_token?.length || 0,
    });

    if (tokenJson.STATUS !== "SUCCESS" || !tokenJson.DATA?.access_token) {
      console.error(`[${requestId}] HMPM token response error:`, tokenJson);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "HMPM_TOKEN_ERROR",
          message: tokenJson.MESSAGE,
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const systemToken = tokenJson.DATA.access_token;
    console.log(`[${requestId}] Got system token: ${systemToken.substring(0, 20)}...`);

    // 2) เรียก API ที่สองเพื่อเช็ค member/ดึง profile
    console.log(`[${requestId}] Step 4: Calling HMPM API 2 (Get Member)...`);
    console.log(`[${requestId}] API URL: ${HMPM_MEMBER_URL}`);
    console.log(`[${requestId}] Member ID: ${memId}`);
    
    const memberBody = new URLSearchParams({
      mem_id: memId,
      mem_pass: memPass,
    }).toString();
    
    const api2StartTime = Date.now();
    const memberRes = await fetch(HMPM_MEMBER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${systemToken}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      body: memberBody,
    });
    const api2Duration = Date.now() - api2StartTime;
    
    console.log(`[${requestId}] API 2 Response:`, {
      status: memberRes.status,
      statusText: memberRes.statusText,
      duration: `${api2Duration}ms`,
      headers: Object.fromEntries(memberRes.headers.entries()),
    });

    if (!memberRes.ok) {
      const errorText = await memberRes.text().catch(() => "Could not read error");
      console.error("HMPM member request failed", {
        status: memberRes.status,
        statusText: memberRes.statusText,
        url: HMPM_MEMBER_URL,
        errorBody: errorText.substring(0, 500),
      });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "HMPM_MEMBER_HTTP_ERROR",
          message: `API returned ${memberRes.status} ${memberRes.statusText}`,
          details: {
            url: HMPM_MEMBER_URL,
            status: memberRes.status,
            statusText: memberRes.statusText,
          }
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const memberJson = (await memberRes.json()) as HmpmMemberResponse;
    
    console.log(`[${requestId}] API 2 JSON Response:`, {
      STATUS: memberJson.STATUS,
      STATUS_CODE: memberJson.STATUS_CODE,
      MESSAGE: memberJson.MESSAGE,
      hasData: !!memberJson.DATA,
      mcode: memberJson.DATA?.mcode,
      name: memberJson.DATA?.name,
    });

    if (memberJson.STATUS !== "SUCCESS" || !memberJson.DATA) {
      console.error(`[${requestId}] HMPM member response error:`, memberJson);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "HMPM_MEMBER_ERROR",
          message: memberJson.MESSAGE || "Invalid credentials",
        }),
        { status: 401, headers: jsonHeaders },
      );
    }

    const member = memberJson.DATA;
    console.log(`[${requestId}] Step 5: Processing member data for mcode: ${member.mcode}`);

    // 3) ใช้ service role ของ Supabase เพื่อสร้าง/อัปเดต user & profile
    console.log(`[${requestId}] Step 6: Initializing Supabase admin client...`);
    const adminClient = createClient(supabaseUrl, serviceKey);

    const supabaseEmail = `${member.mcode}@hmpm.local`;
    console.log(`[${requestId}] Supabase email: ${supabaseEmail}`);

    // หา user เดิมจาก email โดย query profiles table ก่อน (เร็วกว่า listUsers)
    console.log(`[${requestId}] Step 7: Checking for existing profile...`);
    const profileCheckStartTime = Date.now();
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("email", supabaseEmail)
      .maybeSingle();
    const profileCheckDuration = Date.now() - profileCheckStartTime;
    
    console.log(`[${requestId}] Profile check result:`, {
      found: !!existingProfile,
      userId: existingProfile?.id,
      duration: `${profileCheckDuration}ms`,
      error: profileCheckError?.message,
    });

    let existingUser = null;
    
    // ถ้ามี profile แสดงว่ามี user อยู่แล้ว
    if (existingProfile) {
      console.log(`[${requestId}] Step 8: Fetching existing user by ID...`);
      const getUserStartTime = Date.now();
      const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(
        existingProfile.id
      );
      const getUserDuration = Date.now() - getUserStartTime;
      
      console.log(`[${requestId}] Get user result:`, {
        found: !!userData?.user,
        userId: userData?.user?.id,
        email: userData?.user?.email,
        duration: `${getUserDuration}ms`,
        error: getUserError?.message,
      });
      
      if (!getUserError && userData?.user) {
        existingUser = userData.user;
      }
    } else {
      console.log(`[${requestId}] No existing profile found - will create new user`);
    }

    let userId: string;

    // Supabase ต้องการ password อย่างน้อย 6 ตัวอักษร
    // ถ้า mem_pass สั้นกว่า ให้เพิ่ม padding
    const ensurePasswordLength = (password: string): string => {
      if (password.length >= 6) {
        return password;
      }
      // เพิ่ม padding เพื่อให้ได้ 6 ตัวอักษร
      const padding = "0".repeat(6 - password.length);
      return password + padding;
    };

    const safePassword = ensurePasswordLength(memPass);
    console.log(`[${requestId}] Password info:`, {
      originalLength: memPass.length,
      safeLength: safePassword.length,
      wasPadded: memPass.length < 6,
    });

    if (!existingUser) {
      console.log(`[${requestId}] Step 9: Creating new user...`);
      const createUserStartTime = Date.now();
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: supabaseEmail,
          password: safePassword,
          email_confirm: true,
        });
      const createUserDuration = Date.now() - createUserStartTime;

      console.log(`[${requestId}] Create user result:`, {
        success: !!newUser?.user,
        userId: newUser?.user?.id,
        duration: `${createUserDuration}ms`,
        error: createError?.message,
      });

      if (createError || !newUser?.user) {
        console.error(`[${requestId}] Error creating auth user:`, createError);
        return new Response(
          JSON.stringify({ ok: false, error: "AUTH_CREATE_ERROR", message: createError?.message }),
          { status: 500, headers: jsonHeaders },
        );
      }

      userId = newUser.user.id;
      console.log(`[${requestId}] New user created with ID: ${userId}`);
    } else {
      console.log(`[${requestId}] Step 9: Updating existing user password (non-blocking)...`);
      userId = existingUser.id;
      // มี user แล้ว → อัปเดตรหัสผ่านให้ตรงกับ mem_pass ปัจจุบัน (ปรับความยาวให้ถูกต้อง)
      // อัปเดตทุกครั้งที่ login เพื่อให้ password ตรงกับ HMPM เสมอ
      // ทำแบบ non-blocking (ไม่รอผลลัพธ์) เพื่อให้เร็วขึ้น
      adminClient.auth.admin.updateUserById(existingUser.id, {
        password: safePassword,
      }).then(() => {
        console.log(`[${requestId}] Password updated successfully`);
      }).catch((err) => {
        // Log error แต่ไม่ block flow
        console.warn(`[${requestId}] Password update failed (non-blocking):`, err.message);
      });
    }

    // upsert profile (รวมข้อมูล HMPM)
    console.log(`[${requestId}] Step 10: Upserting profile...`);
    const upsertProfileStartTime = Date.now();
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        email: supabaseEmail,
        full_name: member.name ?? null,
        role: "learner",
        is_active: true,
        hmpm_mcode: member.mcode,
        hmpm_member_group: member.member_group ?? null,
        hmpm_pos_cur: member.pos_cur ?? null,
        hmpm_honor: member.honor ?? null,
        hmpm_member_status: member.member_status ?? null,
        hmpm_expire: member.expire
          ? new Date(member.expire).toISOString().slice(0, 10)
          : null,
        hmpm_raw: member as unknown as Record<string, unknown>,
      },
      { onConflict: "id" },
    );
    const upsertProfileDuration = Date.now() - upsertProfileStartTime;
    
    console.log(`[${requestId}] Upsert profile result:`, {
      success: !profileError,
      duration: `${upsertProfileDuration}ms`,
      error: profileError?.message,
    });

    if (profileError) {
      console.error(`[${requestId}] Error upserting profile:`, profileError);
      return new Response(
        JSON.stringify({ ok: false, error: "PROFILE_UPSERT_ERROR" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    // ตรวจว่ามีกระเป๋า/สถิติ streak หรือยัง ถ้าไม่มีก็สร้าง (ทำแบบ parallel)
    console.log(`[${requestId}] Step 11: Checking wallet and streak...`);
    const walletCheckStartTime = Date.now();
    const [walletResult, streakResult] = await Promise.all([
      adminClient
        .from("user_wallet")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
      adminClient
        .from("user_streaks")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const walletCheckDuration = Date.now() - walletCheckStartTime;
    
    console.log(`[${requestId}] Wallet/Streak check result:`, {
      hasWallet: !!walletResult.data,
      hasStreak: !!streakResult.data,
      duration: `${walletCheckDuration}ms`,
    });

    // สร้าง wallet และ streak แบบ parallel ถ้ายังไม่มี
    const insertPromises: Promise<any>[] = [];
    if (!walletResult.data) {
      console.log(`[${requestId}] Creating wallet...`);
      insertPromises.push(adminClient.from("user_wallet").insert({ user_id: userId }));
    }
    if (!streakResult.data) {
      console.log(`[${requestId}] Creating streak...`);
      insertPromises.push(adminClient.from("user_streaks").insert({ user_id: userId }));
    }
    
    if (insertPromises.length > 0) {
      const insertStartTime = Date.now();
      await Promise.all(insertPromises);
      const insertDuration = Date.now() - insertStartTime;
      console.log(`[${requestId}] Created wallet/streak in ${insertDuration}ms`);
    }

    // ส่งกลับ safePassword เพื่อให้ frontend ใช้ login
    // แต่ไม่ส่งใน response เพื่อความปลอดภัย (frontend จะคำนวณเอง)
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] ========== HMPM LOGIN SUCCESS ==========`);
    console.log(`[${requestId}] Total duration: ${totalDuration}ms`);
    console.log(`[${requestId}] User ID: ${userId}`);
    console.log(`[${requestId}] Email: ${supabaseEmail}`);
    console.log(`[${requestId}] Member Code: ${member.mcode}`);
    
    return new Response(
      JSON.stringify({
        ok: true,
        supabase_email: supabaseEmail,
        hmpm_profile: member,
        // ส่งกลับ password_length_hint เพื่อให้ frontend รู้ว่าต้องใช้ safePassword
        password_length_hint: memPass.length < 6 ? "padded" : "original",
        debug: {
          request_id: requestId,
          duration_ms: totalDuration,
        },
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ========== HMPM LOGIN ERROR ==========`);
    console.error(`[${requestId}] Error:`, e);
    console.error(`[${requestId}] Error message:`, e?.message || String(e));
    console.error(`[${requestId}] Error stack:`, e?.stack);
    console.error(`[${requestId}] Total duration before error: ${totalDuration}ms`);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: "INTERNAL_ERROR", 
        detail: String(e),
        debug: {
          request_id: requestId,
          duration_ms: totalDuration,
        },
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
});

