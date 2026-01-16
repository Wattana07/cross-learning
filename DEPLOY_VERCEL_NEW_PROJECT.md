# 🚀 Deploy ขึ้น Vercel - สร้าง Project ใหม่

## 📋 Prerequisites

- [x] โค้ดถูก push ขึ้น GitHub แล้ว (`https://github.com/Wattana07/cross-learning`)
- [x] Supabase Project ถูกตั้งค่าเรียบร้อยแล้ว
- [x] Environment Variables พร้อมใช้งาน

---

## 🎯 ขั้นตอนการ Deploy

### Step 1: Login Vercel

1. **ไปที่ Vercel**
   - https://vercel.com
   - คลิก **"Sign Up"** หรือ **"Log In"**

2. **Login ด้วย GitHub**
   - เลือก **"Continue with GitHub"**
   - Authorize Vercel เพื่อเข้าถึง GitHub repositories

---

### Step 2: สร้าง Project ใหม่

1. **คลิก "Add New..."**
   - ใน Dashboard คลิก **"Add New..."** ด้านบนขวา
   - เลือก **"Project"**

   หรือไปที่: https://vercel.com/new

2. **Import Git Repository**
   - เลือก **GitHub** (หรือ Git provider ที่ใช้)
   - ถ้ายังไม่ได้ connect ให้คลิก **"Connect GitHub Account"**
   - Authorize Vercel

3. **เลือก Repository**
   - หา repository: `Wattana07/cross-learning`
   - คลิก **"Import"**

---

### Step 3: ตั้งค่า Project

1. **Project Settings**
   - **Project Name**: `cross-learning` (หรือชื่ออื่นตามต้องการ)
   - **Framework Preset**: **Vite** (Vercel จะ auto-detect)
   - **Root Directory**: `./` (default - ไม่ต้องเปลี่ยน)

2. **Build Settings** (Vercel จะ auto-detect):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Development Command**: `npm run dev`

   ✅ **ไม่ต้องเปลี่ยนอะไร** Vercel จะ detect อัตโนมัติจาก `vercel.json`

---

### Step 4: ตั้งค่า Environment Variables

**สำคัญมาก!** ต้องตั้งค่าก่อน Deploy

1. **คลิก "Environment Variables"** (ด้านล่าง Build Settings)

2. **เพิ่ม Environment Variables** (4 ตัว):

   #### Variable 1: Supabase URL
   ```
   Name: VITE_SUPABASE_URL
   Value: https://wmfuzaahfdknfjvqwwsi.supabase.co
   Environment: Production, Preview, Development (เลือกทั้งหมด)
   ```

   #### Variable 2: Supabase Anon Key
   ```
   Name: VITE_SUPABASE_ANON_KEY
   Value: sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
   Environment: Production, Preview, Development (เลือกทั้งหมด)
   ```

   #### Variable 3: Resend API Key
   ```
   Name: VITE_RESEND_API_KEY
   Value: re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
   Environment: Production, Preview, Development (เลือกทั้งหมด)
   ```

   #### Variable 4: Site URL
   ```
   Name: VITE_SITE_URL
   Value: https://cross-learning.vercel.app
   (หรือ URL ที่ Vercel ให้ เช่น https://your-project.vercel.app)
   Environment: Production, Preview, Development (เลือกทั้งหมด)
   ```

   **หมายเหตุ:**
   - หลังจาก deploy สำเร็จ Vercel จะให้ Production URL มา
   - ให้กลับมาแก้ไข `VITE_SITE_URL` ให้เป็น Production URL จริง

3. **คลิก "Add"** หลังจากใส่แต่ละตัวแปร

---

### Step 5: Deploy!

1. **ตรวจสอบ Settings อีกครั้ง**
   - ✅ Framework: Vite
   - ✅ Build Command: `npm run build`
   - ✅ Output Directory: `dist`
   - ✅ Environment Variables: 4 ตัวถูกตั้งค่าแล้ว

2. **คลิก "Deploy"**

3. **รอ Build** (~2-5 นาที)
   - Vercel จะ:
     - Install dependencies
     - Build project
     - Deploy ไปยัง CDN

4. **✅ Deploy สำเร็จ!**
   - จะได้ Production URL: `https://cross-learning.vercel.app`
   - (หรือ `https://cross-learning-[random].vercel.app`)

---

### Step 6: อัปเดต VITE_SITE_URL

1. **คัดลอก Production URL** จาก Vercel Dashboard

2. **ไปที่ Settings > Environment Variables**

3. **แก้ไข `VITE_SITE_URL`**:
   - คลิกปุ่มแก้ไข (Edit)
   - เปลี่ยน Value เป็น Production URL ที่ได้จาก Vercel
   - คลิก **Save**

4. **Redeploy** (อัตโนมัติ หรือคลิก "Redeploy" ใน Deployments)

---

## 🔍 ตรวจสอบหลัง Deploy

### 1. ทดสอบเว็บไซต์

- ✅ เปิด Production URL
- ✅ ตรวจสอบว่าเว็บไซต์โหลดได้
- ✅ ทดสอบ Login
- ✅ ทดสอบการเรียน
- ✅ ทดสอบการจองห้อง

### 2. ตรวจสอบ Environment Variables

- เปิด Browser DevTools (F12)
- ไปที่ Console
- ตรวจสอบว่าไม่มี error เกี่ยวกับ Supabase

### 3. ตรวจสอบ Build Logs

- ใน Vercel Dashboard > Deployments
- คลิกที่ deployment ล่าสุด
- ดู Build Logs ว่ามี errors หรือไม่

---

## 🔄 Auto Deploy

หลังจาก Deploy ครั้งแรก:

- ✅ ทุกครั้งที่ push code ขึ้น GitHub
- ✅ Vercel จะ auto-deploy ใหม่อัตโนมัติ
- ✅ จะได้ Preview URLs สำหรับ Pull Requests

---

## 🐛 Troubleshooting

### Build Fails

1. **ตรวจสอบ Build Logs**
   - ไปที่ Vercel Dashboard > Deployments
   - คลิก deployment ที่ fail
   - ดู error message

2. **ตรวจสอบ Environment Variables**
   - ไปที่ Settings > Environment Variables
   - ตรวจสอบว่าตั้งค่าครบ 4 ตัวแล้ว

3. **ตรวจสอบ TypeScript Errors**
   - รัน `npm run type-check` ใน local
   - แก้ไข errors ก่อน push

### Environment Variables Not Working

- ตรวจสอบว่าตั้งค่าใน Vercel Dashboard แล้ว
- ตรวจสอบว่ามี prefix `VITE_` ถูกต้อง
- **Redeploy** หลังจากเปลี่ยน Environment Variables

### 404 Error on Routes

- Vercel ใช้ `vercel.json` สำหรับ SPA routing
- ตรวจสอบว่า `vercel.json` มี rewrites rule แล้ว

---

## ✅ Checklist

ก่อน Deploy:
- [ ] Code ถูก push ขึ้น GitHub แล้ว
- [ ] Supabase Database setup แล้ว
- [ ] มี Environment Variables ทั้ง 4 ตัว
- [ ] ทดสอบ build ใน local: `npm run build`

หลัง Deploy:
- [ ] Deploy สำเร็จ (ไม่มี errors)
- [ ] ทดสอบเว็บไซต์ทำงานได้
- [ ] อัปเดต `VITE_SITE_URL` เป็น Production URL
- [ ] Redeploy เพื่อให้ `VITE_SITE_URL` มีผล

---

## 📝 Environment Variables Reference

```env
VITE_SUPABASE_URL=https://wmfuzaahfdknfjvqwwsi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
VITE_RESEND_API_KEY=re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
VITE_SITE_URL=https://cross-learning.vercel.app
```

---

## 🎉 เสร็จแล้ว!

ตอนนี้เว็บไซต์ของคุณพร้อมใช้งานแล้วที่:
**https://cross-learning.vercel.app** (หรือ URL ที่ Vercel ให้)

---

## 📚 เอกสารเพิ่มเติม

- Vercel Documentation: https://vercel.com/docs
- Vite Deployment Guide: https://vitejs.dev/guide/static-deploy.html#vercel

