# แก้ไข Deploy Command ใน Cloudflare Pages

## ❌ ปัญหา
Deploy command มีค่าเป็น `/` ซึ่งทำให้เกิด error: `Permission denied`

## ✅ วิธีแก้ไข

### ใน Cloudflare Pages Dashboard:

1. **ไปที่ Project Settings**
   - เปิด Cloudflare Dashboard
   - ไปที่ Workers & Pages > Pages
   - เลือก project `cross-learning`
   - คลิก "Settings" > "Builds & deployments"

2. **แก้ไข Deploy Command**
   - หา "Deploy command" field
   - **ลบทุกอย่างออก** (เว้นว่างเปล่า)
   - **อย่าใส่ `/` หรืออะไรเลย**

3. **ตรวจสอบ Build Settings**
   - Build command: `npm run build` ✅
   - Build output directory: `dist` ✅
   - Deploy command: **(เว้นว่าง)** ✅

4. **Save และ Retry**
   - คลิก "Save"
   - ไปที่ "Deployments"
   - คลิก "Retry deployment" หรือรอ auto-rebuild

---

## 📝 หมายเหตุ

- **Cloudflare Pages จะ deploy `dist` folder อัตโนมัติ**
- **ไม่ต้องใส่ Deploy command เลย**
- **เว้นว่างไว้**

---

## ✅ Checklist

- [ ] ลบ Deploy command (เว้นว่างเปล่า)
- [ ] ตรวจสอบ Build command: `npm run build`
- [ ] ตรวจสอบ Build output directory: `dist`
- [ ] Save settings
- [ ] Retry deployment

