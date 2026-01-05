import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Verify caller is authenticated
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

    // Check if caller is admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, reason: "NOT_ADMIN" }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_BOOKING_ID" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fetch booking details with booker info
    const { data: booking, error: bookingError } = await adminClient
      .from('room_bookings')
      .select(`
        *,
        room:rooms(name, location),
        booker:profiles!room_bookings_booked_by_user_id_fkey(id, email, full_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ ok: false, reason: "BOOKING_NOT_FOUND" }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Send email notifications when booking is approved
    if (booking.booker?.email) {
      try {
        // Get Resend API Key
        const apiKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
        
        if (!apiKey) {
          console.warn('Resend API Key not found - skipping email notifications');
          return new Response(JSON.stringify({ ok: true, message: 'Booking approved but email sending skipped (no API key)' }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // Get production site URL
        let productionUrl = Deno.env.get("SITE_URL") || 
          Deno.env.get("VITE_SITE_URL") ||
          `https://cross-learning.vercel.app`;
        
        if (productionUrl && !productionUrl.startsWith('https://')) {
          productionUrl = productionUrl.replace(/^http:\/\//, 'https://');
        }
        productionUrl = productionUrl.replace(/\/$/, '');

        // Format date and time
        const startDate = new Date(booking.start_at);
        const endDate = new Date(booking.end_at);
        const dateStr = startDate.toLocaleDateString('th-TH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = `${startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

        const userName = booking.booker?.full_name || 'ผู้ใช้';
        const roomName = booking.room?.name || 'ห้องประชุม';
        const roomLocation = booking.room?.location || '';

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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 2px solid #7dd3fc;
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
                <h1>การจองห้องประชุมได้รับการอนุมัติแล้ว</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                  สวัสดีคุณ <strong style="color: #059669;">${userName}</strong>,
                </p>
                <p style="color: #6b7280; font-size: 16px; margin-bottom: 30px; line-height: 1.8;">
                  การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว
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
การจองห้องประชุมได้รับการอนุมัติแล้ว

สวัสดีคุณ ${userName},

การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว

ชื่องาน: ${booking.title}
ห้องประชุม: ${roomName}
${roomLocation ? `สถานที่: ${roomLocation}\n` : ''}วันที่: ${dateStr}
เวลา: ${timeStr}

${booking.description ? `รายละเอียด:\n${booking.description}\n\n` : ''}คุณจะได้รับอีเมลแจ้งเตือนอีกครั้งก่อนถึงวันประชุม

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
            to: booking.booker.email,
            subject: `✅ การจองห้องประชุมได้รับการอนุมัติ: ${booking.title}`,
            html: userEmailHtml,
            text: userEmailText,
            click_tracking: false,
            open_tracking: false,
          }),
        });

        const userEmailResult = await userEmailResponse.json();
        if (userEmailResponse.ok) {
          console.log('✅ Confirmation email sent to user:', userEmailResult.id);
        } else {
          console.error('Failed to send confirmation email to user:', userEmailResult);
        }

      } catch (emailError: any) {
        console.error('Error sending booking approval email:', emailError);
        // Don't fail the whole function if email fails
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Notification sent successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in notify-booking-approval:', error);
    return new Response(JSON.stringify({ ok: false, reason: "SERVER_ERROR", error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

