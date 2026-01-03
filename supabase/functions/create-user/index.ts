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

    // Generate secure random password
    // Password format: 12 characters with uppercase, lowercase, numbers, and special characters
    const generateSecurePassword = () => {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const special = '!@#$%^&*';
      const allChars = uppercase + lowercase + numbers + special;
      
      let password = '';
      // Ensure at least one of each type
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];
      
      // Fill the rest randomly
      for (let i = password.length; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    const generatedPassword = generateSecurePassword();

    // create auth user with the generated password
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: generatedPassword, // Use generated password directly
      email_confirm: true, // Auto-confirm so user can login immediately
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

    // Send invitation email via Resend API (using API key from request)
    if (generatedPassword) {
      try {
        console.log('Attempting to send invitation email to:', email);
        
        // Use Resend API Key from request body, or fallback to environment variable
        const apiKey = resendApiKey || Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
        
        console.log('Resend API Key check:', {
          hasResendApiKey: !!resendApiKey,
          hasEnvKey: !!Deno.env.get("RESEND_API_KEY"),
          hasEnvKeyLower: !!Deno.env.get("resend_api_key"),
          apiKeyLength: apiKey?.length || 0
        });
        
        if (!apiKey) {
          console.error('Resend API Key not provided - cannot send email');
          return new Response(JSON.stringify({ 
            ok: true, 
            userId: newUser.user.id,
            warning: 'User created but email sending failed - Resend API Key not provided',
            emailError: 'RESEND_API_KEY not found in request body or environment variables'
          }), {
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        // Get production site URL for login link
        let productionUrl = siteUrl || 
          Deno.env.get("SITE_URL") || 
          Deno.env.get("VITE_SITE_URL") ||
          `https://${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.supabase.co`;
        
        if (productionUrl && !productionUrl.startsWith('https://')) {
          productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
        }
        productionUrl = productionUrl.replace(/\/$/, '');
        const loginUrl = `${productionUrl}/login`;

        // Prepare email content with password
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
                  .password-box { background: #fff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
                  .password { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 2px; }
                  .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
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
                    <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว รหัสผ่านของคุณคือ:</p>
                    
                    <div class="password-box">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">รหัสผ่านของคุณ:</p>
                      <div class="password">${generatedPassword}</div>
                    </div>
                    
                    <div class="warning">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>⚠️ คำเตือน:</strong> กรุณาเก็บรหัสผ่านนี้ไว้เป็นความลับ และเปลี่ยนรหัสผ่านหลังจาก login ครั้งแรก
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${loginUrl}" class="button" style="color: white; text-decoration: none;">
                        เข้าสู่ระบบ
                      </a>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                      หรือไปที่: <a href="${loginUrl}" style="color: #4F46E5;">${loginUrl}</a>
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

บัญชีของคุณถูกสร้างเรียบร้อยแล้ว

รหัสผ่านของคุณคือ: ${generatedPassword}

⚠️ คำเตือน: กรุณาเก็บรหัสผ่านนี้ไว้เป็นความลับ และเปลี่ยนรหัสผ่านหลังจาก login ครั้งแรก

เข้าสู่ระบบได้ที่: ${loginUrl}

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            `.trim();

        // Send email directly via Resend API
        console.log('Sending email directly via Resend API to:', email);
        console.log('Email subject:', `ยินดีต้อนรับสู่ระบบ - รหัสผ่านของคุณ`);
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: email,
            subject: `ยินดีต้อนรับสู่ระบบ - รหัสผ่านของคุณ`,
            html: emailHtml,
            text: emailText,
            // Disable click tracking to avoid SSL certificate issues
            click_tracking: false,
          }),
        });

        const resendData = await resendResponse.json();
        
        console.log('Resend API response status:', resendResponse.status);
        console.log('Resend API response data:', JSON.stringify(resendData));

        if (!resendResponse.ok) {
          console.error('Resend API error:', {
            status: resendResponse.status,
            statusText: resendResponse.statusText,
            data: resendData
          });
          return new Response(JSON.stringify({ 
            ok: true, 
            userId: newUser.user.id,
            warning: 'User created but email sending failed',
            emailError: `Resend API error (${resendResponse.status}): ${resendData.message || JSON.stringify(resendData)}`
          }), {
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        console.log('✅ Invitation email sent successfully via Resend:', resendData.id);
        console.log('Email sent to:', email);
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
      console.warn('No password generated, cannot send invitation email');
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: "PASSWORD_GENERATION_FAILED",
        error: 'Failed to generate password for user'
      }), {
        status: 500,
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

