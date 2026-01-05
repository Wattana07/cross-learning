// supabase/functions/create-booking/index.ts
// Deploy: supabase functions deploy create-booking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  roomId: string;
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  email?: string; // Optional contact email
  resendApiKey?: string; // Optional: Resend API Key from frontend
  siteUrl?: string; // Optional: Production site URL
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
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const body = (await req.json()) as Body;
    const { roomId, title, description, startAt, endAt, email, resendApiKey, siteUrl } = body;

    if (!roomId || !title || !startAt || !endAt) {
      return new Response(JSON.stringify({ ok: false, reason: "BAD_REQUEST" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!(end > start)) {
      return new Response(JSON.stringify({ ok: false, reason: "INVALID_TIME" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // check not in the past
    if (start < new Date()) {
      return new Response(JSON.stringify({ ok: false, reason: "CANNOT_BOOK_PAST" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check must be at least 7 days in advance
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    minDate.setHours(0, 0, 0, 0);
    const bookingDate = new Date(start);
    bookingDate.setHours(0, 0, 0, 0);
    
    if (bookingDate < minDate) {
      return new Response(JSON.stringify({ ok: false, reason: "TOO_SOON", minDate: minDate.toISOString() }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // check user is active
    const userProfileCheck = await adminClient.from("profiles").select("is_active").eq("id", userId).single();
    if (!userProfileCheck.data?.is_active) {
      return new Response(JSON.stringify({ ok: false, reason: "USER_INACTIVE" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // check room active and get room details
    const room = await adminClient.from("rooms").select("id, name, location, status").eq("id", roomId).single();
    if (room.error) {
      return new Response(JSON.stringify({ ok: false, reason: "ROOM_NOT_FOUND" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    if (room.data.status !== "active") {
      return new Response(JSON.stringify({ ok: false, reason: "ROOM_NOT_ACTIVE" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get user profile for email
    const userProfile = await adminClient.from("profiles").select("full_name, email").eq("id", userId).single();
    const userEmail = email || userProfile.data?.email || userData?.user?.email;
    const userName = userProfile.data?.full_name || 'ผู้ใช้';

    // overlap check with blocks
    const blocks = await adminClient
      .from("room_blocks")
      .select("id")
      .eq("room_id", roomId)
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());

    if ((blocks.data ?? []).length > 0) {
      return new Response(JSON.stringify({ ok: false, reason: "BLOCKED" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // overlap check with bookings (active statuses)
    const bookings = await adminClient
      .from("room_bookings")
      .select("id,status")
      .eq("room_id", roomId)
      .in("status", ["approved","pending"])
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());

    if ((bookings.data ?? []).length > 0) {
      return new Response(JSON.stringify({ ok: false, reason: "TIME_CONFLICT" }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // create booking
    const ins = await adminClient.from("room_bookings").insert({
      room_id: roomId,
      booked_by_user_id: userId,
      title,
      description: description ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "pending",
    }).select("*").single();

    if (ins.error) {
      return new Response(JSON.stringify({ ok: false, reason: "INSERT_FAIL", error: ins.error.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Send email notifications
    if (userEmail) {
      try {
        // Get Resend API Key
        const apiKey = resendApiKey || Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
        
        if (apiKey) {
          // Get production site URL
          let productionUrl = siteUrl || 
            Deno.env.get("SITE_URL") || 
            Deno.env.get("VITE_SITE_URL") ||
            `https://cross-learning.vercel.app`;
          
          if (productionUrl && !productionUrl.startsWith('https://')) {
            productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
          }
          productionUrl = productionUrl.replace(/\/$/, '');

          // Format date and time
          const startDate = new Date(startAt);
          const endDate = new Date(endAt);
          const dateStr = startDate.toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const timeStr = `${startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

          // Email to user (confirmation)
          const userEmailHtml = `
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
                .info-box {
                  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                  border: 2px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 25px;
                  margin: 25px 0;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 12px 0;
                  border-bottom: 1px solid #e2e8f0;
                }
                .info-row:last-child {
                  border-bottom: none;
                }
                .info-label {
                  color: #64748b;
                  font-weight: 500;
                  font-size: 14px;
                }
                .info-value {
                  color: #1e293b;
                  font-weight: 600;
                  font-size: 14px;
                  text-align: right;
                }
                .status-badge {
                  display: inline-block;
                  background: #dbeafe;
                  color: #1e40af;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  margin: 20px 0;
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
                  <span class="header-icon">✅</span>
                  <h1>ได้รับยืนยันการจองแล้ว</h1>
                </div>
                <div class="content">
                  <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                    สวัสดีคุณ <strong style="color: #667eea;">${userName}</strong>,
                  </p>
                  <p style="color: #6b7280; font-size: 16px; margin-bottom: 30px; line-height: 1.8;">
                    การจองห้องประชุมของคุณได้รับการยืนยันแล้ว
                  </p>
                  
                  <div class="status-badge">✅ ยืนยันการจอง</div>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="info-label">ชื่องาน:</span>
                      <span class="info-value">${title}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">ห้องประชุม:</span>
                      <span class="info-value">${room.data.name}</span>
                    </div>
                    ${room.data.location ? `
                    <div class="info-row">
                      <span class="info-label">สถานที่:</span>
                      <span class="info-value">${room.data.location}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                      <span class="info-label">วันที่:</span>
                      <span class="info-value">${dateStr}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">เวลา:</span>
                      <span class="info-value">${timeStr}</span>
                    </div>
                  </div>
                  
                  ${description ? `
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="color: #64748b; font-size: 14px; font-weight: 600; margin-bottom: 10px;">รายละเอียด:</p>
                    <p style="color: #374151; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${description}</p>
                  </div>
                  ` : ''}
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.8;">
                    คุณจะได้รับอีเมลแจ้งเตือนอีกครั้งก่อนถึงวันประชุม
                  </p>
                  
                  <div class="footer">
                    <p><strong>ระบบจองห้องประชุม</strong></p>
                    <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          const userEmailText = `
ได้รับยืนยันการจองแล้ว

สวัสดีคุณ ${userName},

การจองห้องประชุมของคุณได้รับการยืนยันแล้ว

ชื่องาน: ${title}
ห้องประชุม: ${room.data.name}
${room.data.location ? `สถานที่: ${room.data.location}\n` : ''}วันที่: ${dateStr}
เวลา: ${timeStr}

${description ? `รายละเอียด:\n${description}\n\n` : ''}คุณจะได้รับอีเมลแจ้งเตือนอีกครั้งก่อนถึงวันประชุม

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
          `.trim();

          // Send email to user
          const userEmailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'onboarding@resend.dev',
              to: userEmail,
              subject: `✅ ยืนยันการจองห้องประชุม: ${title}`,
              html: userEmailHtml,
              text: userEmailText,
              click_tracking: false,
            }),
          });

          const userEmailResult = await userEmailResponse.json();
          if (userEmailResponse.ok) {
            console.log('✅ Confirmation email sent to user:', userEmailResult.id);
          } else {
            console.error('Failed to send confirmation email to user:', userEmailResult);
          }

          // Get all admin emails
          const { data: admins } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('role', 'admin')
            .eq('is_active', true);

          if (admins && admins.length > 0) {
            // Email to admins (notification)
            const adminEmails = admins.map(a => a.email).filter(Boolean);
            const adminEmailHtml = `
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
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
                  .info-box {
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                  }
                  .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid #e2e8f0;
                  }
                  .info-row:last-child {
                    border-bottom: none;
                  }
                  .info-label {
                    color: #64748b;
                    font-weight: 500;
                    font-size: 14px;
                  }
                  .info-value {
                    color: #1e293b;
                    font-weight: 600;
                    font-size: 14px;
                    text-align: right;
                  }
                  .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 10px; 
                    font-weight: 600;
                    font-size: 16px;
                    margin: 20px 0;
                  }
                  .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    padding-top: 30px;
                    border-top: 1px solid #e5e7eb;
                    color: #9ca3af; 
                    font-size: 13px;
                  }
                </style>
              </head>
              <body>
                <div class="email-wrapper">
                  <div class="header">
                    <span class="header-icon">🔔</span>
                    <h1>มีการจองห้องประชุมใหม่</h1>
                  </div>
                  <div class="content">
                    <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                      มีการจองห้องประชุมใหม่ที่ต้องการการอนุมัติ
                    </p>
                    
                    <div class="info-box">
                      <div class="info-row">
                        <span class="info-label">ผู้จอง:</span>
                        <span class="info-value">${userName}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">อีเมล:</span>
                        <span class="info-value">${userEmail}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">ชื่องาน:</span>
                        <span class="info-value">${title}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">ห้องประชุม:</span>
                        <span class="info-value">${room.data.name}</span>
                      </div>
                      ${room.data.location ? `
                      <div class="info-row">
                        <span class="info-label">สถานที่:</span>
                        <span class="info-value">${room.data.location}</span>
                      </div>
                      ` : ''}
                      <div class="info-row">
                        <span class="info-label">วันที่:</span>
                        <span class="info-value">${dateStr}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">เวลา:</span>
                        <span class="info-value">${timeStr}</span>
                      </div>
                    </div>
                    
                    ${description ? `
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                      <p style="color: #64748b; font-size: 14px; font-weight: 600; margin-bottom: 10px;">รายละเอียด:</p>
                      <p style="color: #374151; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${description}</p>
                    </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${productionUrl}/admin/rooms" class="button" style="color: white; text-decoration: none;">
                        ไปที่หน้าจัดการการจอง
                      </a>
                    </div>
                    
                    <div class="footer">
                      <p><strong>ระบบจองห้องประชุม</strong></p>
                      <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `;

            const adminEmailText = `
มีการจองห้องประชุมใหม่

มีการจองห้องประชุมใหม่ที่ต้องการการอนุมัติ

ผู้จอง: ${userName}
อีเมล: ${userEmail}
ชื่องาน: ${title}
ห้องประชุม: ${room.data.name}
${room.data.location ? `สถานที่: ${room.data.location}\n` : ''}วันที่: ${dateStr}
เวลา: ${timeStr}

${description ? `รายละเอียด:\n${description}\n\n` : ''}ไปที่หน้าจัดการการจอง: ${productionUrl}/admin/rooms

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            `.trim();

            // Send email to admins
            const adminEmailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: adminEmails,
                subject: `🔔 การจองห้องประชุมใหม่: ${title}`,
                html: adminEmailHtml,
                text: adminEmailText,
                click_tracking: false,
              }),
            });

            const adminEmailResult = await adminEmailResponse.json();
            if (adminEmailResponse.ok) {
              console.log('✅ Notification email sent to admins:', adminEmailResult.id);
            } else {
              console.error('Failed to send notification email to admins:', adminEmailResult);
            }
          }
        } else {
          console.warn('Resend API Key not found - skipping email notifications');
        }
      } catch (emailError: any) {
        console.error('Error sending booking notification emails:', emailError);
        // Don't fail the booking creation if email fails
      }
    }

    return new Response(JSON.stringify({ ok: true, booking: ins.data }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    console.error('Create booking error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

