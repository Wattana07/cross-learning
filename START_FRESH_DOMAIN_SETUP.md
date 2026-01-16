# คู่มือการตั้งค่า Domain ใหม่ตั้งแต่ต้น

## 🎯 ขั้นตอนทั้งหมด

### Step 1: จด Domain ใหม่จาก Cloudflare Registrar

1. **ไปที่ Cloudflare Registrar**
   - https://www.cloudflare.com/products/registrar/
   - Login เข้าสู่ระบบ

2. **ค้นหา Domain**
   - คลิก "Register domains"
   - ค้นหาชื่อ domain ที่ต้องการ (เช่น `crosslearning.com`, `myapp.com`)
   - ตรวจสอบราคา

3. **จดทะเบียน Domain**
   - เลือกจำนวนปี (1-10 ปี)
   - กรอกข้อมูลผู้จดทะเบียน
   - จ่ายเงิน
   - ✅ Domain จะถูกเพิ่มใน Cloudflare Dashboard อัตโนมัติ

---

### Step 2: ตรวจสอบ Domain ใน Cloudflare Dashboard

1. **ไปที่ Cloudflare Dashboard**
   - https://dash.cloudflare.com
   - Domain ที่จดใหม่จะปรากฏในรายการ

2. **ตรวจสอบ DNS Settings**
   - คลิก domain ที่จดใหม่
   - ไปที่ DNS > Records
   - ควรเห็น records พื้นฐาน (ถ้ามี)

---

### Step 3: Deploy App บน Cloudflare Pages (ถ้ายังไม่ได้ทำ)

1. **ไปที่ Workers & Pages**
   - คลิก "Workers & Pages" จาก sidebar
   - คลิก "Create application" > "Pages" > "Connect to Git"

2. **เชื่อม GitHub**
   - เลือก GitHub และ authorize
   - เลือก repository: `Wattana07/cross-learning`
   - คลิก "Begin setup"

3. **ตั้งค่า Build Settings**
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   Root directory: /
   Deploy command: true (หรือเว้นว่าง)
   ```

4. **ตั้งค่า Environment Variables**
   - ไปที่ Settings > Variables and Secrets
   - เพิ่ม:
     ```
     NODE_VERSION = 20
     VITE_SUPABASE_URL = https://wmfuzaahfdknfjvqwwsi.supabase.co
     VITE_SUPABASE_ANON_KEY = sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
     VITE_RESEND_API_KEY = re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
     VITE_SITE_URL = https://[domain-ใหม่].com
     ```

5. **Deploy**
   - คลิก "Deploy"
   - รอ build เสร็จ

---

### Step 4: เชื่อม Domain กับ Cloudflare Pages

1. **ใน Cloudflare Pages Dashboard**
   - ไปที่ project `cross-learning`
   - คลิก "Custom domains"
   - คลิก "Set up a custom domain"
   - ใส่ domain: `[domain-ใหม่].com`
   - Cloudflare จะสร้าง DNS records อัตโนมัติ

2. **ตรวจสอบ DNS Records**
   - ไปที่ Domain > DNS > Records
   - ควรเห็น CNAME record:
     ```
     Type: CNAME
     Name: @
     Target: [ชื่อ project].pages.dev
     Proxy: Proxied (ส้ม)
     ```

---

### Step 5: รอ DNS Propagation

- รอ 5-30 นาที
- ตรวจสอบ: เปิด `https://[domain-ใหม่].com` ควรเห็นเว็บไซต์

---

## ✅ Checklist

- [ ] จด domain ใหม่จาก Cloudflare Registrar
- [ ] ตรวจสอบ domain ใน Cloudflare Dashboard
- [ ] Deploy app บน Cloudflare Pages
- [ ] ตั้งค่า Environment Variables
- [ ] เชื่อม domain กับ Cloudflare Pages
- [ ] ตรวจสอบ DNS records
- [ ] รอ DNS propagation
- [ ] ทดสอบเว็บไซต์

---

## 💡 Tips

1. **เลือกชื่อ domain ที่สั้น จำง่าย**: เช่น `crosslearn.com`, `myapp.com`
2. **ใช้ .com ถ้าเป็นไปได้**: น่าเชื่อถือกว่า
3. **ซื้อหลายปี**: ราคาถูกกว่า
4. **เปิด Auto-renew**: ป้องกัน domain หมดอายุ

---

## 🆘 Troubleshooting

### Domain ไม่ทำงาน?
- ตรวจสอบ DNS records ถูกต้องหรือไม่
- รอ DNS propagation (อาจใช้เวลา 24-48 ชั่วโมง)
- ใช้ https://dnschecker.org ตรวจสอบ

### SSL Certificate ไม่ทำงาน?
- Cloudflare จะออก SSL อัตโนมัติ
- รอ 5-10 นาทีหลังจากตั้งค่า DNS

