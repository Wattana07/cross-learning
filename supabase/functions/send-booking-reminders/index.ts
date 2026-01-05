// supabase/functions/send-booking-reminders/index.ts
// Deploy: supabase functions deploy send-booking-reminders
// This function should be called daily via cron job or scheduled task
// To set up: Use Supabase Cron Jobs or external scheduler (e.g., GitHub Actions, Vercel Cron)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get production site URL
    let productionUrl = Deno.env.get("SITE_URL") || 
      Deno.env.get("VITE_SITE_URL") ||
      `https://cross-learning.vercel.app`;
    
    if (productionUrl && !productionUrl.startsWith('https://')) {
      productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
    }
    productionUrl = productionUrl.replace(/\/$/, '');

    // Get bookings that start within 24 hours (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const { data: bookings, error: bookingsError } = await adminClient
      .from('room_bookings')
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        room_id,
        booked_by_user_id,
        rooms(name, location),
        profiles!room_bookings_booked_by_user_id_fkey(email, full_name)
      `)
      .eq('status', 'approved')
      .gte('start_at', tomorrow.toISOString())
      .lt('start_at', dayAfter.toISOString());

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return new Response(JSON.stringify({ ok: false, error: bookingsError.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'No bookings to remind',
        count: 0 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Send reminder emails
    const results = [];
    for (const booking of bookings) {
      try {
        const startDate = new Date(booking.start_at);
        const endDate = new Date(booking.end_at);
        const dateStr = startDate.toLocaleDateString('th-TH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = `${startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

        const userEmail = (booking.profiles as any)?.email;
        const userName = (booking.profiles as any)?.full_name || 'ผู้ใช้';
        const roomName = (booking.rooms as any)?.name || 'Unknown Room';
        const roomLocation = (booking.rooms as any)?.location;

        if (!userEmail) {
          console.warn(`No email for booking ${booking.id}`);
          continue;
        }

        const reminderEmailHtml = `
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
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #fbbf24;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .info-label {
                color: #92400e;
                font-weight: 500;
                font-size: 14px;
              }
              .info-value {
                color: #78350f;
                font-weight: 600;
                font-size: 14px;
                text-align: right;
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
                <span class="header-icon">⏰</span>
                <h1>แจ้งเตือนการประชุม</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                  สวัสดีคุณ <strong style="color: #f59e0b;">${userName}</strong>,
                </p>
                <p style="color: #6b7280; font-size: 16px; margin-bottom: 30px; line-height: 1.8;">
                  นี่คือการแจ้งเตือนว่าคุณมีการประชุมในวันพรุ่งนี้
                </p>
                
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">ชื่องาน:</span>
                    <span class="info-value">${booking.title}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">ห้องประชุม:</span>
                    <span class="info-value">${roomName}</span>
                  </div>
                  ${roomLocation ? `
                  <div class="info-row">
                    <span class="info-label">สถานที่:</span>
                    <span class="info-value">${roomLocation}</span>
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
                
                ${booking.description ? `
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <p style="color: #64748b; font-size: 14px; font-weight: 600; margin-bottom: 10px;">รายละเอียด:</p>
                  <p style="color: #374151; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${booking.description}</p>
                </div>
                ` : ''}
                
                <p style="color: #92400e; font-size: 14px; margin-top: 30px; line-height: 1.8; font-weight: 600;">
                  ⏰ กรุณาเตรียมตัวให้พร้อมสำหรับการประชุม
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

        const reminderEmailText = `
แจ้งเตือนการประชุม

สวัสดีคุณ ${userName},

นี่คือการแจ้งเตือนว่าคุณมีการประชุมในวันพรุ่งนี้

ชื่องาน: ${booking.title}
ห้องประชุม: ${roomName}
${roomLocation ? `สถานที่: ${roomLocation}\n` : ''}วันที่: ${dateStr}
เวลา: ${timeStr}

${booking.description ? `รายละเอียด:\n${booking.description}\n\n` : ''}⏰ กรุณาเตรียมตัวให้พร้อมสำหรับการประชุม

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
            to: userEmail,
            subject: `⏰ แจ้งเตือนการประชุมพรุ่งนี้: ${booking.title}`,
            html: reminderEmailHtml,
            text: reminderEmailText,
            click_tracking: false,
          }),
        });

        const emailResult = await emailResponse.json();
        if (emailResponse.ok) {
          console.log(`✅ Reminder email sent to ${userEmail}:`, emailResult.id);
          results.push({ bookingId: booking.id, email: userEmail, success: true });
        } else {
          console.error(`Failed to send reminder to ${userEmail}:`, emailResult);
          results.push({ bookingId: booking.id, email: userEmail, success: false, error: emailResult });
        }
      } catch (error: any) {
        console.error(`Error sending reminder for booking ${booking.id}:`, error);
        results.push({ bookingId: booking.id, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: `Sent ${results.filter(r => r.success).length} reminder emails`,
      count: results.length,
      results 
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (e) {
    console.error('Send booking reminders error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

