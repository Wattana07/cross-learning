# 🔧 แก้ไขปัญหา Login ใน Vercel (Production)

## ❌ ปัญหา
- ✅ Login ใน **localhost** ทำงานได้ปกติ
- ❌ Login ใน **Vercel (Production)** มีปัญหา: "Edge Function returned a non-2xx status code"

---

## 🔍 สาเหตุที่เป็นไปได้

### 1. **Edge Function ยังไม่ได้ Deploy ใหม่**
- Edge Function ที่ deploy ไปยังเป็นเวอร์ชันเก่า
- หรือยังไม่ได้ deploy เลย

### 2. **Environment Variables ใน Vercel ยังไม่ได้ตั้งค่า**
- `VITE_SUPABASE_URL` ไม่ถูกต้อง
- `VITE_SUPABASE_ANON_KEY` ไม่ถูกต้อง

### 3. **Edge Function Environment Variables ยังไม่ได้ตั้งค่า**
- `HMPM_AUTH_USER` และ `HMPM_AUTH_PASS` ยังไม่ได้ตั้งค่าใน Supabase Dashboard

### 4. **Network/CORS Issues**
- Vercel ไม่สามารถเข้าถึง HMPM API ได้
- หรือมีปัญหา CORS

---

## ✅ วิธีแก้ไข (ทำตามลำดับ)

### Step 1: ตรวจสอบ Environment Variables ใน Vercel

1. ไปที่ **Vercel Dashboard**: https://vercel.com/dashboard
2. เลือก project: `cross-learning-demo` (หรือชื่อ project ของคุณ)
3. ไปที่ **Settings** > **Environment Variables**
4. ตรวจสอบว่ามี variables ต่อไปนี้:

   ```
   VITE_SUPABASE_URL = https://wmfuzaahfdknfjvqwwsi.supabase.co
   VITE_SUPABASE_ANON_KEY = sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
   VITE_RESEND_API_KEY = re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
   VITE_SITE_URL = https://cross-learning-demo.vercel.app
   ```

   **สำคัญ:** 
   - ต้องมี prefix `VITE_` ทั้งหมด
   - `VITE_SITE_URL` ต้องเป็น URL ของ Vercel deployment จริง
   - เลือก Environment: **Production, Preview, Development** (เลือกทั้งหมด)

5. **ถ้ายังไม่มี** → คลิก "Add" และเพิ่มทั้งหมด
6. **Redeploy** หลังจากเพิ่ม/แก้ไข Environment Variables:
   - ไปที่ **Deployments** tab
   - คลิก "..." ตรง deployment ล่าสุด
   - เลือก "Redeploy"

---

### Step 2: Deploy Edge Function ใหม่

**สำคัญ:** Edge Function ต้อง deploy ใหม่ทุกครั้งที่แก้ไขโค้ด!

```powershell
cd "C:\Users\USER\Downloads\cross-learning-main (1)\cross-learning-main"
npx supabase functions deploy hmpm-login
```

**ตรวจสอบว่า Deploy สำเร็จ:**
- ควรเห็นข้อความ: `Deployed Function hmpm-login`
- ไปที่ Supabase Dashboard > Edge Functions > ตรวจสอบว่า `hmpm-login` เป็น **ACTIVE**

---

### Step 3: ตรวจสอบ Edge Function Environment Variables

1. ไปที่ **Supabase Dashboard**: https://supabase.com/dashboard
2. เลือก project: `wmfuzaahfdknfjvqwwsi`
3. ไปที่ **Project Settings** > **Edge Functions** > **Secrets**
4. ตรวจสอบว่ามี Secrets ต่อไปนี้:

   ```
   HMPM_AUTH_USER = HappyMPM2Acitve@OMC?USER
   HMPM_AUTH_PASS = HappyMPMAcitve@OMC?PASS
   ```

   **ถ้ายังไม่มี** → คลิก "Add new secret" และเพิ่มทั้ง 2 ตัว

---

### Step 4: ตรวจสอบ Edge Function Logs

1. ไปที่ **Supabase Dashboard** > **Edge Functions** > **hmpm-login**
2. คลิกแท็บ **Logs**
3. ลอง login ใน Vercel อีกครั้ง
4. ดู error message ที่เกิดขึ้นใน logs

**หรือใช้ command line:**

```powershell
npx supabase functions logs hmpm-login --limit 20
```

---

### Step 5: ตรวจสอบ Browser Console

1. เปิดเว็บไซต์ใน Vercel: https://cross-learning-demo.vercel.app/login
2. เปิด **Developer Tools** (F12)
3. ไปที่แท็บ **Console**
4. ลอง login
5. ดู error messages ที่แสดง

---

## 🐛 Troubleshooting

### ถ้ายังขึ้น error "non-2xx status code"

**ตรวจสอบ:**
1. ✅ Edge Function ถูก deploy แล้วหรือยัง?
2. ✅ Environment Variables ใน Vercel ตั้งค่าแล้วหรือยัง?
3. ✅ Edge Function Secrets ตั้งค่าแล้วหรือยัง?
4. ✅ ตรวจสอบ Logs ใน Supabase Dashboard

**ลองทำ:**
- Clear browser cache
- ลองใช้ Incognito/Private mode
- ตรวจสอบ Network tab ใน Developer Tools ว่า request ไปที่ Edge Function หรือไม่

---

### ถ้า Edge Function ไม่พบ (404)

→ **Edge Function ยังไม่ได้ deploy**
- รัน `npx supabase functions deploy hmpm-login`
- ตรวจสอบว่า deploy สำเร็จ

---

### ถ้า Environment Variables ไม่ทำงาน

→ **ต้อง Redeploy หลังจากเปลี่ยน Environment Variables**
- ไปที่ Vercel Dashboard > Deployments
- คลิก "Redeploy" บน deployment ล่าสุด

---

### ถ้า HMPM API ไม่สามารถเข้าถึงได้

→ **ตรวจสอบว่า HMPM API URLs ถูกต้อง**
- ตรวจสอบใน `supabase/functions/hmpm-login/index.ts`
- URLs ควรเป็น:
  - `https://myhmpm.com/app/v1.0/index.php/auth/`
  - `https://myhmpm.com/app/v1.0/index.php/auth/member/`

---

## ✅ Checklist

ก่อนแก้ไข:
- [ ] ตรวจสอบ Environment Variables ใน Vercel
- [ ] ตรวจสอบ Edge Function ถูก deploy แล้วหรือยัง
- [ ] ตรวจสอบ Edge Function Secrets ตั้งค่าแล้วหรือยัง

หลังแก้ไข:
- [ ] Deploy Edge Function ใหม่
- [ ] Redeploy ใน Vercel (หลังจากเปลี่ยน Environment Variables)
- [ ] ตรวจสอบ Logs ใน Supabase Dashboard
- [ ] ทดสอบ login ใน Vercel
- [ ] ตรวจสอบ Browser Console ว่าไม่มี errors

---

## 📝 หมายเหตุ

- **Environment Variables ใน Vercel** ≠ **Edge Function Secrets ใน Supabase**
- **Vercel Environment Variables** ใช้สำหรับ frontend (VITE_*)
- **Supabase Edge Function Secrets** ใช้สำหรับ Edge Functions (HMPM_AUTH_USER, HMPM_AUTH_PASS)
- **ต้อง Redeploy** หลังจากเปลี่ยน Environment Variables
- **Edge Function ต้อง deploy ใหม่** ทุกครั้งที่แก้ไขโค้ด

---

## 🔗 Links

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Edge Functions Logs: https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi/functions
