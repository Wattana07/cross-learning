# คู่มือการตั้งค่าระบบแจ้งเตือนอีเมล

## วิธีที่ 1: ใช้ Resend (แนะนำ - ฟรี 3,000 อีเมล/เดือน)

### ขั้นตอนการตั้งค่า:

1. **สมัคร Resend**
   - ไปที่ https://resend.com
   - สมัครบัญชี (ใช้ GitHub/Google ได้)
   - ไปที่ API Keys และสร้าง API Key ใหม่

2. **Verify Domain (ถ้าต้องการ)**
   - ไปที่ Domains ใน Resend Dashboard
   - เพิ่ม domain ของคุณ (เช่น yourdomain.com)
   - ตั้งค่า DNS records ตามที่ Resend แนะนำ
   - **หมายเหตุ:** ถ้ายังไม่มี domain สามารถใช้ `onboarding@resend.dev` สำหรับทดสอบได้

3. **ตั้งค่า Secret ใน Supabase**
   - ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
   - เพิ่ม Secret ใหม่:
     - Name: `RESEND_API_KEY`
     - Value: API Key ที่ได้จาก Resend

4. **Deploy Edge Function**
   ```bash
   cd cross-learning
   npx supabase functions deploy send-email
   ```

5. **ทดสอบการส่งอีเมล**
   - ใช้ Edge Function `send-email` หรือ
   - ใช้ผ่าน `notify-booking-approval` เมื่ออนุมัติการจอง

---

## วิธีที่ 2: ใช้ Supabase Email (ถ้า enable แล้ว)

Supabase มี built-in email service แต่ต้อง enable ใน Dashboard ก่อน

### ขั้นตอน:

1. ไปที่ Supabase Dashboard > Settings > Auth > Email Templates
2. Enable email service
3. ใช้ Supabase Client API:

```typescript
// ใน Edge Function
const { data, error } = await adminClient.auth.admin.generateLink({
  type: 'magiclink',
  email: userEmail,
});
```

---

## วิธีที่ 3: ใช้ SMTP โดยตรง

### ใช้กับ SendGrid, Mailgun, AWS SES, หรือ SMTP Server อื่นๆ

ตัวอย่างใช้กับ SendGrid:

```typescript
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'noreply@yourdomain.com' },
    subject: subject,
    content: [{ type: 'text/html', value: html }],
  }),
});
```

---

## การใช้งาน

### 1. ส่งอีเมลผ่าน Edge Function

```typescript
// จาก frontend หรือ Edge Function อื่น
await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'หัวข้ออีเมล',
    html: '<h1>เนื้อหาอีเมล</h1>',
    text: 'เนื้อหาอีเมล (plain text)',
  },
});
```

### 2. ส่งอีเมลเมื่ออนุมัติการจอง

ระบบจะส่งอีเมลอัตโนมัติเมื่อ Admin อนุมัติการจองผ่าน `notify-booking-approval` function

### 3. ส่งอีเมลใน Edge Functions อื่นๆ

```typescript
// ใน Edge Function อื่นๆ
const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: userEmail,
    subject: 'หัวข้อ',
    html: '<p>เนื้อหา</p>',
  }),
});
```

---

## ตัวอย่างการส่งอีเมลในกรณีต่างๆ

### 1. แจ้งเตือนเมื่อมีการจองใหม่
- ส่งให้ Admin เมื่อมีผู้ใช้จองห้องใหม่

### 2. แจ้งเตือนเมื่ออนุมัติ/ปฏิเสธการจอง
- ส่งให้ผู้จองเมื่อ Admin อนุมัติหรือปฏิเสธ

### 3. แจ้งเตือนก่อนการประชุม
- ส่งให้ผู้จอง 1 วันก่อนการประชุม (ต้องใช้ cron job)

### 4. แจ้งเตือนเมื่อมีการแก้ไข/ยกเลิกการจอง
- ส่งให้ผู้เกี่ยวข้องเมื่อมีการเปลี่ยนแปลง

---

## Tips

1. **Rate Limiting**: Resend มี rate limit ควร handle error กรณีส่งเกิน
2. **Email Templates**: สร้าง template แยกสำหรับแต่ละประเภทอีเมล
3. **Error Handling**: ควร log error แต่ไม่ควร fail function หลักถ้าส่งอีเมลไม่สำเร็จ
4. **Testing**: ใช้ `onboarding@resend.dev` สำหรับทดสอบก่อน verify domain

---

## Troubleshooting

### อีเมลไม่ถูกส่ง
1. ตรวจสอบว่า `RESEND_API_KEY` ถูกตั้งค่าใน Supabase Secrets
2. ตรวจสอบ logs ใน Supabase Dashboard > Edge Functions > Logs
3. ตรวจสอบ Resend Dashboard > Emails ดูว่ามี error อะไร

### Domain not verified
- ใช้ `onboarding@resend.dev` สำหรับทดสอบ
- หรือ verify domain ใน Resend Dashboard

### Function deploy ไม่สำเร็จ
- ตรวจสอบว่า link project แล้ว: `npx supabase link --project-ref <your-ref>`
- ตรวจสอบว่า login แล้ว: `npx supabase login`

