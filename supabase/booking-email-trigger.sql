-- ============================================
-- ระบบส่งอีเมลอัตโนมัติเมื่ออนุมัติการจอง (ง่ายกว่า Edge Function)
-- ============================================

-- สร้าง function สำหรับส่งอีเมลเมื่อ status เปลี่ยนเป็น 'approved'
create or replace function public.send_booking_approval_email()
returns trigger as $$
declare
  booker_email text;
  booker_name text;
  room_name text;
  room_location text;
  start_date_str text;
  time_str text;
  api_key text;
  production_url text;
begin
  -- ตรวจสอบว่า status เปลี่ยนเป็น 'approved' หรือไม่
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    
    -- ดึงข้อมูล booker และ room
    select 
      p.email,
      p.full_name,
      r.name,
      r.location
    into booker_email, booker_name, room_name, room_location
    from public.profiles p
    join public.rooms r on r.id = new.room_id
    where p.id = new.booked_by_user_id;
    
    -- ถ้าไม่มี email ไม่ต้องส่ง
    if booker_email is null then
      return new;
    end if;
    
    -- Format วันที่และเวลา
    start_date_str := to_char(new.start_at, 'Day, DD Month YYYY', 'NLS_DATE_LANGUAGE=THAI');
    time_str := to_char(new.start_at, 'HH24:MI') || ' - ' || to_char(new.end_at, 'HH24:MI');
    
    -- ดึง API key และ URL จาก environment (ต้องตั้งค่าใน Supabase Secrets)
    api_key := current_setting('app.resend_api_key', true);
    production_url := coalesce(
      current_setting('app.site_url', true),
      'https://cross-learning.vercel.app'
    );
    
    -- ถ้าไม่มี API key ไม่ต้องส่ง (ไม่ error)
    if api_key is null or api_key = '' then
      raise notice 'Resend API key not configured - skipping email';
      return new;
    end if;
    
    -- ส่งอีเมลผ่าน http extension (ต้อง enable http extension ก่อน)
    -- หมายเหตุ: ต้อง enable http extension ใน Supabase
    perform
      net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || api_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'onboarding@resend.dev',
          'to', booker_email,
          'subject', '✅ การจองห้องประชุมได้รับการอนุมัติ: ' || new.title,
          'html', format('
            <!DOCTYPE html>
            <html lang="th">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10b981; color: white; padding: 20px; text-align: center; }
                .content { background: #f9fafb; padding: 20px; }
                .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ การจองห้องประชุมได้รับการอนุมัติ</h1>
                </div>
                <div class="content">
                  <p>สวัสดีคุณ <strong>%s</strong>,</p>
                  <p>การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว</p>
                  <div class="info-box">
                    <div class="info-row"><span>ชื่องาน:</span><span>%s</span></div>
                    <div class="info-row"><span>ห้องประชุม:</span><span>%s</span></div>
                    <div class="info-row"><span>วันที่:</span><span>%s</span></div>
                    <div class="info-row"><span>เวลา:</span><span>%s</span></div>
                  </div>
                  <div class="footer">
                    <p>ระบบจองห้องประชุม</p>
                    <p>อีเมลนี้ถูกส่งอัตโนมัติ</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          ', 
          coalesce(booker_name, 'ผู้ใช้'),
          new.title,
          coalesce(room_name, 'ห้องประชุม'),
          start_date_str,
          time_str
          ),
          'text', format('
การจองห้องประชุมได้รับการอนุมัติ

สวัสดีคุณ %s,

การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว

ชื่องาน: %s
ห้องประชุม: %s
วันที่: %s
เวลา: %s

---
ระบบจองห้องประชุม
          ',
          coalesce(booker_name, 'ผู้ใช้'),
          new.title,
          coalesce(room_name, 'ห้องประชุม'),
          start_date_str,
          time_str
          ),
          'click_tracking', false,
          'open_tracking', false
        )
      );
    
    raise notice 'Booking approval email sent to %', booker_email;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- สร้าง trigger
drop trigger if exists trg_send_booking_approval_email on public.room_bookings;
create trigger trg_send_booking_approval_email
  after update of status on public.room_bookings
  for each row
  when (new.status = 'approved' and (old.status is null or old.status != 'approved'))
  execute function public.send_booking_approval_email();

-- หมายเหตุ:
-- 1. ต้อง enable http extension ใน Supabase:
--    - ไปที่ Database > Extensions > enable "http" extension
-- 2. ตั้งค่า Secrets ใน Supabase:
--    - app.resend_api_key = Resend API Key
--    - app.site_url = https://cross-learning.vercel.app (optional)

