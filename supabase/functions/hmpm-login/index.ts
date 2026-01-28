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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
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
    return new Response(
      JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const hmpmAuthUser = Deno.env.get("HMPM_AUTH_USER");
    const hmpmAuthPass = Deno.env.get("HMPM_AUTH_PASS");

    if (!hmpmAuthUser || !hmpmAuthPass) {
      console.error("HMPM_AUTH_USER or HMPM_AUTH_PASS is not set");
      return new Response(
        JSON.stringify({ ok: false, error: "HMPM_CONFIG_MISSING" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const body = (await req.json()) as HmpmLoginBody;
    const memId = body.mem_id?.trim();
    const memPass = body.mem_pass;

    if (!memId || !memPass) {
      return new Response(
        JSON.stringify({ ok: false, error: "MISSING_CREDENTIALS" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // 1) เรียก API แรกเพื่อขอ system access_token
    // ใช้ URL ตามที่ใช้ใน Postman: {{base_url}}/auth/
    const tokenBody = new URLSearchParams({
      auth_user: hmpmAuthUser,
      auth_pass: hmpmAuthPass,
    }).toString();
    
    // เรียก API 1 เพื่อขอ system access_token
    const tokenRes = await fetch(HMPM_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      body: tokenBody,
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

    if (tokenJson.STATUS !== "SUCCESS" || !tokenJson.DATA?.access_token) {
      console.error("HMPM token response error", tokenJson);
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

    // 2) เรียก API ที่สองเพื่อเช็ค member/ดึง profile
    const memberBody = new URLSearchParams({
      mem_id: memId,
      mem_pass: memPass,
    }).toString();
    
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

    if (memberJson.STATUS !== "SUCCESS" || !memberJson.DATA) {
      console.error("HMPM member response error", memberJson);
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

    // 3) ใช้ service role ของ Supabase เพื่อสร้าง/อัปเดต user & profile
    const adminClient = createClient(supabaseUrl, serviceKey);

    const supabaseEmail = `${member.mcode}@hmpm.local`;

    // หา user เดิมจาก email โดย query profiles table ก่อน (เร็วกว่า listUsers)
    // ถ้าไม่มี profile แสดงว่าไม่มี user
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("email", supabaseEmail)
      .maybeSingle();

    let existingUser = null;
    
    // ถ้ามี profile แสดงว่ามี user อยู่แล้ว
    if (existingProfile) {
      // ดึง user info โดยตรง (เร็วกว่า listUsers)
      const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(
        existingProfile.id
      );
      
      if (!getUserError && userData?.user) {
        existingUser = userData.user;
      }
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

    if (!existingUser) {
      // ยังไม่มี user ใน Supabase → สร้างใหม่ โดยใช้ mem_pass เป็น password (ปรับความยาวให้ถูกต้อง)
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: supabaseEmail,
          password: safePassword,
          email_confirm: true,
        });

      if (createError || !newUser?.user) {
        console.error("Error creating auth user:", createError);
        return new Response(
          JSON.stringify({ ok: false, error: "AUTH_CREATE_ERROR", message: createError?.message }),
          { status: 500, headers: jsonHeaders },
        );
      }

      userId = newUser.user.id;
    } else {
      // มี user แล้ว → อัปเดตรหัสผ่านให้ตรงกับ mem_pass ปัจจุบัน (ปรับความยาวให้ถูกต้อง)
      // อัปเดตทุกครั้งที่ login เพื่อให้ password ตรงกับ HMPM เสมอ
      // ทำแบบ non-blocking (ไม่รอผลลัพธ์) เพื่อให้เร็วขึ้น
      adminClient.auth.admin.updateUserById(existingUser.id, {
        password: safePassword,
      }).catch((err) => {
        // Log error แต่ไม่ block flow
        console.warn("Password update failed (non-blocking):", err.message);
      });
      
      userId = existingUser.id;
    }

    // upsert profile (รวมข้อมูล HMPM)
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

    if (profileError) {
      console.error("Error upserting profile:", profileError);
      return new Response(
        JSON.stringify({ ok: false, error: "PROFILE_UPSERT_ERROR" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    // ตรวจว่ามีกระเป๋า/สถิติ streak หรือยัง ถ้าไม่มีก็สร้าง (ทำแบบ parallel)
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

    // สร้าง wallet และ streak แบบ parallel ถ้ายังไม่มี
    const insertPromises: Promise<any>[] = [];
    if (!walletResult.data) {
      insertPromises.push(adminClient.from("user_wallet").insert({ user_id: userId }));
    }
    if (!streakResult.data) {
      insertPromises.push(adminClient.from("user_streaks").insert({ user_id: userId }));
    }
    
    if (insertPromises.length > 0) {
      await Promise.all(insertPromises);
    }

    // ส่งกลับ safePassword เพื่อให้ frontend ใช้ login
    // แต่ไม่ส่งใน response เพื่อความปลอดภัย (frontend จะคำนวณเอง)
    return new Response(
      JSON.stringify({
        ok: true,
        supabase_email: supabaseEmail,
        hmpm_profile: member,
        // ส่งกลับ password_length_hint เพื่อให้ frontend รู้ว่าต้องใช้ safePassword
        password_length_hint: memPass.length < 6 ? "padded" : "original",
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    console.error("Unexpected error in hmpm-login:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "INTERNAL_ERROR", detail: String(e) }),
      { status: 500, headers: jsonHeaders },
    );
  }
});

