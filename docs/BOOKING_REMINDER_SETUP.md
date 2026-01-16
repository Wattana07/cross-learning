# คู่มือตั้งค่าระบบแจ้งเตือนการประชุม

## 📧 ระบบอีเมลแจ้งเตือน

ระบบจะส่งอีเมล 3 ประเภท:

### 1. อีเมลยืนยันการจอง (ให้ผู้จอง)
- ส่งทันทีเมื่อมีการจองห้องประชุม
- แจ้งว่าการจองได้รับการยืนยันแล้ว
- ระบุรายละเอียดการจองทั้งหมด

### 2. อีเมลแจ้งเตือน Admin (ให้ Admin)
- ส่งทันทีเมื่อมีการจองห้องประชุมใหม่
- แจ้งว่ามีคนขอจองห้องประชุม
- มีลิงก์ไปยังหน้าจัดการการจอง

### 3. อีเมลแจ้งเตือนก่อนวันประชุม (ให้ผู้จอง)
- ส่งอัตโนมัติ 1 วันก่อนวันประชุม
- แจ้งเตือนว่ามีการประชุมในวันพรุ่งนี้
- ใช้สำหรับเตือนให้ผู้ใช้เตรียมตัว

---

## ⚙️ ตั้งค่าระบบ Reminder (แจ้งเตือนก่อนวันประชุม)

### วิธีที่ 1: ใช้ Vercel Cron Jobs (แนะนำ)

1. สร้างไฟล์ `vercel.json` ใน root directory:

```json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

2. สร้าง API route ใน `api/cron/booking-reminders.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export default async function handler(req: Request) {
  // Call Supabase Edge Function
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-booking-reminders`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const result = await response.json()
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

3. ตั้งค่า Environment Variables ใน Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

### วิธีที่ 2: ใช้ GitHub Actions

สร้างไฟล์ `.github/workflows/booking-reminders.yml`:

```yaml
name: Send Booking Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # Run daily at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            https://wmfuzaahfdknfjvqwwsi.supabase.co/functions/v1/send-booking-reminders
```

ตั้งค่า Secrets ใน GitHub:
- `SUPABASE_SERVICE_ROLE_KEY`

---

### วิธีที่ 3: ใช้ External Cron Service

ใช้บริการเช่น:
- **Cron-job.org** (ฟรี)
- **EasyCron** (ฟรี)
- **Cronitor** (มี free tier)

ตั้งค่า:
- **URL:** `https://wmfuzaahfdknfjvqwwsi.supabase.co/functions/v1/send-booking-reminders`
- **Method:** POST
- **Headers:**
  - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`
- **Schedule:** ทุกวันเวลา 9:00 น. (UTC)

---

## 🔧 ตั้งค่า Supabase Secrets

ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets:

1. `RESEND_API_KEY` หรือ `resend_api_key` - API Key จาก Resend
2. `SITE_URL` (optional) - Production URL สำหรับลิงก์ในอีเมล

---

## ✅ ทดสอบ

### ทดสอบการส่งอีเมลยืนยัน:
1. จองห้องประชุมใหม่
2. ตรวจสอบอีเมลของผู้จอง (ควรได้รับอีเมลยืนยัน)
3. ตรวจสอบอีเมลของ Admin (ควรได้รับอีเมลแจ้งเตือน)

### ทดสอบการส่ง Reminder:
1. เรียก Edge Function โดยตรง:
```bash
curl -X POST \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  https://wmfuzaahfdknfjvqwwsi.supabase.co/functions/v1/send-booking-reminders
```

2. ตรวจสอบ logs ใน Supabase Dashboard

---

## 📝 หมายเหตุ

- Reminder จะส่งให้เฉพาะการจองที่มีสถานะ `approved`
- Reminder จะส่ง 1 วันก่อนวันประชุม (24 ชั่วโมงก่อน)
- ถ้าไม่มี booking ในวันพรุ่งนี้ ระบบจะไม่ส่งอีเมล
- การส่งอีเมลล้มเหลวจะไม่ทำให้ booking creation ล้มเหลว

