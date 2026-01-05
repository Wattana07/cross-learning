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

        // Get production site URL for login link - use Vercel URL
        let productionUrl = 'https://cross-learning.vercel.app';
        
        // Fallback to provided siteUrl if different from default
        if (siteUrl && siteUrl.includes('cross-learning.vercel.app')) {
          productionUrl = siteUrl.replace(/\/$/, '');
        } else if (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
          productionUrl = siteUrl.replace(/\/$/, '');
        }
        
        if (productionUrl && !productionUrl.startsWith('https://')) {
          productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
        }
        const loginUrl = `${productionUrl}/login`;

        // Prepare email content with password - Modern, beautiful design
        const emailHtml = `
              <!DOCTYPE html>
              <html lang="th">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { 
                    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                    line-height: 1.7; 
                    color: #1f2937; 
                    background: #f0f9ff;
                    padding: 40px 20px;
                  }
                  .email-wrapper {
                    max-width: 600px; 
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(37, 99, 235, 0.15);
                    border: 1px solid #e0f2fe;
                  }
                  .header { 
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    color: white; 
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                  }
                  .header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: pulse 3s ease-in-out infinite;
                  }
                  @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                  }
                  .header h1 { 
                    margin: 0; 
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                    position: relative;
                    z-index: 1;
                  }
                  .header-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                    display: block;
                    position: relative;
                    z-index: 1;
                  }
                  .content { 
                    background: #ffffff; 
                    padding: 40px 30px; 
                  }
                  .greeting {
                    font-size: 18px;
                    color: #374151;
                    margin-bottom: 20px;
                  }
                  .greeting strong {
                    color: #0284c7;
                    font-weight: 600;
                  }
                  .intro-text {
                    color: #475569;
                    font-size: 16px;
                    margin-bottom: 30px;
                    line-height: 1.8;
                  }
                  .password-section {
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border: 2px dashed #7dd3fc;
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    text-align: center;
                    position: relative;
                  }
                  .password-label {
                    color: #0369a1;
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 15px;
                  }
                  .password { 
                    font-family: 'Courier New', 'SF Mono', Monaco, monospace; 
                    font-size: 32px; 
                    font-weight: 700; 
                    color: #0284c7; 
                    letter-spacing: 4px;
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
                    border: 1px solid #bae6fd;
                    display: inline-block;
                    min-width: 280px;
                    word-break: break-all;
                  }
                  .warning { 
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border-left: 4px solid #f59e0b; 
                    padding: 18px 20px; 
                    margin: 30px 0; 
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
                  }
                  .warning p {
                    margin: 0; 
                    font-size: 14px; 
                    color: #92400e;
                    line-height: 1.6;
                  }
                  .warning strong {
                    font-weight: 600;
                  }
                  .button-container {
                    text-align: center; 
                    margin: 40px 0;
                  }
                  .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    color: white; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 10px; 
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 8px 20px rgba(2, 132, 199, 0.4);
                    transition: all 0.3s ease;
                    letter-spacing: 0.5px;
                  }
                  .button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(2, 132, 199, 0.5);
                  }
                  .link-text {
                    margin-top: 25px;
                    font-size: 14px; 
                    color: #64748b;
                    text-align: center;
                  }
                  .link-text a {
                    color: #0284c7;
                    text-decoration: none;
                    font-weight: 500;
                  }
                  .link-text a:hover {
                    text-decoration: underline;
                  }
                  .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    padding-top: 30px;
                    border-top: 1px solid #e5e7eb;
                    color: #9ca3af; 
                    font-size: 13px;
                    line-height: 1.8;
                  }
                  .footer p {
                    margin: 5px 0;
                  }
                  .divider {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
                    margin: 30px 0;
                  }
                  @media only screen and (max-width: 600px) {
                    body { padding: 20px 10px; }
                    .header { padding: 30px 20px; }
                    .header h1 { font-size: 24px; }
                    .content { padding: 30px 20px; }
                    .password { font-size: 24px; letter-spacing: 2px; min-width: auto; padding: 15px; }
                    .button { padding: 14px 30px; font-size: 15px; }
                  }
                </style>
              </head>
              <body>
                <div class="email-wrapper">
                  <div class="header">
                    <span class="header-icon">🎉</span>
                    <h1>ยินดีต้อนรับสู่ระบบ</h1>
                  </div>
                  <div class="content">
                    <div class="greeting">
                      สวัสดีคุณ <strong>${fullName}</strong>,
                    </div>
                    <p class="intro-text">
                      บัญชีของคุณถูกสร้างเรียบร้อยแล้ว! คุณสามารถใช้รหัสผ่านด้านล่างเพื่อเข้าสู่ระบบได้ทันที
                    </p>
                    
                    <div class="password-section">
                      <div class="password-label">🔐 รหัสผ่านของคุณ</div>
                      <div class="password">${generatedPassword}</div>
                    </div>
                    
                    <div class="warning">
                      <p>
                        <strong>⚠️ คำเตือนความปลอดภัย:</strong><br>
                        กรุณาเก็บรหัสผ่านนี้ไว้เป็นความลับ และแนะนำให้เปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรกเพื่อความปลอดภัยสูงสุด
                      </p>
                    </div>
                    
                    <div class="button-container">
                      <a href="${loginUrl}" class="button">
                        🚀 เข้าสู่ระบบตอนนี้
                      </a>
                    </div>
                    
                    <div class="link-text">
                      หรือคลิกที่ลิงค์นี้: <a href="${loginUrl}">${loginUrl}</a>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="footer">
                      <p><strong>ระบบจองห้องประชุม</strong></p>
                      <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                      <p style="margin-top: 15px; font-size: 12px; color: #d1d5db;">
                        หากคุณไม่ได้เป็นผู้สร้างบัญชีนี้ กรุณาเพิกเฉยต่ออีเมลนี้
                      </p>
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
            // Disable all tracking to avoid SSL certificate issues and unsafe links
            click_tracking: false,
            open_tracking: false,
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

