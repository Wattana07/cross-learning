# 🚀 Build Instructions

## Prerequisites

- Node.js 18+ และ npm
- Supabase Project ที่ตั้งค่าเรียบร้อยแล้ว
- Environment Variables ที่จำเป็น

## 📋 Environment Variables

### Development

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

แก้ไขค่าต่างๆ ใน `.env`:
- `VITE_SUPABASE_URL` - Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase Anon/Public Key
- `VITE_RESEND_API_KEY` - Resend API Key (สำหรับส่งอีเมล)
- `VITE_SITE_URL` - URL ของเว็บไซต์ (localhost สำหรับ development)

### Production

สำหรับ Production ให้ตั้งค่า Environment Variables ใน Platform ที่ใช้:

**Vercel:**
- Settings > Environment Variables
- เพิ่มตัวแปรทั้งหมดที่มี prefix `VITE_`

**Cloudflare Pages:**
- Settings > Environment Variables
- เพิ่มตัวแปรทั้งหมดที่มี prefix `VITE_`

## 🔨 Build Commands

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Output

Production build จะสร้างไฟล์ในโฟลเดอร์ `dist/`:
- `dist/index.html` - Entry point
- `dist/assets/` - JavaScript, CSS, และไฟล์ static อื่นๆ

## 📦 Build Optimization

Vite จะทำการ optimize อัตโนมัติ:
- **Code Splitting**: แบ่งโค้ดตาม route
- **Tree Shaking**: ลบโค้ดที่ไม่ใช้
- **Minification**: บีบอัดไฟล์ JavaScript และ CSS
- **Asset Optimization**: optimize รูปภาพและ assets

## 🚢 Deployment

### Vercel (แนะนำ)

1. Connect GitHub repository
2. Vercel จะ detect Vite project อัตโนมัติ
3. ตั้งค่า Environment Variables
4. Deploy!

**Settings:**
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Cloudflare Pages

1. Connect GitHub repository
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
3. ตั้งค่า Environment Variables
4. Deploy!

### Netlify

1. Connect GitHub repository
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. ตั้งค่า Environment Variables
4. Deploy!

## ✅ Pre-Build Checklist

ก่อน build ควรตรวจสอบ:

- [ ] มีไฟล์ `.env` หรือตั้งค่า Environment Variables แล้ว
- [ ] Supabase Database ถูก setup แล้ว (รัน `schema.sql`)
- [ ] Supabase Edge Functions ถูก deploy แล้ว (ถ้าใช้)
- [ ] ทดสอบ development mode (`npm run dev`) ทำงานได้
- [ ] ไม่มี TypeScript errors (`npm run lint`)

## 🐛 Troubleshooting

### Build Fails

1. **Check TypeScript errors:**
   ```bash
   npm run lint
   ```

2. **Check missing dependencies:**
   ```bash
   npm install
   ```

3. **Clear cache and rebuild:**
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### Environment Variables Not Working

- ตรวจสอบว่า Environment Variables ตั้งค่าใน Platform แล้ว
- ตรวจสอบว่าใช้ prefix `VITE_` ถูกต้อง
- สำหรับ Production อาจต้อง rebuild หลังจากเปลี่ยน Environment Variables

### Build Size Too Large

- ตรวจสอบว่าไม่ได้ bundle dependencies ที่ไม่จำเป็น
- ใช้ `npm run build -- --analyze` เพื่อวิเคราะห์ bundle size (ถ้ามี plugin)

## 📊 Build Size

Build ขั้นต่ำควรอยู่ที่ประมาณ:
- Initial bundle: ~200-300 KB (gzipped)
- Total assets: ~1-2 MB

## 🔍 Verification

หลังจาก build แล้ว:

1. **Test locally:**
   ```bash
   npm run preview
   ```

2. **Check files:**
   ```bash
   ls -la dist/
   ```

3. **Verify environment variables:**
   - ตรวจสอบว่า API calls ทำงานถูกต้อง
   - ตรวจสอบว่า Supabase connection ทำงาน

## 📝 Notes

- Production build จะถูก minify และ optimize อัตโนมัติ
- Source maps จะถูกสร้างเพื่อ debug (สามารถปิดได้ใน `vite.config.ts`)
- ไฟล์ static จะถูก copy ไปที่ `dist/` อัตโนมัติ

