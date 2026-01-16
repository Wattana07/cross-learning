# คู่มือการตั้งค่า Domain สำหรับ Production

> **💡 สำหรับ Cloudflare**: ดูคู่มือเฉพาะสำหรับ Cloudflare ใน [`CLOUDFLARE_SETUP.md`](./CLOUDFLARE_SETUP.md)

## 🎯 ทำไมต้องมี Domain ของตัวเอง?

- **ความน่าเชื่อถือ**: อีเมลจาก `noreply@yourdomain.com` ดูเป็นมืออาชีพกว่า `onboarding@resend.dev`
- **Email Deliverability**: อีเมลจาก domain ของตัวเองมีโอกาสเข้าถึง inbox มากกว่า
- **Branding**: สร้างแบรนด์และความน่าเชื่อถือให้กับระบบ
- **Professional**: ลูกค้า/ผู้ใช้จะไว้วางใจมากขึ้น

---

## 🌐 แนะนำ Domain Registrar (ผู้ให้บริการจดโดเมน)

### 1. **Namecheap** (แนะนำ - ราคาถูก, ใช้งานง่าย)
- **ราคา**: ~$8-12/ปี (.com)
- **เว็บไซต์**: https://www.namecheap.com
- **ข้อดี**: 
  - ราคาถูก
  - ฟรี WHOIS Privacy
  - ใช้งานง่าย
  - Support ดี

### 2. **Cloudflare Registrar** (แนะนำ - ราคาถูกที่สุด)
- **ราคา**: ราคาต้นทุน (ไม่มี markup)
- **เว็บไซต์**: https://www.cloudflare.com/products/registrar/
- **ข้อดี**:
  - ราคาถูกที่สุด
  - ฟรี WHOIS Privacy
  - ใช้ DNS ของ Cloudflare ได้เลย

### 3. **Google Domains** (ตอนนี้เป็น Squarespace)
- **ราคา**: ~$12/ปี (.com)
- **เว็บไซต์**: https://domains.google
- **ข้อดี**: เชื่อถือได้, ใช้งานง่าย

### 4. **GoDaddy** (ไม่แนะนำ - ราคาแพง)
- **ราคา**: ~$12-15/ปี (.com)
- **ข้อเสีย**: ราคาแพง, มี hidden fees

---

## 🚀 แนะนำ Hosting Platform สำหรับ Vite App

### 1. **Vercel** (แนะนำที่สุด - ฟรี, เร็วมาก)
- **เว็บไซต์**: https://vercel.com
- **ราคา**: ฟรี (Hobby plan)
- **ข้อดี**:
  - Deploy ง่ายมาก (เชื่อม GitHub)
  - ฟรี SSL
  - CDN อัตโนมัติ
  - เร็วมาก
  - ฟรี custom domain

### 2. **Netlify** (แนะนำ - ฟรี, ใช้งานง่าย)
- **เว็บไซต์**: https://www.netlify.com
- **ราคา**: ฟรี (Starter plan)
- **ข้อดี**:
  - Deploy ง่าย
  - ฟรี SSL
  - ฟรี custom domain

### 3. **Cloudflare Pages** (แนะนำ - ฟรี, เร็วมาก)
- **เว็บไซต์**: https://pages.cloudflare.com
- **ราคา**: ฟรี
- **ข้อดี**:
  - ฟรี SSL
  - CDN เร็วมาก
  - ฟรี custom domain

---

## 📝 ขั้นตอนการตั้งค่า Domain + Hosting

### Step 1: จด Domain

1. ไปที่ Namecheap หรือ Cloudflare Registrar
2. ค้นหาชื่อ domain ที่ต้องการ (เช่น `crosslearning.com`, `yourcompany.com`)
3. จ่ายเงินและจดทะเบียน
4. **บันทึก**: Domain registrar จะให้ DNS nameservers มา (เช่น `dns1.namecheap.com`)

### Step 2: Deploy App บน Vercel/Netlify

#### วิธี Deploy บน Vercel:

1. **Push code ไป GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/cross-learning.git
   git push -u origin main
   ```

2. **เชื่อม Vercel กับ GitHub**
   - ไปที่ https://vercel.com
   - Sign up ด้วย GitHub
   - คลิก "New Project"
   - เลือก repository `cross-learning`
   - Vercel จะ auto-detect Vite settings
   - คลิก "Deploy"

3. **ตั้งค่า Environment Variables ใน Vercel**
   - ไปที่ Project Settings > Environment Variables
   - เพิ่ม:
     ```
     VITE_SUPABASE_URL=https://wmfuzaahfdknfjvqwwsi.supabase.co
     VITE_SUPABASE_ANON_KEY=sb_publishable_vp4vBczL_eTBDNU12pD7Iw_5aFX_ylZ
     VITE_RESEND_API_KEY=re_DyUTxyKC_8xhyAqT9iamjtqAqbc2k5W5K
     VITE_SITE_URL=https://yourdomain.com
     ```

4. **ได้ Production URL**: `https://cross-learning.vercel.app`

### Step 3: เชื่อม Domain กับ Vercel

1. **ใน Vercel Dashboard**:
   - ไปที่ Project Settings > Domains
   - เพิ่ม domain: `yourdomain.com`
   - Vercel จะแสดง DNS records ที่ต้องตั้งค่า

2. **ใน Domain Registrar (Namecheap)**:
   - ไปที่ Domain List > Manage
   - ไปที่ Advanced DNS
   - เพิ่ม DNS records ตามที่ Vercel แนะนำ:
     ```
     Type: A
     Host: @
     Value: 76.76.21.21
     TTL: Automatic
     
     Type: CNAME
     Host: www
     Value: cname.vercel-dns.com
     TTL: Automatic
     ```

3. **รอ DNS Propagation** (5-30 นาที)

4. **ตรวจสอบ**: เปิด `https://yourdomain.com` ควรเห็นเว็บไซต์

---

## 📧 ตั้งค่า Domain สำหรับ Email (Resend)

### Step 1: Verify Domain ใน Resend

1. ไปที่ https://resend.com/domains
2. คลิก "Add Domain"
3. ใส่ domain: `yourdomain.com`
4. Resend จะแสดง DNS records ที่ต้องตั้งค่า

### Step 2: ตั้งค่า DNS Records

ใน Domain Registrar (Namecheap) เพิ่ม DNS records:

```
Type: TXT
Host: @
Value: v=spf1 include:resend.com ~all
TTL: Automatic

Type: CNAME
Host: resend._domainkey
Value: [value จาก Resend]
TTL: Automatic

Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none;
TTL: Automatic
```

### Step 3: Verify Domain

1. รอ DNS propagation (5-30 นาที)
2. กลับไปที่ Resend Dashboard
3. คลิก "Verify"
4. ✅ Domain verified!

### Step 4: ใช้ Domain ใน Email

อัปเดต `create-user` Edge Function:

```typescript
from: 'noreply@yourdomain.com', // แทนที่ onboarding@resend.dev
```

---

## 🔧 อัปเดต Environment Variables

### ใน Vercel Dashboard:

```
VITE_SITE_URL=https://yourdomain.com
```

### ใน Supabase Edge Functions Secrets:

```
SITE_URL=https://yourdomain.com
```

---

## ✅ Checklist

- [ ] จด domain จาก Namecheap/Cloudflare
- [ ] Deploy app บน Vercel/Netlify
- [ ] ตั้งค่า DNS records ใน domain registrar
- [ ] ตั้งค่า Environment Variables ใน Vercel
- [ ] Verify domain ใน Resend
- [ ] ตั้งค่า DNS records สำหรับ email (SPF, DKIM, DMARC)
- [ ] อัปเดต `VITE_SITE_URL` ใน `.env` และ Vercel
- [ ] ทดสอบการส่งอีเมลด้วย domain ใหม่

---

## 💡 Tips

1. **เลือกชื่อ domain ที่สั้น จำง่าย**: เช่น `crosslearn.com`, `yourcompany.com`
2. **ใช้ .com ถ้าเป็นไปได้**: น่าเชื่อถือกว่า .xyz, .online
3. **ซื้อหลายปี**: ราคาถูกกว่า (เช่น 2-3 ปี)
4. **เปิด Auto-renew**: ป้องกัน domain หมดอายุ
5. **ใช้ Cloudflare DNS**: ฟรี, เร็ว, มี DDoS protection

---

## 🆘 Troubleshooting

### Domain ไม่ทำงาน?
- ตรวจสอบ DNS records ถูกต้องหรือไม่
- รอ DNS propagation (อาจใช้เวลา 24-48 ชั่วโมง)
- ใช้ https://dnschecker.org ตรวจสอบ

### Email ไม่ส่ง?
- ตรวจสอบ domain verified ใน Resend หรือไม่
- ตรวจสอบ SPF, DKIM records ถูกต้องหรือไม่
- ใช้ https://mxtoolbox.com ตรวจสอบ DNS records

### SSL Certificate ไม่ทำงาน?
- Vercel/Netlify จะออก SSL อัตโนมัติ
- รอ 5-10 นาทีหลังจากตั้งค่า DNS

---

## 📚 Resources

- **Namecheap**: https://www.namecheap.com
- **Cloudflare Registrar**: https://www.cloudflare.com/products/registrar/
- **Vercel**: https://vercel.com
- **Netlify**: https://www.netlify.com
- **Resend Domains**: https://resend.com/domains
- **DNS Checker**: https://dnschecker.org

