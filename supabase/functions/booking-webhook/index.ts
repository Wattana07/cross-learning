// Edge Function สำหรับรับ Database Webhook และส่งอีเมล
// ตั้งค่าใน Supabase Dashboard > Database > Webhooks
// Table: room_bookings, Event: UPDATE

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
    // Database Webhooks อาจส่ง Authorization header (ถ้าตั้งค่าใน webhook settings)
    // รับได้ทั้งแบบมีและไม่มี auth (เพื่อความยืดหยุ่น)
    
    // Log incoming request
    console.log('📥 Webhook received:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get('authorization'),
    });
    
    // ถ้ามี Authorization header ก็ตรวจสอบ (optional)
    // แต่ถ้าไม่มีก็ยังทำงานได้ (เพราะ webhook มาจาก Supabase เอง)

    // Webhook payload จาก Supabase Database Webhooks
    // Format: { type: 'UPDATE', schema: 'public', table: 'room_bookings', record: { ... }, old_record: { ... } }
    const payload = await req.json();
    console.log('📦 Full webhook payload:', JSON.stringify(payload, null, 2));
    
    // Parse payload - Supabase webhook format
    const { type, schema, table, record, old_record } = payload;
    
    console.log('🔍 Parsed:', {
      type,
      schema,
      table,
      recordId: record?.id,
      recordStatus: record?.status,
      oldRecordStatus: old_record?.status,
    });

    // ตรวจสอบ table name
    if (table !== 'room_bookings' || schema !== 'public') {
      console.log('⚠️ Not a booking update:', { table, schema });
      return new Response(JSON.stringify({ ok: true, message: 'Not a booking update' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ตรวจสอบว่าเป็น UPDATE event
    if (type !== 'UPDATE') {
      console.log('⚠️ Not an UPDATE event:', { type });
      return new Response(JSON.stringify({ ok: true, message: 'Not an UPDATE event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ตรวจสอบว่า status เปลี่ยนเป็น 'approved' หรือไม่
    const newStatus = record?.status;
    const oldStatus = old_record?.status;
    
    console.log('🔍 Status check:', {
      newStatus,
      oldStatus,
      isApproved: newStatus === 'approved',
      wasNotApproved: oldStatus !== 'approved',
    });

    if (newStatus !== 'approved' || oldStatus === 'approved') {
      console.log('⚠️ Status not changed to approved:', {
        newStatus,
        oldStatus,
      });
      return new Response(JSON.stringify({ ok: true, message: 'Status not changed to approved' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('✅ Status changed to approved! Processing email...');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // ใช้ข้อมูลจาก record โดยตรง (ไม่ต้อง query ใหม่)
    const bookingId = record.id;
    console.log('🔍 Processing booking:', bookingId);
    
    // ดึงข้อมูล room และ booker
    const { data: roomData } = await adminClient
      .from('rooms')
      .select('name, location')
      .eq('id', record.room_id)
      .single();
    
    const { data: bookerData } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', record.booked_by_user_id)
      .single();
    
    // Combine data
    const bookingWithDetails = {
      ...record,
      room: roomData,
      booker: bookerData,
    };
    
    console.log('✅ Booking data:', {
      id: bookingWithDetails.id,
      title: bookingWithDetails.title,
      bookerEmail: bookingWithDetails.booker?.email,
      roomName: bookingWithDetails.room?.name,
    });

    // ตรวจสอบว่ามี email หรือไม่
    if (!bookingWithDetails.booker?.email) {
      console.log('⚠️ No email found for booker');
      return new Response(JSON.stringify({ ok: true, message: 'No email found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get Resend API Key
    const apiKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("resend_api_key");
    
    if (!apiKey) {
      console.warn('Resend API Key not found - skipping email');
      return new Response(JSON.stringify({ ok: true, message: 'Email sending skipped (no API key)' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
    const startDate = new Date(bookingWithDetails.start_at);
    const endDate = new Date(bookingWithDetails.end_at);
    const dateStr = startDate.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = `${startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

    const userName = bookingWithDetails.booker?.full_name || 'ผู้ใช้';
    const userEmail = bookingWithDetails.booker.email;
    const roomName = bookingWithDetails.room?.name || 'ห้องประชุม';
    const roomLocation = bookingWithDetails.room?.location || '';

    console.log('📧 Preparing email:', {
      to: userEmail,
      userName,
      roomName,
    });

    // Email template
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
                <span class="info-value">${bookingWithDetails.title}</span>
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
            
            ${bookingWithDetails.description ? `
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #64748b; font-size: 14px; font-weight: 600; margin-bottom: 10px;">รายละเอียด:</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${bookingWithDetails.description}</p>
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

ชื่องาน: ${bookingWithDetails.title}
ห้องประชุม: ${roomName}
${roomLocation ? `สถานที่: ${roomLocation}\n` : ''}วันที่: ${dateStr}
เวลา: ${timeStr}

${bookingWithDetails.description ? `รายละเอียด:\n${bookingWithDetails.description}\n\n` : ''}คุณจะได้รับอีเมลแจ้งเตือนอีกครั้งก่อนถึงวันประชุม

---
ระบบจองห้องประชุม
อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ
    `.trim();

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: userEmail,
        subject: `✅ การจองห้องประชุมได้รับการอนุมัติ: ${bookingWithDetails.title}`,
        html: userEmailHtml,
        text: userEmailText,
        click_tracking: false,
        open_tracking: false,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (emailResponse.ok) {
      console.log('✅ Booking approval email sent via webhook:', emailResult.id);
      return new Response(JSON.stringify({ ok: true, message: 'Email sent successfully', emailId: emailResult.id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } else {
      console.error('Failed to send email:', emailResult);
      return new Response(JSON.stringify({ ok: false, error: 'Email sending failed', details: emailResult }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error('Error in booking-webhook:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

