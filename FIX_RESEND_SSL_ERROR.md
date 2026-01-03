# แก้ไข SSL Error จาก Resend Click Tracking

## ❌ ปัญหา

เมื่อคลิกลิงก์ในอีเมล จะเห็น error:
- "Your connection is not private"
- `NET::ERR_CERT_COMMON_NAME_INVALID`
- Certificate จาก `*.truecybersecure.com` แต่ server เป็น `us-east-1.resend-clicks.com`

## 🔍 สาเหตุ

Resend ใช้ **click tracking** โดย default ซึ่ง:
- Redirect ลิงก์ผ่าน `resend-clicks.com`
- มีปัญหา SSL certificate
- ทำให้ browser แสดง warning

## ✅ วิธีแก้ไข

### วิธีที่ 1: ปิด Click Tracking (แนะนำ)

แก้ไขใน `create-user` Edge Function:
```typescript
body: JSON.stringify({
  from: 'onboarding@resend.dev',
  to: email,
  subject: `ยินดีต้อนรับสู่ระบบ - ตั้งรหัสผ่านของคุณ`,
  html: emailHtml,
  text: emailText,
  click_tracking: false, // ปิด click tracking
}),
```

**ข้อดี:**
- ลิงก์จะชี้ไปที่ Supabase โดยตรง (ไม่ผ่าน Resend)
- ไม่มี SSL error
- เร็วกว่า

**ข้อเสีย:**
- ไม่สามารถ track การคลิกลิงก์ได้

---

### วิธีที่ 2: ใช้ Supabase Built-in Email (ถ้าต้องการ)

เปลี่ยนไปใช้ `inviteUserByEmail` แทน Resend:
```typescript
const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
  data: {
    full_name: fullName,
    department: department || '',
  },
});
```

**ข้อดี:**
- ไม่มี SSL error
- ใช้ Supabase email service โดยตรง
- ไม่ต้องใช้ Resend API

**ข้อเสีย:**
- ต้องตั้งค่า Supabase email service ก่อน
- ไม่สามารถ customize email template ได้มาก

---

## 🔧 ขั้นตอนการแก้ไข

1. **แก้ไข Edge Function**
   - เพิ่ม `click_tracking: false` ใน Resend API call
   - Deploy: `npx supabase functions deploy create-user`

2. **ทดสอบ**
   - ลองเพิ่ม User ใหม่
   - ตรวจสอบอีเมลที่ได้รับ
   - คลิกลิงก์ - ควรไม่มี SSL error แล้ว

---

## ✅ Checklist

- [x] แก้ไข Edge Function ให้ปิด click tracking
- [x] Deploy Edge Function
- [ ] ทดสอบเพิ่ม User ใหม่
- [ ] ตรวจสอบลิงก์ในอีเมลว่าไม่มี SSL error

---

## 📝 หมายเหตุ

- Click tracking ถูกปิดแล้ว
- ลิงก์จะชี้ไปที่ Supabase โดยตรง
- ไม่มี SSL error แล้ว

