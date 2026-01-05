// supabase/functions/reset-user-password/index.ts
// Deploy: supabase functions deploy reset-user-password

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  userId: string;
  resendApiKey?: string;
  siteUrl?: string;
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    
    // Check if caller is admin
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
    const { userId, resendApiKey, siteUrl } = body;

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_USER_ID" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ ok: false, reason: "USER_NOT_FOUND" }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate secure random password
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

    const newPassword = generateSecurePassword();

    // Update user password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: "UPDATE_FAILED", 
        error: updateError.message 
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Send email with new password
    const apiKey = resendApiKey || Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
    
    if (apiKey) {
      try {
        let productionUrl = siteUrl || 
          Deno.env.get("SITE_URL") || 
          Deno.env.get("VITE_SITE_URL") ||
          `https://cross-learning.vercel.app`;
        
        if (productionUrl && !productionUrl.startsWith('https://')) {
          productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
        }
        productionUrl = productionUrl.replace(/\/$/, '');
        const loginUrl = `${productionUrl}/login`;

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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
              }
              .email-wrapper {
                max-width: 600px; 
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 { 
                margin: 0; 
                font-size: 28px;
                font-weight: 700;
              }
              .header-icon {
                font-size: 48px;
                margin-bottom: 10px;
                display: block;
              }
              .content { 
                background: #ffffff; 
                padding: 40px 30px; 
              }
              .password-box {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 2px dashed #cbd5e1;
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
              }
              .password {
                font-family: 'Courier New', 'SF Mono', Monaco, monospace; 
                font-size: 32px; 
                font-weight: 700; 
                color: #667eea; 
                letter-spacing: 4px;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
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
              }
              .button-container {
                text-align: center; 
                margin: 40px 0;
              }
              .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 16px 40px; 
                text-decoration: none; 
                border-radius: 10px; 
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
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
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="header">
                <span class="header-icon">🔑</span>
                <h1>รหัสผ่านใหม่ของคุณ</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                  สวัสดีคุณ <strong style="color: #667eea;">${userProfile.full_name || 'ผู้ใช้'}</strong>,
                </p>
                <p style="color: #6b7280; font-size: 16px; margin-bottom: 30px; line-height: 1.8;">
                  รหัสผ่านของคุณถูกรีเซ็ตแล้ว กรุณาใช้รหัสผ่านใหม่ด้านล่างเพื่อเข้าสู่ระบบ
                </p>
                
                <div class="password-box">
                  <div style="color: #64748b; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">
                    🔐 รหัสผ่านใหม่
                  </div>
                  <div class="password">${newPassword}</div>
                </div>
                
                <div class="warning">
                  <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                    <strong>⚠️ คำเตือนความปลอดภัย:</strong><br>
                    กรุณาเก็บรหัสผ่านนี้ไว้เป็นความลับ และแนะนำให้เปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรกเพื่อความปลอดภัยสูงสุด
                  </p>
                </div>
                
                <div class="button-container">
                  <a href="${loginUrl}" class="button" style="color: white; text-decoration: none;">
                    🚀 เข้าสู่ระบบตอนนี้
                  </a>
                </div>
                
                <div class="footer">
                  <p><strong>ระบบจองห้องประชุม</strong></p>
                  <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                  <p style="margin-top: 15px; font-size: 12px; color: #d1d5db;">
                    หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่านนี้ กรุณาเพิกเฉยต่ออีเมลนี้
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailText = `
รหัสผ่านใหม่ของคุณ

สวัสดีคุณ ${userProfile.full_name || 'ผู้ใช้'},

รหัสผ่านของคุณถูกรีเซ็ตแล้ว กรุณาใช้รหัสผ่านใหม่ด้านล่างเพื่อเข้าสู่ระบบ

รหัสผ่านใหม่: ${newPassword}

⚠️ คำเตือนความปลอดภัย: กรุณาเก็บรหัสผ่านนี้ไว้เป็นความลับ และแนะนำให้เปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก

เข้าสู่ระบบได้ที่: ${loginUrl}

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
        `.trim();

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: userProfile.email,
            subject: `🔑 รหัสผ่านใหม่ของคุณ`,
            html: emailHtml,
            text: emailText,
            click_tracking: false,
          }),
        });

        const emailResult = await emailResponse.json();
        if (emailResponse.ok) {
          console.log('✅ Password reset email sent:', emailResult.id);
        } else {
          console.error('Failed to send password reset email:', emailResult);
        }
      } catch (emailError: any) {
        console.error('Error sending password reset email:', emailError);
        // Don't fail if email fails, password is already reset
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Password reset successfully',
      password: newPassword, // Return password so admin can see it
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (e) {
    console.error('Reset password error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

