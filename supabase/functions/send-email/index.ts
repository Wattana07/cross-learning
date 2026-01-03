// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
//
// วิธีตั้งค่า (Supabase Dashboard > Project Settings > Edge Functions > Secrets)
// Required:
// - RESEND_API_KEY = <your-resend-api-key>
// Optional (recommended):
// - INTERNAL_FUNCTION_KEY = <random-strong-secret>    // สำหรับเรียกจาก backend/edge function ภายใน
// - DEFAULT_FROM = "Your Brand <noreply@yourdomain.com>"
// - ALLOWED_ORIGINS = https://yourdomain.com,https://admin.yourdomain.com  // ถ้าไม่ตั้ง จะเป็น *

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function getAllowOrigin(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();

  // ถ้าไม่ได้ตั้ง ALLOWED_ORIGINS ให้เปิดกว้างเหมือนเดิม
  if (!allowed) return "*";

  const list = allowed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (origin && list.includes(origin)) return origin;

  // ไม่อนุญาต origin อื่น
  return "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function stripHtmlToText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  const allowOrigin = getAllowOrigin(req);
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin || "*",
  };

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-internal-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Allow only POST
  if (req.method !== "POST") {
    return jsonResponse(
      { ok: false, reason: "METHOD_NOT_ALLOWED" },
      405,
      corsHeaders
    );
  }

  try {
    // ---------------------------
    // AUTH POLICY
    // 1) Internal call: x-internal-key matches INTERNAL_FUNCTION_KEY
    // 2) External call: Authorization Bearer JWT must be valid (auth.getUser)
    // ---------------------------
    const internalKeySecret = (Deno.env.get("INTERNAL_FUNCTION_KEY") || "").trim();
    const internalKeyHeader = (req.headers.get("x-internal-key") || "").trim();
    const isInternalCall =
      internalKeySecret.length > 0 && internalKeyHeader === internalKeySecret;

    if (!isInternalCall) {
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : "";

      if (!jwt) {
        return jsonResponse(
          { ok: false, reason: "UNAUTHORIZED", error: "Missing Bearer token" },
          401,
          corsHeaders
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });

      const { data, error } = await userClient.auth.getUser();
      if (error || !data?.user) {
        return jsonResponse(
          {
            ok: false,
            reason: "UNAUTHORIZED",
            error: error?.message || "Invalid JWT",
          },
          401,
          corsHeaders
        );
      }
    }

    // ---------------------------
    // BODY
    // ---------------------------
    let body: EmailOptions;
    try {
      body = (await req.json()) as EmailOptions;
    } catch {
      return jsonResponse({ ok: false, reason: "INVALID_JSON" }, 400, corsHeaders);
    }

    const { to, subject, html, text, from } = body;

    // ---------------------------
    // VALIDATION
    // ---------------------------
    if (!to || !subject) {
      return jsonResponse(
        { ok: false, reason: "MISSING_FIELDS", fields: ["to", "subject"] },
        400,
        corsHeaders
      );
    }

    if (!html && !text) {
      return jsonResponse(
        { ok: false, reason: "MISSING_CONTENT", error: "Provide html or text" },
        400,
        corsHeaders
      );
    }

    const toArray = Array.isArray(to) ? to : [to];

    // anti-abuse: จำกัดจำนวนผู้รับ
    if (toArray.length > 5) {
      return jsonResponse(
        { ok: false, reason: "TOO_MANY_RECIPIENTS", max: 5 },
        400,
        corsHeaders
      );
    }

    for (const e of toArray) {
      const email = String(e).trim();
      if (!isValidEmail(email)) {
        return jsonResponse(
          { ok: false, reason: "INVALID_EMAIL", email },
          400,
          corsHeaders
        );
      }
    }

    // ---------------------------
    // RESEND CONFIG
    // ---------------------------
    const resendApiKey =
      Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");

    if (!resendApiKey) {
      return jsonResponse(
        { ok: false, reason: "EMAIL_SERVICE_NOT_CONFIGURED" },
        500,
        corsHeaders
      );
    }

    const defaultFrom =
      (Deno.env.get("DEFAULT_FROM") || "").trim() || "onboarding@resend.dev";

    const emailPayload: Record<string, unknown> = {
      from: (from || defaultFrom).trim(),
      to: toArray.map((x) => String(x).trim()),
      subject: String(subject),
    };

    if (html) emailPayload.html = String(html);
    if (text) emailPayload.text = String(text);
    else if (html) emailPayload.text = stripHtmlToText(String(html));

    // ---------------------------
    // SEND
    // ---------------------------
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return jsonResponse(
        {
          ok: false,
          reason: "EMAIL_SEND_FAILED",
          status: resendResponse.status,
          error: resendData,
        },
        502,
        corsHeaders
      );
    }

    return jsonResponse(
      { ok: true, messageId: (resendData as any)?.id, message: "Email sent successfully" },
      200,
      corsHeaders
    );
  } catch (error: any) {
    return jsonResponse(
      { ok: false, reason: "SERVER_ERROR", error: error?.message || String(error) },
      500,
      corsHeaders
    );
  }
});
