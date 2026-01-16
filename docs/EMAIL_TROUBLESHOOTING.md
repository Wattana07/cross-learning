# คู่มือแก้ไขปัญหาการส่งอีเมล

## ✅ ขั้นตอนที่ต้องทำ (สำคัญ!)

### 1. ตั้งค่า Resend API Key ใน Supabase

**ขั้นตอน:**
1. ไปที่ Supabase Dashboard: https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi
2. ไปที่ **Project Settings** > **Edge Functions** > **Secrets**
3. คลิก **"New secret"**
4. ใส่ข้อมูล:
   - **Name:** `resend_api_key` (ตัวพิมพ์เล็กทั้งหมด!)
   - **Value:** `re_j3xSDNVe_GpS257HZTdT7iub22ZeE4s3r`
5. คลิก **"Create secret"**

**⚠️ หมายเหตุ:** ชื่อ Secret ต้องเป็นตัวพิมพ์เล็กเท่านั้น (`resend_api_key`) ไม่ใช่ `RESEND_API_KEY`

---

### 2. ตรวจสอบว่า Functions ถูก Deploy แล้ว

รันคำสั่งนี้ใน terminal:

```bash
cd C:\Users\USER\Documents\cores\cross-learning
npx supabase functions list
```

ควรเห็น:
- ✅ `send-email` - ACTIVE
- ✅ `create-user` - ACTIVE

---

### 3. ทดสอบการส่งอีเมล

1. **เพิ่ม user ใหม่:**
   - ไปที่ Admin > Users > เพิ่มผู้ใช้ใหม่
   - กรอกข้อมูล: อีเมล, ชื่อ-นามสกุล, แผนก, Role
   - คลิก "สร้างผู้ใช้"

2. **ตรวจสอบ Logs:**
   - ไปที่ Supabase Dashboard > Edge Functions > Logs
   - ดู logs ของ `create-user` และ `send-email`
   - ตรวจสอบ error messages

3. **ตรวจสอบ Resend Dashboard:**
   - ไปที่ https://resend.com/emails
   - ดูว่ามีอีเมลถูกส่งหรือไม่
   - ตรวจสอบ status (sent, delivered, bounced)

4. **ตรวจสอบอีเมล:**
   - ตรวจสอบ Inbox
   - ตรวจสอบ Spam/Junk folder
   - ตรวจสอบว่า email address ถูกต้อง

---

## 🔍 วิธีตรวจสอบปัญหา

### ปัญหา: ไม่ได้รับอีเมล

**1. ตรวจสอบ Logs:**
```
Supabase Dashboard > Edge Functions > Logs > create-user
```

ดู error messages เช่น:
- `RESEND_API_KEY is not set` → ยังไม่ได้ตั้งค่า Secret
- `EMAIL_SERVICE_NOT_CONFIGURED` → API Key ไม่ถูกต้อง
- `EMAIL_SEND_FAILED` → ดู error details

**2. ตรวจสอบ Resend Dashboard:**
- ไปที่ https://resend.com/emails
- ดูว่ามีอีเมลถูกส่งหรือไม่
- ดู error messages (ถ้ามี)

**3. ทดสอบ send-email function โดยตรง:**

ใช้ curl หรือ Postman:

```bash
curl -X POST https://wmfuzaahfdknfjvqwwsi.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>"
  }'
```

---

## 🛠️ แก้ไขปัญหาที่พบบ่อย

### ปัญหา 1: `RESEND_API_KEY is not set`

**สาเหตุ:** ยังไม่ได้ตั้งค่า Secret ใน Supabase

**แก้ไข:**
1. ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. เพิ่ม Secret ชื่อ `resend_api_key` (ตัวพิมพ์เล็ก)
3. ใส่ Value: `re_j3xSDNVe_GpS257HZTdT7iub22ZeE4s3r`
4. Deploy function ใหม่: `npx supabase functions deploy send-email`

---

### ปัญหา 2: `EMAIL_SEND_FAILED`

**สาเหตุ:** API Key ไม่ถูกต้อง หรือ Resend API error

**แก้ไข:**
1. ตรวจสอบว่า API Key ถูกต้อง
2. ตรวจสอบ Resend Dashboard ว่ามี error อะไร
3. ตรวจสอบว่า email address ถูกต้อง

---

### ปัญหา 3: อีเมลไปอยู่ใน Spam

**สาเหตุ:** ใช้ `onboarding@resend.dev` ซึ่งอาจถูก mark เป็น spam

**แก้ไข:**
- ตรวจสอบ Spam/Junk folder
- ถ้าต้องการใช้งานจริง ควร verify domain ใน Resend

---

### ปัญหา 4: Recovery link ไม่ถูกสร้าง

**สาเหตุ:** Supabase Auth configuration

**แก้ไข:**
1. ตรวจสอบว่า Supabase Auth เปิดใช้งานแล้ว
2. ตรวจสอบ logs ของ `create-user` function
3. ดู error message จาก `generateLink`

---

## 📝 Checklist

- [ ] Resend API Key ถูกตั้งค่าใน Supabase Secrets (`resend_api_key`)
- [ ] `send-email` function ถูก deploy แล้ว
- [ ] `create-user` function ถูก deploy แล้ว
- [ ] ลองเพิ่ม user ใหม่
- [ ] ตรวจสอบ Logs ใน Supabase Dashboard
- [ ] ตรวจสอบ Resend Dashboard
- [ ] ตรวจสอบอีเมล (Inbox และ Spam)

---

## 🆘 ถ้ายังไม่ทำงาน

1. **ดู Logs:**
   - Supabase Dashboard > Edge Functions > Logs
   - ดู error messages ทั้งหมด

2. **ทดสอบ send-email โดยตรง:**
   - ใช้ curl หรือ Postman
   - ดู response และ error messages

3. **ตรวจสอบ Resend Dashboard:**
   - ดูว่ามีอีเมลถูกส่งหรือไม่
   - ดู error messages

4. **ติดต่อ Support:**
   - ถ้ายังแก้ไม่ได้ ให้ส่ง error messages จาก Logs มา

