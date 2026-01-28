// supabase/functions/hmpm-api-proxy/index.ts
// Deploy: supabase functions deploy hmpm-api-proxy
//
// หน้าที่: Proxy สำหรับเรียก API HMPM เพื่อหลีกเลี่ยง CORS
// - endpoint: 'token' → เรียก API 1 เพื่อขอ token
// - endpoint: 'member' → เรียก API 2 เพื่อดึงข้อมูลสมาชิก

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json();
    const { endpoint, auth_user, auth_pass, token, mem_id, mem_pass } = body;

    if (endpoint === "token") {
      // API 1: Get Token
      if (!auth_user || !auth_pass) {
        return new Response(
          JSON.stringify({ ok: false, error: "MISSING_CREDENTIALS" }),
          { status: 400, headers: jsonHeaders },
        );
      }

      const tokenBody = new URLSearchParams({
        auth_user,
        auth_pass,
      }).toString();

      console.log("Calling HMPM API 1 for token...");
      console.log("URL:", HMPM_AUTH_URL);
      console.log("Body params:", { auth_user, auth_pass: "***" });

      // ใช้ URL ตามที่ใช้ใน Postman: {{base_url}}/auth/
      const response = await fetch(HMPM_AUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        body: tokenBody,
      });

      console.log("HMPM API 1 response status:", response.status);
      console.log("HMPM API 1 response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not read error");
        console.error("HMPM API 1 error:", response.status, errorText.substring(0, 500));
        return new Response(
          JSON.stringify({
            STATUS: "ERROR",
            STATUS_CODE: response.status,
            MESSAGE: `HTTP ${response.status}: ${response.statusText}`,
            details: {
              url: HMPM_AUTH_URL,
              error_body: errorText.substring(0, 500),
            },
          }),
          { status: 200, headers: jsonHeaders },
        );
      }

      const data = await response.json();
      console.log("HMPM API 1 - Success! Got data:", { STATUS: data.STATUS, has_token: !!data.DATA?.access_token });
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: jsonHeaders,
      });
    } else if (endpoint === "member") {
      // API 2: Get Member Info
      if (!token || !mem_id || !mem_pass) {
        return new Response(
          JSON.stringify({ ok: false, error: "MISSING_PARAMETERS" }),
          { status: 400, headers: jsonHeaders },
        );
      }

      const memberBody = new URLSearchParams({
        mem_id,
        mem_pass,
      }).toString();

      console.log("Calling HMPM API 2 for member info...");
      console.log("URL:", HMPM_MEMBER_URL);
      console.log("Using token:", token ? `${token.substring(0, 20)}...` : "null");

      const response = await fetch(HMPM_MEMBER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: memberBody,
      });

      console.log("HMPM API 2 response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not read error");
        console.error("HMPM API 2 error:", response.status, errorText);
        return new Response(
          JSON.stringify({
            STATUS: "ERROR",
            STATUS_CODE: response.status,
            MESSAGE: `HTTP ${response.status}: ${response.statusText}`,
          }),
          { status: 200, headers: jsonHeaders },
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: jsonHeaders,
      });
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: "INVALID_ENDPOINT" }),
        { status: 400, headers: jsonHeaders },
      );
    }
  } catch (e) {
    console.error("Unexpected error in hmpm-api-proxy:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "INTERNAL_ERROR", detail: String(e) }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
