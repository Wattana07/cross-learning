// supabase/functions/create-user/index.ts
// Deploy: supabase functions deploy create-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  email: string;
  fullName: string;
  department?: string;
  role?: 'learner' | 'admin';
  resendApiKey?: string; // Optional: Resend API Key from frontend
  siteUrl?: string; // Optional: Production site URL for redirect (e.g., https://yourdomain.com)
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
    const { email, fullName, department, role = 'learner', resendApiKey, siteUrl } = body;

    if (!email || !fullName) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_FIELDS" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate temporary password (user will reset it via email)
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!';

    // create auth user with temporary password
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword, // Temporary password, user will reset it via email
      email_confirm: true, // Auto-confirm so user can reset password
    });

    if (authError) {
      return new Response(JSON.stringify({ ok: false, reason: "AUTH_ERROR", error: authError.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: newUser.user.id,
      email,
      full_name: fullName,
      department: department ?? null,
      role,
      is_active: true,
    });

    if (profileError) {
      // rollback: delete auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ ok: false, reason: "PROFILE_ERROR", error: profileError.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // create wallet & streaks
    await adminClient.from("user_wallet").insert({ user_id: newUser.user.id });
    await adminClient.from("user_streaks").insert({ user_id: newUser.user.id });

    // Get production site URL (from request or environment)
    // Priority: request body > environment variable > default to Supabase project URL
    let productionUrl = siteUrl || 
      Deno.env.get("SITE_URL") || 
      Deno.env.get("VITE_SITE_URL") ||
      `https://${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.supabase.co`; // Fallback to project URL
    
    // Ensure URL uses HTTPS (security requirement)
    if (productionUrl && !productionUrl.startsWith('https://')) {
      productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
      console.warn('URL was HTTP, converted to HTTPS:', productionUrl);
    }
    
    // Ensure URL doesn't end with slash
    productionUrl = productionUrl.replace(/\/$/, '');
    
    // Generate password recovery link with proper redirect URL
    let recoveryLink = '';
    try {
      // Determine redirect URL - should point to your frontend's login page (Supabase will handle the reset)
      // Supabase recovery link will redirect to this URL after password reset
      const redirectTo = `${productionUrl}/login`; // Redirect to login page after password reset
      
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectTo,
        },
      });

      if (linkError) {
        console.error('Error generating recovery link:', linkError);
      } else {
        recoveryLink = linkData.properties.action_link;
        console.log('Recovery link generated:', recoveryLink);
        console.log('Redirect URL:', redirectTo);
      }
    } catch (linkGenError) {
      console.error('Error generating recovery link:', linkGenError);
    }

    // Send invitation email via Resend API (using API key from request)
    if (recoveryLink) {
      try {
        console.log('Attempting to send invitation email to:', email);
        
        // Use Resend API Key from request body, or fallback to environment variable
        const apiKey = resendApiKey || Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
        
        if (!apiKey) {
          console.error('Resend API Key not provided - cannot send email');
          return new Response(JSON.stringify({ 
            ok: true, 
            userId: newUser.user.id,
            warning: 'User created but email sending failed - Resend API Key not provided',
          }), {
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        // Prepare email content
        const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">ยินดีต้อนรับสู่ระบบ</h1>
                  </div>
                  <div class="content">
                    <p>สวัสดีคุณ <strong>${fullName}</strong>,</p>
                    <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านของคุณ:</p>
                    
                    <div style="text-align: center;">
                      <a href="${recoveryLink}" class="button" style="color: white; text-decoration: none;">
                        ตั้งรหัสผ่าน
                      </a>
                    </div>
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                      หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
                      <a href="${recoveryLink}" style="color: #4F46E5; word-break: break-all;">${recoveryLink}</a>
                    </p>
                    
                    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                      <strong>หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง
                    </p>
                    
                    <div class="footer">
                      <p>ระบบจองห้องประชุม</p>
                      <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `;

        const emailText = `
ยินดีต้อนรับสู่ระบบ

สวัสดีคุณ ${fullName},

บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านของคุณ:

${recoveryLink}

หมายเหตุ: ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            `.trim();

        // Send email directly via Resend API
        console.log('Sending email directly via Resend API');
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: email,
            subject: `ยินดีต้อนรับสู่ระบบ - ตั้งรหัสผ่านของคุณ`,
            html: emailHtml,
            text: emailText,
            // Disable click tracking to avoid SSL certificate issues
            click_tracking: false,
          }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error('Resend API error:', resendData);
          return new Response(JSON.stringify({ 
            ok: true, 
            userId: newUser.user.id,
            warning: 'User created but email sending failed',
            emailError: resendData.message || JSON.stringify(resendData)
          }), {
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        console.log('✅ Invitation email sent successfully via Resend:', resendData.id);
      } catch (emailError: any) {
        console.error('Error sending invitation email:', emailError);
        // Return success but with warning
        return new Response(JSON.stringify({ 
          ok: true, 
          userId: newUser.user.id,
          warning: 'User created but email sending failed',
          emailError: emailError.message || String(emailError)
        }), {
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    } else {
      console.warn('No recovery link generated, cannot send invitation email');
      return new Response(JSON.stringify({ 
        ok: true, 
        userId: newUser.user.id,
        warning: 'User created but recovery link generation failed',
      }), {
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      userId: newUser.user.id,
      message: 'User created successfully. Invitation email sent.' 
    }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

