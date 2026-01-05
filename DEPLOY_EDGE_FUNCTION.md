# 🚀 คำสั่ง Deploy Edge Function

## ⚠️ สำคัญ: ต้อง Deploy Edge Function ใหม่ทุกครั้งที่แก้ไขโค้ด!

### ขั้นตอนการ Deploy:

1. **เปิด Terminal/PowerShell**
   ```bash
   cd C:\Users\USER\Documents\cores\cross-learning
   ```

2. **Login Supabase (ถ้ายังไม่ได้ login)**
   ```bash
   npx supabase login
   ```

3. **Link Project (ถ้ายังไม่ได้ link)**
   ```bash
   npx supabase link --project-ref wmfuzaahfdknfjvqwwsi
   ```

4. **Deploy Edge Function `create-user`**
   ```bash
   npx supabase functions deploy create-user
   ```

5. **ตรวจสอบว่า Deploy สำเร็จ**
   - ควรเห็นข้อความ: `Deployed Function create-user`
   - ไปที่ Supabase Dashboard > Edge Functions > ตรวจสอบว่า `create-user` เป็น ACTIVE

---

## ✅ หลังจาก Deploy แล้ว:

1. **ทดสอบเพิ่ม User ใหม่**
   - ไปที่ Admin > Users > เพิ่มผู้ใช้ใหม่
   - ตรวจสอบอีเมลที่ได้รับ

2. **ตรวจสอบว่า:**
   - ✅ อีเมลมีดีไซน์โทนสีขาว-น้ำเงิน
   - ✅ ลิงก์เป็น HTTPS และปลอดภัย (ไม่ผ่าน resend-clicks.com)
   - ✅ ลิงก์ชี้ไปที่ `https://cross-learning.vercel.app/login`

---

## 🔍 ตรวจสอบ Logs:

ถ้ามีปัญหา ตรวจสอบ logs:
```bash
npx supabase functions logs create-user
```

หรือไปที่ Supabase Dashboard > Edge Functions > create-user > Logs

