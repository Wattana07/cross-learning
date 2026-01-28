# 🔧 แก้ไขปัญหา 401 Unauthorized ใน Vercel

## ❌ ปัญหา
เมื่อ login ใน Vercel ขึ้น error: **401 (Unauthorized)** เมื่อเรียก Edge Function `hmpm-login`

```
POST https://wmfuzaahfdknfjvqwwsi.supabase.co/functions/v1/hmpm-login 401 (Unauthorized)
```

---

## 🔍 สาเหตุ

**Supabase Functions ต้องการ `apikey` header (anon key)** เพื่อเรียกใช้ Edge Function

`supabase.functions.invoke()` จะส่ง `apikey` header อัตโนมัติจาก `VITE_SUPABASE_ANON_KEY` ที่ใช้สร้าง Supabase client

**ปัญหาน่าจะเป็น:**
- `VITE_SUPABASE_ANON_KEY` ไม่ถูกต้องใน Vercel
- หรือไม่ได้ตั้งค่าใน Vercel Environment Variables

---

## ✅ วิธีแก้ไข

### Step 1: ตรวจสอบ Environment Variables ใน Vercel

1. ไปที่ **Vercel Dashboard**: https://vercel.com/dashboard
2. เลือก project: `cross-learning-demo` (หรือชื่อ project ของคุณ)
3. ไปที่ **Settings** > **Environment Variables**
4. ตรวจสอบว่ามี variables ต่อไปนี้:

   ```
   VITE_SUPABASE_URL = https://wmfuzaahfdknfjvqwwsi.supabase.co
   VITE_SUPABASE_ANON_KEY = sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
   ```

   **สำคัญ:** 
   - `VITE_SUPABASE_ANON_KEY` ต้องเป็น **anon/public key** (ไม่ใช่ service role key)
   - ต้องมี prefix `VITE_` ทั้งหมด
   - เลือก Environment: **Production, Preview, Development** (เลือกทั้งหมด)

5. **ถ้ายังไม่มี** → คลิก "Add" และเพิ่ม:
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ` (หรือ anon key ของคุณ)
   - Environment: Production, Preview, Development

---

### Step 2: Redeploy ใน Vercel

**สำคัญ:** หลังจากเปลี่ยน Environment Variables ต้อง **Redeploy**:

1. ไปที่ **Deployments** tab
2. คลิก "..." ตรง deployment ล่าสุด
3. เลือก **"Redeploy"**
4. หรือ push code ใหม่ขึ้น GitHub (Vercel จะ auto-deploy)

---

### Step 3: ตรวจสอบ Browser Console

1. เปิดเว็บไซต์ใน Vercel: https://cross-learning-demo.vercel.app/login
2. เปิด **Developer Tools** (F12)
3. ไปที่แท็บ **Console**
4. ลอง login
5. ดู logs:

   ```
   [HMPM Login] Supabase Config: {
     url: "https://wmfuzaahfdknfjvqwwsi.supabase.co",
     hasAnonKey: true,
     anonKeyLength: 100,
     anonKeyPrefix: "sb_publisha"
   }
   ```

   **ถ้า `hasAnonKey: false` หรือ `anonKeyLength: 0`** → Environment Variable ไม่ได้ตั้งค่า

---

### Step 4: ตรวจสอบ Edge Function Logs

1. ไปที่ **Supabase Dashboard**: https://supabase.com/dashboard
2. เลือก project: `wmfuzaahfdknfjvqwwsi`
3. ไปที่ **Edge Functions** > **hmpm-login** > **Logs**
4. ดู logs ว่า headers ถูกส่งมาหรือไม่:

   ```
   [abc123] Headers check: {
     hasApikey: true,
     hasAuthHeader: false,
     apikeyLength: 100,
     allHeaders: { ... }
   }
   ```

   **ถ้า `hasApikey: false`** → `apikey` header ไม่ถูกส่งมา

---

## 🐛 Troubleshooting

### ถ้ายังขึ้น 401 หลังจากตั้งค่า Environment Variables

**ตรวจสอบ:**
1. ✅ Environment Variables ตั้งค่าใน Vercel แล้ว
2. ✅ `VITE_SUPABASE_ANON_KEY` เป็น anon key (ไม่ใช่ service role key)
3. ✅ Redeploy ใน Vercel แล้ว
4. ✅ ตรวจสอบ Browser Console ว่า `hasAnonKey: true`

**ลองทำ:**
- Clear browser cache
- ลองใช้ Incognito/Private mode
- ตรวจสอบ Network tab ใน Developer Tools ว่า request มี `apikey` header หรือไม่

---

### ถ้า `hasAnonKey: false` ใน Browser Console

→ **Environment Variable ไม่ได้ตั้งค่าใน Vercel**
- ไปที่ Vercel Dashboard > Settings > Environment Variables
- เพิ่ม `VITE_SUPABASE_ANON_KEY`
- Redeploy

---

### ถ้า `hasApikey: false` ใน Edge Function Logs

→ **Supabase client ไม่ได้ส่ง `apikey` header**
- ตรวจสอบว่า `VITE_SUPABASE_ANON_KEY` ถูกต้อง
- ตรวจสอบว่า Supabase client ถูก initialize ถูกต้อง
- ตรวจสอบ Browser Console ว่า environment variables ถูก load หรือไม่

---

## ✅ Checklist

ก่อนแก้ไข:
- [ ] ตรวจสอบ Environment Variables ใน Vercel
- [ ] ตรวจสอบว่า `VITE_SUPABASE_ANON_KEY` ตั้งค่าแล้ว
- [ ] ตรวจสอบ Browser Console ว่า `hasAnonKey: true`

หลังแก้ไข:
- [ ] Redeploy ใน Vercel
- [ ] ทดสอบ login ใน Vercel
- [ ] ตรวจสอบ Browser Console ว่าไม่มี 401 error
- [ ] ตรวจสอบ Edge Function Logs ว่า `hasApikey: true`

---

## 📝 หมายเหตุ

- **`VITE_SUPABASE_ANON_KEY`** ต้องเป็น **anon/public key** (ไม่ใช่ service role key)
- **Service role key** ใช้สำหรับ server-side operations เท่านั้น
- **Anon key** ใช้สำหรับ client-side operations (เช่น `supabase.functions.invoke()`)
- **ต้อง Redeploy** หลังจากเปลี่ยน Environment Variables

---

## 🔗 Links

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Edge Functions Logs: https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi/functions
