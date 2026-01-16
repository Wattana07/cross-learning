# ✅ Build Checklist

## ก่อน Build

- [ ] สร้างไฟล์ `.env` จาก `env.example.txt`
- [ ] ตั้งค่า Environment Variables ทั้งหมด:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_RESEND_API_KEY`
  - [ ] `VITE_SITE_URL`
- [ ] รัน `npm install` เพื่อติดตั้ง dependencies
- [ ] ตรวจสอบ TypeScript errors: `npm run type-check`
- [ ] ตรวจสอบ Linting: `npm run lint`

## Build

- [ ] รัน `npm run build`
- [ ] ตรวจสอบว่า build สำเร็จ (ไม่มี errors)
- [ ] ตรวจสอบ output directory `dist/` ถูกสร้างแล้ว

## Test Build

- [ ] รัน `npm run preview` เพื่อทดสอบ production build
- [ ] ตรวจสอบว่าเว็บไซต์ทำงานได้
- [ ] ตรวจสอบว่า API calls ทำงาน (Supabase connection)
- [ ] ตรวจสอบว่า Authentication ทำงาน

## Deploy

- [ ] ตั้งค่า Environment Variables ใน Platform (Vercel/Cloudflare/Netlify)
- [ ] Deploy!
- [ ] ตรวจสอบว่า Production build ทำงานได้

## Post-Deploy

- [ ] ทดสอบ Login
- [ ] ทดสอบการเรียน
- [ ] ทดสอบการจองห้อง
- [ ] ตรวจสอบ Logs และ Status pages (Admin)

