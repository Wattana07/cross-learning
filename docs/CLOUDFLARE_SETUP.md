# คู่มือการตั้งค่า Cloudflare สำหรับ Production

## 🎯 ทำไมเลือก Cloudflare?

- **Domain Registrar**: ราคาต้นทุน (ไม่มี markup) - ถูกที่สุด!
- **Cloudflare Pages**: ฟรี hosting, เร็วมาก, CDN อัตโนมัติ
- **DNS**: ฟรี, เร็ว, มี DDoS protection
- **SSL**: ฟรี, อัตโนมัติ
- **ไม่มี hidden fees**: ราคาชัดเจน

---

## 📝 ขั้นตอนการตั้งค่า

### Step 1: จด Domain จาก Cloudflare Registrar

1. **ไปที่ Cloudflare Registrar**
   - https://www.cloudflare.com/products/registrar/
   - Sign up / Login ด้วย Cloudflare account

2. **ค้นหา Domain**
   - คลิก "Register domains"
   - ค้นหาชื่อ domain ที่ต้องการ (เช่น `crosslearning.com`)
   - ตรวจสอบราคา (มักจะถูกกว่า registrar อื่น)

3. **จดทะเบียน Domain**
   - เลือกจำนวนปี (1-10 ปี)
   - กรอกข้อมูลผู้จดทะเบียน
   - จ่ายเงิน
   - ✅ Domain จะถูกเพิ่มใน Cloudflare Dashboard อัตโนมัติ

4. **บันทึก**: Domain จะใช้ Cloudflare DNS อัตโนมัติ

---

### Step 2: Deploy App บน Cloudflare Pages

#### วิธีที่ 1: Deploy ผ่าน GitHub (แนะนำ)

1. **Push code ไป GitHub**
   ```bash
   cd cross-learning
   git init
   git add .
   git commit -m "Initial commit"
   
   # สร้าง repository ใหม่บน GitHub ก่อน
   git remote add origin https://github.com/yourusername/cross-learning.git
   git branch -M main
   git push -u origin main
   ```

2. **เชื่อม Cloudflare Pages กับ GitHub**
   - ไปที่ https://dash.cloudflare.com
   - เลือก "Workers & Pages" จาก sidebar
   - คลิก "Create application" > "Pages" > "Connect to Git"
   - เลือก GitHub และ authorize
   - เลือก repository `cross-learning`
   - คลิก "Begin setup"

3. **ตั้งค่า Build Settings**
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   Root directory: /
   ```

4. **ตั้งค่า Environment Variables**
   - คลิก "Environment variables" ในหน้า project settings
   - เพิ่ม variables:
     ```
     NODE_VERSION = 20
     VITE_SUPABASE_URL = https://wmfuzaahfdknfjvqwwsi.supabase.co
     VITE_SUPABASE_ANON_KEY = sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
     VITE_RESEND_API_KEY = re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
     VITE_SITE_URL = https://yourdomain.com
     ```

5. **Deploy**
   - คลิก "Save and Deploy"
   - รอ build เสร็จ (~2-3 นาที)
   - ✅ ได้ Production URL: `https://cross-learning.pages.dev`

#### วิธีที่ 2: Deploy ผ่าน Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
cd cross-learning
npm run build
wrangler pages deploy dist --project-name=cross-learning
```

---

### Step 3: เชื่อม Domain กับ Cloudflare Pages

1. **ใน Cloudflare Pages Dashboard**
   - ไปที่ project settings
   - คลิก "Custom domains"
   - คลิก "Set up a custom domain"
   - ใส่ domain: `yourdomain.com`
   - Cloudflare จะแสดง DNS records ที่ต้องตั้งค่า

2. **ใน Cloudflare DNS Dashboard**
   - ไปที่ Domain > DNS > Records
   - Cloudflare จะสร้าง CNAME record อัตโนมัติ:
     ```
     Type: CNAME
     Name: @ (หรือ yourdomain.com)
     Target: cross-learning.pages.dev
     Proxy status: Proxied (ส้ม)
     TTL: Auto
     ```
   - ถ้าไม่มี ให้เพิ่มเอง:
     - Name: `@`
     - Target: `cross-learning.pages.dev`
     - Proxy: ✅ Proxied (ส้ม)

3. **สำหรับ www subdomain (ถ้าต้องการ)**
   ```
   Type: CNAME
   Name: www
   Target: cross-learning.pages.dev
   Proxy status: Proxied (ส้ม)
   TTL: Auto
   ```

4. **รอ DNS Propagation** (5-30 นาที)

5. **ตรวจสอบ**
   - เปิด `https://yourdomain.com` ควรเห็นเว็บไซต์
   - SSL certificate จะถูกออกอัตโนมัติ (รอ 5-10 นาที)

---

### Step 4: ตั้งค่า SSL/TLS

1. **ใน Cloudflare Dashboard**
   - ไปที่ Domain > SSL/TLS
   - เลือก "Full" หรือ "Full (strict)" mode
   - ✅ SSL จะทำงานอัตโนมัติ

2. **ตั้งค่า Always Use HTTPS**
   - ไปที่ SSL/TLS > Edge Certificates
   - เปิด "Always Use HTTPS"
   - ✅ HTTP จะ redirect ไป HTTPS อัตโนมัติ

---

### Step 5: ตั้งค่า Domain สำหรับ Email (Resend)

#### 5.1 Verify Domain ใน Resend

1. **ไปที่ Resend Dashboard**
   - https://resend.com/domains
   - คลิก "Add Domain"
   - ใส่ domain: `yourdomain.com`
   - Resend จะแสดง DNS records ที่ต้องตั้งค่า

2. **ตั้งค่า DNS Records ใน Cloudflare**
   - ไปที่ Domain > DNS > Records
   - เพิ่ม records ตามที่ Resend แนะนำ:

   **SPF Record:**
   ```
   Type: TXT
   Name: @
   Content: v=spf1 include:resend.com ~all
   TTL: Auto
   Proxy: DNS only (ไม่ใช่ Proxied)
   ```

   **DKIM Record:**
   ```
   Type: CNAME
   Name: resend._domainkey
   Target: [value จาก Resend]
   TTL: Auto
   Proxy: DNS only (ไม่ใช่ Proxied)
   ```

   **DMARC Record:**
   ```
   Type: TXT
   Name: _dmarc
   Content: v=DMARC1; p=none;
   TTL: Auto
   Proxy: DNS only (ไม่ใช่ Proxied)
   ```

3. **Verify Domain**
   - รอ DNS propagation (5-30 นาที)
   - กลับไปที่ Resend Dashboard
   - คลิก "Verify"
   - ✅ Domain verified!

#### 5.2 อัปเดต Email Sender ใน Code

อัปเดต `create-user` Edge Function:

```typescript
// ใน supabase/functions/create-user/index.ts
from: 'noreply@yourdomain.com', // แทนที่ onboarding@resend.dev
```

---

### Step 6: อัปเดต Environment Variables

#### ใน Cloudflare Pages:
```
VITE_SITE_URL = https://yourdomain.com
```

#### ใน Supabase Edge Functions Secrets:
- ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
- เพิ่ม:
  ```
  SITE_URL = https://yourdomain.com
  ```

---

## 🔧 Cloudflare Settings ที่แนะนำ

### 1. **Speed Optimization**
- ไปที่ Domain > Speed > Optimization
- เปิด "Auto Minify": JavaScript, CSS, HTML
- เปิด "Brotli" compression

### 2. **Caching**
- ไปที่ Domain > Caching > Configuration
- ตั้งค่า Browser Cache TTL: 4 hours
- ตั้งค่า Edge Cache TTL: 1 month (สำหรับ static assets)

### 3. **Security**
- ไปที่ Domain > Security > Settings
- เปิด "Automatic HTTPS Rewrites"
- เปิด "Always Use HTTPS"
- เปิด "TLS 1.3"

### 4. **Page Rules (ถ้าต้องการ)**
- ไปที่ Domain > Rules > Page Rules
- สร้าง rule สำหรับ `/api/*` หรือ routes พิเศษ

---

## 📊 Monitoring & Analytics

### Cloudflare Analytics
- ไปที่ Domain > Analytics
- ดู traffic, bandwidth, requests
- ฟรี tier มีข้อมูลพื้นฐาน

### Web Analytics (ถ้าต้องการ)
- ไปที่ Domain > Analytics > Web Analytics
- เปิดใช้งาน (ฟรี)
- ดู visitor stats, page views

---

## ✅ Checklist

- [ ] จด domain จาก Cloudflare Registrar
- [ ] Push code ไป GitHub
- [ ] Deploy app บน Cloudflare Pages
- [ ] ตั้งค่า Environment Variables ใน Cloudflare Pages
- [ ] เชื่อม domain กับ Cloudflare Pages
- [ ] ตั้งค่า DNS records (CNAME)
- [ ] ตรวจสอบ SSL certificate
- [ ] ตั้งค่า DNS records สำหรับ email (SPF, DKIM, DMARC)
- [ ] Verify domain ใน Resend
- [ ] อัปเดต `VITE_SITE_URL` ใน Cloudflare Pages
- [ ] อัปเดต `SITE_URL` ใน Supabase Secrets
- [ ] ทดสอบการส่งอีเมลด้วย domain ใหม่
- [ ] เปิด Speed Optimization
- [ ] เปิด Security Settings

---

## 💰 ราคา

### Cloudflare Registrar
- **Domain (.com)**: ~$8-10/ปี (ราคาต้นทุน)
- **WHOIS Privacy**: ฟรี
- **ไม่มี hidden fees**

### Cloudflare Pages
- **Free Tier**: 
  - 500 builds/เดือน
  - Unlimited requests
  - Unlimited bandwidth
  - 100,000 requests/day
- **Pro Plan**: $20/เดือน (ถ้าต้องการ features เพิ่ม)

### Cloudflare DNS
- **ฟรี**: Unlimited DNS records
- **ฟรี**: DDoS protection
- **ฟรี**: SSL certificate

---

## 🆘 Troubleshooting

### Domain ไม่ทำงาน?
- ตรวจสอบ DNS records ถูกต้องหรือไม่
- ตรวจสอบ Proxy status เป็น "Proxied" (ส้ม) หรือไม่
- รอ DNS propagation (อาจใช้เวลา 24-48 ชั่วโมง)
- ใช้ https://dnschecker.org ตรวจสอบ

### SSL Certificate ไม่ทำงาน?
- ตรวจสอบ SSL/TLS mode เป็น "Full" หรือ "Full (strict)"
- รอ 5-10 นาทีหลังจากตั้งค่า DNS
- ตรวจสอบว่า domain ถูกเชื่อมกับ Cloudflare Pages แล้ว

### Email ไม่ส่ง?
- ตรวจสอบ domain verified ใน Resend หรือไม่
- ตรวจสอบ SPF, DKIM records ถูกต้องหรือไม่
- **สำคัญ**: DNS records สำหรับ email ต้องเป็น "DNS only" (ไม่ใช่ Proxied)
- ใช้ https://mxtoolbox.com ตรวจสอบ DNS records

### Build ล้มเหลว?
- ตรวจสอบ Environment Variables ถูกต้องหรือไม่
- ตรวจสอบ Build command: `npm run build`
- ตรวจสอบ Build output directory: `dist`
- ดู logs ใน Cloudflare Pages Dashboard

---

## 📚 Resources

- **Cloudflare Registrar**: https://www.cloudflare.com/products/registrar/
- **Cloudflare Pages**: https://pages.cloudflare.com
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Resend Domains**: https://resend.com/domains
- **DNS Checker**: https://dnschecker.org
- **MX Toolbox**: https://mxtoolbox.com

---

## 🎉 เสร็จแล้ว!

หลังจากตั้งค่าเสร็จ คุณจะได้:
- ✅ Domain ของตัวเอง (เช่น `yourdomain.com`)
- ✅ Production website บน Cloudflare Pages
- ✅ SSL certificate ฟรี
- ✅ CDN เร็วมาก
- ✅ Email จาก domain ของตัวเอง (`noreply@yourdomain.com`)
- ✅ ระบบพร้อมใช้งานใน production!

