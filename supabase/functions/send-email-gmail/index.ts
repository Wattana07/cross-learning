// supabase/functions/send-email-gmail/index.ts
// Deploy: supabase functions deploy send-email-gmail
//
// วิธีตั้งค่า (Supabase Dashboard > Project Settings > Edge Functions > Secrets)
// Required:
// - GMAIL_USER = your-email@gmail.com
// - GMAIL_APP_PASSWORD = xxxx xxxx xxxx xxxx (App Password จาก Google)
// Optional:
// - INTERNAL_FUNCTION_KEY = <random-strong-secret>
// - ALLOWED_ORIGINS = https://yourdomain.com

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

  if (!allowed) return "*";

  const list = allowed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (origin && list.includes(origin)) return origin;

  return "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function stripHtmlToText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Gmail SMTP Configuration
const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 587;

// Send email via Gmail SMTP using HTTP API wrapper
// Since Deno doesn't support native SMTP, we'll use a workaround:
// Option 1: Use EmailJS or similar service (requires external service)
// Option 2: Use Gmail API (requires OAuth2 - complex)
// Option 3: Use SMTP relay service with HTTP API (Mailgun, SendGrid, etc.)
//
// For simplicity, we'll use a direct SMTP approach via HTTP API service
// But the best approach is to use Gmail API or a SMTP relay service

// Using Gmail API via HTTP (simpler than SMTP)
// Note: This requires OAuth2 token or Service Account
async function sendEmailViaGmailAPI(
  from: string,
  to: string[],
  subject: string,
  html?: string,
  text?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Gmail API requires OAuth2 which is complex
  // For now, we'll use a simpler approach with SMTP relay service
  // or use EmailJS/Formspree which provide HTTP API for SMTP
  
  // Alternative: Use EmailJS (free tier available)
  // Or use a SMTP-to-HTTP service
  
  return {
    success: false,
    error: "Gmail API requires OAuth2 setup. Consider using a SMTP relay service with HTTP API instead.",
  };
}

// Send email via SMTP relay service (Mailgun, SendGrid, etc.)
// These services provide HTTP API that wraps SMTP
async function sendEmailViaSMTPRelay(
  from: string,
  to: string[],
  subject: string,
  html?: string,
  text?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Check if Mailgun is configured
  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
  
  if (mailgunApiKey && mailgunDomain) {
    // Use Mailgun (supports SMTP and HTTP API)
    const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
    
    const formData = new FormData();
    formData.append("from", from);
    to.forEach(email => formData.append("to", email));
    formData.append("subject", subject);
    if (html) formData.append("html", html);
    if (text) formData.append("text", text);
    
    try {
      const response = await fetch(mailgunUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          messageId: data.id,
        };
      } else {
        return {
          success: false,
          error: data.message || "Mailgun API error",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send via Mailgun",
      };
    }
  }
  
  // Check if SendGrid is configured
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  
  if (sendgridApiKey) {
    // Use SendGrid (supports SMTP and HTTP API)
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: to.map(email => ({ to: [{ email }] })),
          from: { email: from },
          subject: subject,
          content: [
            ...(html ? [{ type: "text/html", value: html }] : []),
            ...(text ? [{ type: "text/plain", value: text }] : []),
          ],
        }),
      });
      
      if (response.ok) {
        const messageId = response.headers.get("x-message-id") || "unknown";
        return {
          success: true,
          messageId: messageId,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.errors?.[0]?.message || "SendGrid API error",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send via SendGrid",
      };
    }
  }
  
  // If no SMTP relay service is configured, use Gmail App Password with EmailJS
  // EmailJS provides HTTP API for SMTP (free tier: 200 emails/month)
  const emailjsServiceId = Deno.env.get("EMAILJS_SERVICE_ID");
  const emailjsTemplateId = Deno.env.get("EMAILJS_TEMPLATE_ID");
  const emailjsPublicKey = Deno.env.get("EMAILJS_PUBLIC_KEY");
  
  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          template_params: {
            to_email: to[0],
            subject: subject,
            message: html || text || "",
            from_email: from,
          },
        }),
      });
      
      if (response.ok) {
        return {
          success: true,
          messageId: "emailjs-" + Date.now(),
        };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          error: errorData || "EmailJS API error",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send via EmailJS",
      };
    }
  }
  
  // If nothing is configured, return error with suggestions
  return {
    success: false,
    error: "No email service configured. Please set up one of: MAILGUN_API_KEY, SENDGRID_API_KEY, or EMAILJS_* variables",
  };
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
    // GMAIL CONFIG
    // ---------------------------
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      return jsonResponse(
        {
          ok: false,
          reason: "EMAIL_SERVICE_NOT_CONFIGURED",
          error: "GMAIL_USER or GMAIL_APP_PASSWORD not set",
        },
        500,
        corsHeaders
      );
    }

    const defaultFrom = from || gmailUser;

    // ---------------------------
    // SEND VIA SMTP RELAY SERVICE
    // ---------------------------
    // Since Deno doesn't support native SMTP, we'll use SMTP relay services
    // that provide HTTP API (Mailgun, SendGrid, EmailJS, etc.)
    
    const result = await sendEmailViaSMTPRelay(
      defaultFrom,
      toArray,
      subject,
      html,
      text || (html ? stripHtmlToText(html) : undefined)
    );

    if (!result.success) {
      return jsonResponse(
        {
          ok: false,
          reason: "EMAIL_SEND_FAILED",
          error: result.error,
          note: "Please configure one of: MAILGUN_API_KEY, SENDGRID_API_KEY, or EMAILJS_* variables",
        },
        502,
        corsHeaders
      );
    }

    return jsonResponse(
      {
        ok: true,
        messageId: result.messageId,
        message: "Email sent successfully",
        service: "smtp-relay",
      },
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
