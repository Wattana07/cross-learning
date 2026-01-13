// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
//
// วิธีตั้งค่า (Supabase Dashboard > Project Settings > Edge Functions > Secrets)
// Required:
// - RESEND_API_KEY = <your-resend-api-key>
// Optional:
// - INTERNAL_FUNCTION_KEY = <random-strong-secret>
// - ALLOWED_ORIGINS = https://yourdomain.com
//
// Note: Supabase Edge Functions may not support direct SMTP connections,
// so we use Resend API (HTTP-based) instead

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
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function stripHtmlToText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Send email via Resend API (HTTP-based, no SMTP needed)
// Resend provides HTTP API and doesn't require domain verification for testing
async function sendEmailViaGmailSMTP(
  from: string,
  to: string[],
  subject: string,
  html?: string,
  text?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  console.log('[sendEmailViaGmailSMTP] Starting...', { from, to, subject });
  
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  console.log('[sendEmailViaGmailSMTP] Config check:', {
    resendApiKey: !!resendApiKey,
  });

  if (!resendApiKey) {
    console.error('[sendEmailViaGmailSMTP] Missing Resend API key');
    return {
      success: false,
      error: "RESEND_API_KEY not configured in Supabase Secrets. Please add it in Project Settings > Edge Functions > Secrets",
    };
  }

  try {
    console.log('[sendEmailViaGmailSMTP] Calling Resend API...');
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from,
        to: to,
        subject: subject,
        html: html,
        text: text || (html ? stripHtmlToText(html) : undefined),
      }),
    });

    console.log('[sendEmailViaGmailSMTP] Resend response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[sendEmailViaGmailSMTP] Resend success:', data);
      return {
        success: true,
        messageId: data.id || `resend-${Date.now()}`,
      };
    } else {
      const errorData = await response.json().catch(async () => {
        return { message: await response.text().catch(() => "Unknown error") };
      });
      console.error('[sendEmailViaGmailSMTP] Resend error:', errorData);
      return {
        success: false,
        error: `Resend error (${response.status}): ${errorData.message || JSON.stringify(errorData)}`,
      };
    }
  } catch (error: any) {
    console.error('[sendEmailViaGmailSMTP] Resend exception:', error);
    return {
      success: false,
      error: `Resend request failed: ${error.message}`,
    };
  }
}

Deno.serve(async (req) => {
  console.log('[send-email] Function called, method:', req.method);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
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
    console.log('[send-email] Starting authentication check...');
    
    // Authentication check
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    
    if (!jwt) {
      console.error('[send-email] No JWT token found');
      return jsonResponse(
        { ok: false, reason: "UNAUTHORIZED", error: "Missing Bearer token" },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !anonKey) {
      console.error('[send-email] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return jsonResponse(
        { ok: false, reason: "CONFIG_ERROR", error: "Missing Supabase configuration" },
        500
      );
    }

    console.log('[send-email] Creating user client...');
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    console.log('[send-email] Verifying user...');
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      console.error('[send-email] Auth error:', authError?.message);
      return jsonResponse(
        {
          ok: false,
          reason: "UNAUTHORIZED",
          error: authError?.message || "Invalid JWT",
        },
        401
      );
    }

    console.log('[send-email] User authenticated:', userData.user.id);

    // Parse request body
    console.log('[send-email] Parsing request body...');
    let body: EmailOptions;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('[send-email] JSON parse error:', parseError);
      return jsonResponse(
        { ok: false, reason: "INVALID_JSON", error: parseError.message },
        400
      );
    }
    
    const { to, subject, html, text, from } = body;
    console.log('[send-email] Request body parsed:', { to, subject, hasHtml: !!html, hasText: !!text });

    // Validation
    console.log('[send-email] Validating request...');
    if (!to || !subject) {
      console.error('[send-email] Missing required fields');
      return jsonResponse(
        { ok: false, reason: "MISSING_FIELDS", error: "to and subject are required" },
        400
      );
    }

    if (!html && !text) {
      console.error('[send-email] Missing content (html or text)');
      return jsonResponse(
        { ok: false, reason: "MISSING_CONTENT", error: "html or text is required" },
        400
      );
    }

    const toArray = Array.isArray(to) ? to : [to];

    // Limit recipients (anti-abuse)
    if (toArray.length > 5) {
      return jsonResponse(
        { ok: false, reason: "TOO_MANY_RECIPIENTS", max: 5 },
        400
      );
    }

    // Validate emails
    for (const email of toArray) {
      if (!isValidEmail(email)) {
        return jsonResponse(
          { ok: false, reason: "INVALID_EMAIL", email },
          400
        );
      }
    }

    // Get email config
    console.log('[send-email] Getting email config...');
    const defaultFrom = from || "webmaster@happympm.com";

    console.log('[send-email] Config check:', {
      gmailUser: !!gmailUser,
      gmailPassword: !!gmailPassword,
      defaultFrom,
    });

    // Send email
    console.log('[send-email] Calling sendEmailViaGmailSMTP...');
    const result = await sendEmailViaGmailSMTP(
      defaultFrom,
      toArray,
      subject,
      html,
      text || (html ? stripHtmlToText(html) : undefined)
    );

    console.log('[send-email] Send result:', { success: result.success, error: result.error });

    if (!result.success) {
      return jsonResponse(
        {
          ok: false,
          reason: "EMAIL_SEND_FAILED",
          error: result.error || "Unknown error",
        },
        500
      );
    }

    console.log('[send-email] Email sent successfully!');
    return jsonResponse({
      ok: true,
      messageId: result.messageId,
      service: "gmail-smtp",
    });

  } catch (error: any) {
    console.error("[send-email] Exception:", error);
    console.error("[send-email] Error stack:", error.stack);
    return jsonResponse(
      {
        ok: false,
        reason: "SERVER_ERROR",
        error: error.message || String(error),
        stack: error.stack,
      },
      500
    );
  }
});
