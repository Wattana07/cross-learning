# Cloudflare Pages Build Settings

## ✅ Build Settings ที่ถูกต้อง

### Framework preset
**Vite**

### Build command
```
npm run build
```

### Build output directory
```
dist
```

### Root directory
```
/
```

---

## ⚠️ อย่าใส่ Deploy Command

**Cloudflare Pages จะ deploy `dist` folder อัตโนมัติ** ไม่ต้องใส่ deploy command!

ถ้ามี deploy command ให้ลบออก หรือเว้นว่างไว้

---

## 📝 Environment Variables

ตั้งค่าใน Cloudflare Pages Dashboard > Settings > Environment variables:

```
NODE_VERSION = 20

VITE_SUPABASE_URL = https://wmfuzaahfdknfjvqwwsi.supabase.co

VITE_SUPABASE_ANON_KEY = sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ

VITE_RESEND_API_KEY = re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K

VITE_SITE_URL = https://crosslearning.com
```

---

## 🔧 ถ้า Build ล้มเหลว

1. ตรวจสอบ Build command: ต้องเป็น `npm run build`
2. ตรวจสอบ Build output directory: ต้องเป็น `dist`
3. ตรวจสอบ Environment Variables: ต้องตั้งค่าทั้งหมด
4. ตรวจสอบ Node version: ใช้ `NODE_VERSION = 20`

---

## ✅ Checklist

- [x] Build command: `npm run build`
- [x] Build output directory: `dist`
- [x] ไม่มี deploy command
- [x] Environment Variables ตั้งค่าแล้ว
- [x] ลบ `wrangler.toml` (ไม่จำเป็นสำหรับ Pages)

