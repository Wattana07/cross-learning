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

    // Send email notification
    if (booking.booker?.email) {
      try {
        // Format date/time
        const startDate = new Date(booking.start_at);
        const endDate = new Date(booking.end_at);
        const dateStr = startDate.toLocaleDateString('th-TH', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const timeStr = `${startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

        // Call send-email function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: booking.booker.email,
            subject: `✅ การจองห้องประชุมได้รับการอนุมัติ - ${booking.room?.name || 'ห้องประชุม'}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5; }
                  .info-row { margin: 10px 0; }
                  .label { font-weight: bold; color: #6b7280; }
                  .value { color: #111827; }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">✅ การจองห้องประชุมได้รับการอนุมัติ</h1>
                  </div>
                  <div class="content">
                    <p>สวัสดีคุณ <strong>${booking.booker?.full_name || 'ผู้ใช้'}</strong>,</p>
                    <p>การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว</p>
                    
                    <div class="info-box">
                      <div class="info-row">
                        <span class="label">ชื่องาน:</span>
                        <span class="value">${booking.title}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">ห้องประชุม:</span>
                        <span class="value">${booking.room?.name || '-'}</span>
                      </div>
                      ${booking.room?.location ? `
                      <div class="info-row">
                        <span class="label">สถานที่:</span>
                        <span class="value">${booking.room.location}</span>
                      </div>
                      ` : ''}
                      <div class="info-row">
                        <span class="label">วันที่:</span>
                        <span class="value">${dateStr}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">เวลา:</span>
                        <span class="value">${timeStr}</span>
                      </div>
                    </div>
                    
                    ${booking.description ? `
                    <p><strong>รายละเอียด:</strong></p>
                    <p style="background: white; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${booking.description}</p>
                    ` : ''}
                    
                    <p>กรุณาเตรียมตัวให้พร้อมสำหรับการประชุม</p>
                    
                    <div class="footer">
                      <p>ระบบจองห้องประชุม</p>
                      <p>อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
            text: `
การจองห้องประชุมได้รับการอนุมัติ

สวัสดีคุณ ${booking.booker?.full_name || 'ผู้ใช้'},

การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว

ชื่องาน: ${booking.title}
ห้องประชุม: ${booking.room?.name || '-'}
${booking.room?.location ? `สถานที่: ${booking.room.location}\n` : ''}วันที่: ${dateStr}
เวลา: ${timeStr}

${booking.description ? `รายละเอียด:\n${booking.description}\n\n` : ''}
กรุณาเตรียมตัวให้พร้อมสำหรับการประชุม

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
            `.trim(),
          }),
        });

        const emailResult = await emailResponse.json();
        if (!emailResult.ok) {
          console.error('Failed to send email:', emailResult);
        } else {
          console.log('Email sent successfully:', emailResult.messageId);
        }
      } catch (emailError: any) {
        console.error('Error sending email:', emailError);
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

