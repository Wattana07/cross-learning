# คู่มือการ Deploy บน Vercel

## 🚀 ขั้นตอนการ Deploy

### Step 1: สมัคร/Login Vercel

1. **ไปที่ Vercel**
   - https://vercel.com
   - Sign up / Login ด้วย GitHub account

---

### Step 2: Import Project จาก GitHub

1. **คลิก "Add New..." > "Project"**
   - หรือไปที่ https://vercel.com/new

2. **Import Git Repository**
   - เลือก "Import Git Repository"
   - เลือก GitHub
   - Authorize Vercel (ถ้ายังไม่ได้ทำ)
   - เลือก repository: `Wattana07/cross-learning`

3. **ตั้งค่า Project**
   - Project Name: `cross-learning` (หรือชื่ออื่น)
   - Framework Preset: **Vite** (Vercel จะ auto-detect)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-detect)
   - Output Directory: `dist` (auto-detect)

4. **ตั้งค่า Environment Variables**
   
   **วิธีที่ 1: Import จากไฟล์ (แนะนำ - เร็วที่สุด)**
   - คลิก "Environment Variables"
   - คลิก "Import" หรือ "Import from .env"
   - Copy เนื้อหาจากไฟล์ `.env.vercel` ในโปรเจกต์
   - Paste ลงไป
   - Vercel จะ parse และเพิ่ม variables ทั้งหมดให้อัตโนมัติ
   
   **วิธีที่ 2: เพิ่มทีละตัว**
   - คลิก "Environment Variables"
   - คลิก "Add" หรือ "+"
   - เพิ่ม variables:
     ```
     VITE_SUPABASE_URL = https://wmfuzaahfdknfjvqwwsi.supabase.co
     VITE_SUPABASE_ANON_KEY = sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
     VITE_RESEND_API_KEY = re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
     VITE_SITE_URL = https://crosslearning.com
     ```
   - เลือก Environment: Production (และ Preview ถ้าต้องการ)

5. **Deploy**
   - คลิก "Deploy"
   - รอ build เสร็จ (~2-3 นาที)
   - ✅ ได้ Production URL: `https://cross-learning.vercel.app`

---

### Step 3: เชื่อม Domain กับ Vercel

1. **ใน Vercel Dashboard**
   - ไปที่ Project Settings > Domains
   - คลิก "Add Domain"
   - ใส่ domain: `crosslearning.com`

2. **Vercel จะแสดง DNS records ที่ต้องตั้งค่า**
   - Type: A
   - Host: @
   - Value: `76.76.21.21`
   - Type: CNAME
   - Host: www
   - Value: `cname.vercel-dns.com`

3. **ตั้งค่า DNS ใน Domain Registrar**
   - ไปที่ GoDaddy (หรือ registrar ที่ใช้)
   - ไปที่ DNS settings
   - เพิ่ม DNS records ตามที่ Vercel แนะนำ

4. **รอ DNS Propagation**
   - รอ 5-30 นาที
   - Vercel จะออก SSL certificate อัตโนมัติ

---

## ✅ Checklist

- [ ] Login Vercel ด้วย GitHub
- [ ] Import project จาก GitHub
- [ ] ตั้งค่า Framework: Vite
- [ ] ตั้งค่า Environment Variables
- [ ] Deploy
- [ ] เชื่อม domain กับ Vercel
- [ ] ตั้งค่า DNS records
- [ ] รอ DNS propagation
- [ ] ทดสอบเว็บไซต์

---

## 🎯 ข้อดีของ Vercel

- ✅ Deploy ง่ายมาก (เชื่อม GitHub แล้ว deploy อัตโนมัติ)
- ✅ Auto-detect Vite settings
- ✅ ฟรี SSL certificate
- ✅ CDN อัตโนมัติ
- ✅ เร็วมาก
- ✅ ไม่ต้องตั้งค่า nameservers (ใช้ DNS records แทน)

---

## 📝 หมายเหตุ

- Vercel จะ auto-detect Vite settings
- Environment Variables ตั้งค่าใน Vercel Dashboard
- DNS records ตั้งค่าใน Domain Registrar (ไม่ต้องเปลี่ยน nameservers)

