# แก้ไขปัญหา: อีเมลไม่ถูกส่ง

## 🔍 วิธีตรวจสอบปัญหา

### 1. ตรวจสอบ Console Logs ใน Browser

1. เปิด Browser DevTools (F12)
2. ไปที่ Console tab
3. ลองเพิ่ม User ใหม่
4. ดู logs:
   - มี warning: "User created with warning" หรือไม่?
   - มี error: "Email error" หรือไม่?
   - มีข้อความอะไรที่บอกว่า email ไม่ถูกส่ง?

---

### 2. ตรวจสอบ Supabase Edge Functions Logs

1. ไปที่ https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi
2. ไปที่ **Edge Functions** > **create-user**
3. ดู **Logs** หรือ **Invocations**
4. ตรวจสอบ logs ล่าสุด:
   - มี error อะไรหรือไม่?
   - มี "Resend API error" หรือไม่?
   - มี "Email error" หรือไม่?

---

### 3. ตรวจสอบ Resend API Key

1. ตรวจสอบว่า Resend API Key ถูกต้อง:
   - ไปที่ https://resend.com/api-keys
   - ตรวจสอบว่า API Key: `re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K` ยังใช้งานได้หรือไม่
   - ตรวจสอบว่า API Key ไม่ได้ถูก revoke หรือ expire

2. ตรวจสอบใน Vercel Environment Variables:
   - ไปที่ Vercel Dashboard > Settings > Environment Variables
   - ตรวจสอบว่า `VITE_RESEND_API_KEY` ถูกตั้งค่าแล้ว
   - ตรวจสอบว่าค่าถูกต้อง

---

### 4. ตรวจสอบ Email Address

1. ตรวจสอบว่า email address ที่ใส่ถูกต้อง:
   - ไม่มี typo
   - Format ถูกต้อง (มี @ และ domain)

2. ตรวจสอบ Spam/Junk folder:
   - อีเมลอาจถูกส่งไปที่ Spam folder
   - ตรวจสอบ Junk/Spam folder ใน email client

---

### 5. ทดสอบ Resend API โดยตรง

ลองทดสอบ Resend API ว่าทำงานหรือไม่:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>Test email from Resend</p>"
  }'
```

---

## 🔧 วิธีแก้ไข

### ถ้า Resend API Key ไม่ถูกต้อง:
1. ไปที่ https://resend.com/api-keys
2. สร้าง API Key ใหม่
3. อัปเดตใน Vercel Environment Variables
4. Retry deployment

### ถ้า Resend API Key ถูก revoke:
1. สร้าง API Key ใหม่
2. อัปเดตใน Vercel Environment Variables
3. Retry deployment

### ถ้ามี error ใน Supabase Logs:
1. ดู error message ใน logs
2. แก้ไขตาม error message
3. Deploy Edge Function อีกครั้ง

---

## 📝 Checklist

- [ ] ตรวจสอบ Browser Console logs
- [ ] ตรวจสอบ Supabase Edge Functions logs
- [ ] ตรวจสอบ Resend API Key
- [ ] ตรวจสอบ Vercel Environment Variables
- [ ] ตรวจสอบ email address ที่ใส่
- [ ] ตรวจสอบ Spam/Junk folder
- [ ] ทดสอบ Resend API โดยตรง

---

## 🆘 ถ้ายังแก้ไม่ได้

1. ดู Supabase Edge Functions logs
2. Copy error message มา
3. ตรวจสอบ Resend Dashboard:
   - ไปที่ https://resend.com/emails
   - ดูว่ามี email ที่ถูกส่งหรือไม่
   - ดู error messages

