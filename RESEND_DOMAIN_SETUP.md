# 🔧 ตั้งค่า Resend Domain สำหรับส่งอีเมล

## ✅ ปัญหาที่พบ

เมื่อส่งอีเมลไปที่ gmail.com จะได้ error:
```
Resend API error (403): You can only send testing emails to your own email address (webmaster@happympm.com). 
To send emails to other recipients, please verify a domain at resend.com/domains
```

**สาเหตุ:** ใช้ `onboarding@resend.dev` ซึ่งเป็น test domain และส่งได้เฉพาะ email ที่ verify แล้วเท่านั้น

---

## 🎯 วิธีแก้ไข

### วิธีที่ 1: ใช้ Domain ที่ Verify แล้ว (แนะนำ)

เนื่องจากคุณมี domain `happympm.com` ที่ verify แล้ว:

1. **ตั้งค่า Environment Variable ใน Supabase:**
   - ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
   - เพิ่ม Secret ใหม่:
     ```
     Name: RESEND_FROM
     Value: noreply@happympm.com
     ```
   - หรือใช้ email อื่นที่ใช้ domain happympm.com เช่น:
     - `no-reply@happympm.com`
     - `system@happympm.com`
     - `notifications@happympm.com`

2. **Deploy Edge Function ใหม่:**
   ```bash
   cd C:\Users\USER\Documents\cores\cross-learning
   npx supabase functions deploy create-user
   ```

3. **ทดสอบ:**
   - ลองเพิ่ม user ใหม่ด้วย email gmail.com
   - ควรส่งอีเมลได้สำเร็จ

---

### วิธีที่ 2: Verify Domain ใหม่ใน Resend

ถ้าต้องการใช้ domain อื่น:

1. **ไปที่ Resend Dashboard:**
   - https://resend.com/domains
   - คลิก "Add Domain"
   - ใส่ domain ที่ต้องการ (เช่น `crosslearning.com`)

2. **ตั้งค่า DNS Records:**
   - Resend จะแสดง DNS records ที่ต้องตั้งค่า
   - ไปที่ Domain Registrar (Namecheap, Cloudflare, etc.)
   - เพิ่ม DNS records ตามที่ Resend แนะนำ:
     - SPF record (TXT)
     - DKIM record (CNAME)
     - DMARC record (TXT)

3. **Verify Domain:**
   - รอ DNS propagation (5-30 นาที)
   - กลับไปที่ Resend Dashboard
   - คลิก "Verify"
   - ✅ Domain verified!

4. **ตั้งค่า RESEND_FROM:**
   - ใน Supabase Secrets:
     ```
     Name: RESEND_FROM
     Value: noreply@yourdomain.com
     ```

---

## 📝 หมายเหตุ

- **Default value:** ถ้าไม่ตั้ง `RESEND_FROM` โค้ดจะใช้ `noreply@happympm.com` เป็นค่า default
- **Email format:** ควรใช้รูปแบบ `noreply@domain.com` หรือ `no-reply@domain.com` สำหรับระบบอัตโนมัติ
- **Testing:** สามารถส่งอีเมลไปที่ email ใดก็ได้หลังจาก verify domain แล้ว

---

## ✅ Checklist

- [ ] ตั้งค่า `RESEND_FROM` ใน Supabase Secrets
- [ ] Deploy Edge Function `create-user` ใหม่
- [ ] ทดสอบส่งอีเมลไปที่ gmail.com
- [ ] ตรวจสอบว่าได้รับอีเมลสำเร็จ

