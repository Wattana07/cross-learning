# แก้ไขปัญหา Redirect ไปที่ localhost

## ❌ ปัญหา

เมื่อคลิกลิงก์ในอีเมล จะ redirect ไปที่ `localhost:3000` แทน Vercel URL

## 🔍 สาเหตุ

1. `VITE_SITE_URL` ใน Vercel environment variables อาจจะยังไม่ได้ตั้งค่า
2. Code ใช้ `window.location.origin` เป็น fallback ซึ่งถ้า run บน localhost จะได้ `localhost:3000`
3. Supabase `redirectTo` ใช้ค่า localhost แทน production URL

## ✅ วิธีแก้ไข

### 1. ตั้งค่า VITE_SITE_URL ใน Vercel (สำคัญ!)

**ขั้นตอน:**
1. ไปที่ Vercel Dashboard
2. เลือก project `cross-learning`
3. ไปที่ **Settings** > **Environment Variables**
4. ตรวจสอบ/เพิ่ม `VITE_SITE_URL`:
   - Name: `VITE_SITE_URL`
   - Value: `https://crosslearning.com` (หรือ Vercel URL ของคุณ เช่น `https://cross-learning.vercel.app`)
   - Environment: Production (และ Preview ถ้าต้องการ)
5. Save
6. Retry deployment เพื่อใช้ environment variables ใหม่

---

### 2. ตั้งค่า SITE_URL ใน Supabase Secrets

**ขั้นตอน:**
1. ไปที่ https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi
2. ไปที่ **Project Settings** > **Edge Functions** > **Secrets**
3. เพิ่ม Secret:
   - Name: `SITE_URL`
   - Value: `https://crosslearning.com` (หรือ Vercel URL ของคุณ)
4. Save

---

### 3. Code ที่แก้ไขแล้ว

Code ถูกแก้ไขให้:
- ใช้ `VITE_SITE_URL` เป็นหลัก
- ไม่ใช้ `window.location.origin` ถ้าเป็น localhost
- มี fallback เป็น production URL

---

## 🔧 ตรวจสอบ

### ตรวจสอบ VITE_SITE_URL ใน Vercel:
1. ไปที่ Vercel Dashboard
2. Settings > Environment Variables
3. ตรวจสอบว่า `VITE_SITE_URL` ถูกตั้งค่าแล้ว
4. ต้องเป็น HTTPS URL (เช่น `https://crosslearning.com`)

### ตรวจสอบ SITE_URL ใน Supabase:
1. ไปที่ Supabase Dashboard
2. Project Settings > Edge Functions > Secrets
3. ตรวจสอบว่า `SITE_URL` ถูกตั้งค่าแล้ว

---

## ✅ Checklist

- [ ] ตั้งค่า `VITE_SITE_URL` ใน Vercel Environment Variables
- [ ] ตั้งค่า `SITE_URL` ใน Supabase Secrets
- [ ] Retry deployment ใน Vercel
- [ ] ทดสอบเพิ่ม User ใหม่
- [ ] ตรวจสอบลิงก์ในอีเมลว่า redirect ไปที่ production URL

---

## 📝 หมายเหตุ

- `VITE_SITE_URL` ต้องตั้งค่าใน Vercel Environment Variables
- `SITE_URL` ต้องตั้งค่าใน Supabase Secrets
- Code ถูกแก้ไขแล้ว (push ไป GitHub แล้ว)
- Vercel จะ auto-deploy จาก GitHub

