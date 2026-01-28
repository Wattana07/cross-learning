# 🔧 แก้ไขปัญหา Edge Function Error หลัง Deploy ไป Vercel

## ❌ ปัญหา
เมื่อ deploy ไปที่ Vercel แล้ว login ขึ้น error: **"Edge Function returned a non-2xx status code"**

## 🔍 สาเหตุที่เป็นไปได้

1. **Edge Function ยังไม่ได้ deploy ใหม่** (ยังเป็นเวอร์ชันเก่า)
2. **Environment Variables ยังไม่ได้ตั้งค่า** ใน Supabase Dashboard
3. **Edge Function มี error เกิดขึ้น** (ต้องตรวจสอบ logs)

---

## ✅ วิธีแก้ไข

### Step 1: Deploy Edge Function ใหม่

```powershell
cd "C:\Users\USER\Downloads\cross-learning-main (1)\cross-learning-main"
npx supabase functions deploy hmpm-login
```

หรือใช้ script:

```powershell
.\deploy-hmpm-login.ps1
```

---

### Step 2: ตรวจสอบ Environment Variables

1. ไปที่ **Supabase Dashboard**: https://supabase.com/dashboard
2. เลือก project: `wmfuzaahfdknfjvqwwsi`
3. ไปที่ **Project Settings** > **Edge Functions** > **Secrets**
4. ตรวจสอบว่ามี Secrets ต่อไปนี้:
   - ✅ `HMPM_AUTH_USER` = `HappyMPM2Acitve@OMC?USER`
   - ✅ `HMPM_AUTH_PASS` = `HappyMPMAcitve@OMC?PASS`

**ถ้ายังไม่มี** → คลิก "Add new secret" และเพิ่มทั้ง 2 ตัว

---

### Step 3: ตรวจสอบ Edge Function Logs

1. ไปที่ **Supabase Dashboard** > **Edge Functions** > **hmpm-login**
2. คลิกแท็บ **Logs**
3. ดู error message ที่เกิดขึ้น

**หรือใช้ command line:**

```powershell
npx supabase functions logs hmpm-login --limit 20
```

---

### Step 4: ทดสอบ Edge Function

1. ไปที่หน้า test: `/test-hmpm-login`
2. ใส่ `mem_id` และ `mem_pass`
3. คลิก "Test HMPM Login"
4. ดู error message ที่แสดง

---

## 🐛 Troubleshooting

### ถ้ายังขึ้น error "HMPM_CONFIG_MISSING"

→ **Environment Variables ยังไม่ได้ตั้งค่า**
- ไปที่ Supabase Dashboard > Edge Functions > Secrets
- เพิ่ม `HMPM_AUTH_USER` และ `HMPM_AUTH_PASS`
- Deploy Edge Function ใหม่

### ถ้ายังขึ้น error "non-2xx status code"

→ **Edge Function มี error เกิดขึ้น**
- ตรวจสอบ logs ใน Supabase Dashboard
- ตรวจสอบว่า HMPM API URLs ถูกต้องหรือไม่
- ตรวจสอบว่า network สามารถเข้าถึง HMPM API ได้หรือไม่

### ถ้า Edge Function ไม่พบ (404)

→ **Edge Function ยังไม่ได้ deploy**
- รัน `npx supabase functions deploy hmpm-login`
- ตรวจสอบว่า deploy สำเร็จ (ควรเห็น "Deployed Function hmpm-login")

---

## ✅ Checklist

- [ ] Deploy Edge Function: `npx supabase functions deploy hmpm-login`
- [ ] ตั้งค่า Environment Variables ใน Supabase Dashboard
- [ ] ตรวจสอบ Logs ว่าไม่มี error
- [ ] ทดสอบ login ที่หน้า `/test-hmpm-login`
- [ ] ทดสอบ login ที่หน้า login จริง

---

## 📝 หมายเหตุ

- **Edge Function ต้อง deploy ใหม่ทุกครั้งที่แก้ไขโค้ด**
- **Environment Variables ต้องตั้งค่าใน Supabase Dashboard** (ไม่ใช่ใน Vercel)
- **Logs จะช่วยบอกสาเหตุของ error ได้ชัดเจน**
