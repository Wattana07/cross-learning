# 📧 วิธีตั้งค่า Gmail SMTP สำหรับระบบจองห้องประชุม

## 🎯 เหมาะสำหรับ
- ระบบที่ส่งอีเมลไม่บ่อย (500 อีเมล/เดือน)
- ไม่ต้องการ verify domain
- ต้องการใช้ Gmail account ธรรมดา
- ต้องการความง่ายในการตั้งค่า

---

## ✅ วิธีที่ 1: ใช้ EmailJS + Gmail SMTP (แนะนำ - ง่ายที่สุด)

### 📋 ขั้นตอนการตั้งค่า:

#### 1. สร้าง Gmail App Password
1. ไปที่ https://myaccount.google.com/apppasswords
2. Login ด้วย Gmail account ที่ต้องการใช้ส่งอีเมล
3. คลิก **"Select app"** → เลือก **"Mail"**
4. คลิก **"Select device"** → เลือก **"Other (Custom name)"**
5. ใส่ชื่อ: `Supabase Email System`
6. คลิก **"Generate"**
7. **คัดลอก password** ที่ได้ (16 ตัวอักษร, แบบ `xxxx xxxx xxxx xxxx`)

#### 2. สมัคร EmailJS (ฟรี)
1. ไปที่ https://www.emailjs.com
2. คลิก **"Sign Up"** (ใช้ Google/GitHub ได้)
3. Verify email ของคุณ

#### 3. ตั้งค่า Email Service ใน EmailJS
1. ไปที่ https://dashboard.emailjs.com/admin
2. คลิก **"Add New Service"**
3. เลือก **"Gmail"**
4. ใส่ข้อมูล:
   - **Service Name:** `Gmail SMTP`
   - **Gmail Address:** `your-email@gmail.com` (Gmail ที่สร้าง App Password)
   - **Gmail Password:** App Password ที่ได้จากขั้นตอนที่ 1 (ลบช่องว่างออก: `xxxxxxxxxxxxxxxx`)
5. คลิก **"Create Service"**
6. **คัดลอก Service ID** ที่ได้ (เช่น `service_xxxxx`)

#### 4. สร้าง Email Template ใน EmailJS
1. ไปที่ **"Email Templates"** ใน EmailJS Dashboard
2. คลิก **"Create New Template"**
3. ตั้งชื่อ: `Booking System Email`
4. ตั้งค่า Template:
   ```
   To Email: {{to_email}}
   Subject: {{subject}}
   Content (HTML): {{message}}
   ```
5. คลิก **"Save"**
6. **คัดลอก Template ID** ที่ได้ (เช่น `template_xxxxx`)

#### 5. ตั้งค่า Public Key ใน EmailJS
1. ไปที่ **"Account"** → **"General"**
2. **คัดลอก Public Key** (เช่น `xxxxxxxxxxxxx`)

#### 6. ตั้งค่าใน Supabase Secrets
1. ไปที่ Supabase Dashboard: https://supabase.com/dashboard
2. เลือก Project ของคุณ
3. ไปที่ **Project Settings** > **Edge Functions** > **Secrets**
4. เพิ่ม Secrets:
   ```
   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: EMAILJS_SERVICE_ID
   Value: service_xxxxx (Service ID จาก EmailJS)
   
   Name: EMAILJS_TEMPLATE_ID
   Value: template_xxxxx (Template ID จาก EmailJS)
   
   Name: EMAILJS_PUBLIC_KEY
   Value: xxxxxxxxxxxxx (Public Key จาก EmailJS)
   ```

#### 7. Deploy Edge Function
```bash
cd cross-learning
npx supabase functions deploy send-email-gmail
```

#### 8. แก้ไข Functions อื่นๆ ให้ใช้ Gmail SMTP
แก้ไข `create-user`, `notify-booking-approval`, `send-booking-reminders` ให้เรียกใช้ `send-email-gmail` แทน `send-email`

---

## ✅ วิธีที่ 2: ใช้ Mailgun + Gmail SMTP (รองรับ SMTP และ HTTP API)

### 📋 ขั้นตอนการตั้งค่า:

#### 1. สร้าง Gmail App Password
- ทำตามขั้นตอนเดียวกับวิธีที่ 1

#### 2. สมัคร Mailgun (ฟรี 5,000 อีเมล/เดือน)
1. ไปที่ https://www.mailgun.com
2. คลิก **"Sign Up"**
3. Verify email และ phone number

#### 3. ตั้งค่า Domain ใน Mailgun
1. ไปที่ **"Sending"** → **"Domains"**
2. คลิก **"Add New Domain"**
3. เลือก **"Use Mailgun's subdomain"** (ฟรี, ไม่ต้อง verify domain)
4. Mailgun จะให้ subdomain เช่น `sandbox-xxxxx.mailgun.org`
5. **คัดลอก Domain** ที่ได้

#### 4. ตั้งค่า SMTP ใน Mailgun
1. ไปที่ **"Sending"** → **"SMTP"**
2. ตั้งค่า SMTP Credentials:
   - **SMTP Hostname:** `smtp.mailgun.org`
   - **Port:** `587` (TLS) หรือ `465` (SSL)
   - **Username:** `postmaster@sandbox-xxxxx.mailgun.org`
   - **Password:** SMTP Password จาก Mailgun
3. **หรือใช้ HTTP API แทน** (แนะนำ - ง่ายกว่า)

#### 5. ตั้งค่าใน Supabase Secrets
1. ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. เพิ่ม Secrets:
   ```
   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: MAILGUN_API_KEY
   Value: xxxxx (API Key จาก Mailgun)
   
   Name: MAILGUN_DOMAIN
   Value: sandbox-xxxxx.mailgun.org (Domain จาก Mailgun)
   ```

#### 6. Deploy Edge Function
```bash
cd cross-learning
npx supabase functions deploy send-email-gmail
```

---

## ✅ วิธีที่ 3: ใช้ SendGrid + Gmail SMTP (ฟรี 100 อีเมล/วัน)

### 📋 ขั้นตอนการตั้งค่า:

#### 1. สร้าง Gmail App Password
- ทำตามขั้นตอนเดียวกับวิธีที่ 1

#### 2. สมัคร SendGrid (ฟรี 100 อีเมล/วัน)
1. ไปที่ https://sendgrid.com
2. คลิก **"Start for free"**
3. Verify email และ phone number

#### 3. สร้าง API Key ใน SendGrid
1. ไปที่ **"Settings"** → **"API Keys"**
2. คลิก **"Create API Key"**
3. เลือก **"Full Access"** หรือ **"Restricted Access"** (แนะนำ Restricted)
4. **คัดลอก API Key** ที่ได้

#### 4. ตั้งค่าใน Supabase Secrets
1. ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. เพิ่ม Secrets:
   ```
   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: SENDGRID_API_KEY
   Value: SG.xxxxx (API Key จาก SendGrid)
   ```

#### 5. Deploy Edge Function
```bash
cd cross-learning
npx supabase functions deploy send-email-gmail
```

---

## ✅ วิธีที่ 4: ใช้ Brevo (เดิมชื่อ Sendinblue) - ฟรี 300 อีเมล/วัน

### 📋 ขั้นตอนการตั้งค่า:

#### 1. สมัคร Brevo (ฟรี 300 อีเมล/วัน)
1. ไปที่ https://www.brevo.com
2. คลิก **"Sign Up Free"**
3. Verify email ของคุณ

#### 2. สร้าง API Key ใน Brevo
1. ไปที่ **"Settings"** → **"API Keys"**
2. คลิก **"Generate a new API key"**
3. ใส่ชื่อ: `Supabase Email System`
4. **คัดลอก API Key** ที่ได้

#### 3. ตั้งค่าใน Supabase Secrets
1. ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. เพิ่ม Secrets:
   ```
   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: BREVO_API_KEY
   Value: xxxxx (API Key จาก Brevo)
   ```

#### 4. Deploy Edge Function
```bash
cd cross-learning
npx supabase functions deploy send-email
```

---

## ✅ วิธีที่ 5: ใช้ AWS SES (ราคาถูกมาก - $0.10 ต่อ 1,000 อีเมล)

### 📋 ขั้นตอนการตั้งค่า:

#### 1. สร้าง AWS Account
1. ไปที่ https://aws.amazon.com
2. สร้างบัญชี AWS (ฟรี tier: 3,000 อีเมล/เดือน ฟรี 12 เดือนแรก)

#### 2. ตั้งค่า AWS SES
1. ไปที่ AWS Console → SES
2. Verify email address (สำหรับทดสอบ)
3. หรือ verify domain (สำหรับ production)

#### 3. สร้าง IAM User และ Access Key
1. ไปที่ IAM → Users → Create User
2. Attach policy: `AmazonSESFullAccess`
3. สร้าง Access Key
4. **คัดลอก Access Key ID และ Secret Access Key**

#### 4. ตั้งค่าใน Supabase Secrets
1. ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. เพิ่ม Secrets:
   ```
   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: AWS_ACCESS_KEY_ID
   Value: xxxxx (Access Key ID จาก AWS)
   
   Name: AWS_SECRET_ACCESS_KEY
   Value: xxxxx (Secret Access Key จาก AWS)
   
   Name: AWS_SES_REGION
   Value: us-east-1 (หรือ region ที่คุณใช้)
   ```

#### 5. Deploy Edge Function
```bash
cd cross-learning
npx supabase functions deploy send-email
```

---

## ✅ วิธีที่ 6: ใช้ Postmark (ฟรี 100 อีเมล/เดือน)

### 📋 ขั้นตอนการตั้งค่า:

#### 1. สมัคร Postmark (ฟรี 100 อีเมล/เดือน)
1. ไปที่ https://postmarkapp.com
2. คลิก **"Sign Up"**
3. Verify email ของคุณ

#### 2. สร้าง Server และ API Token
1. ไปที่ **"Servers"** → **"Add Server"**
2. ตั้งชื่อ: `Booking System`
3. **คัดลอก Server API Token**

#### 3. ตั้งค่าใน Supabase Secrets
1. ไปที่ Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. เพิ่ม Secrets:
   ```
   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: POSTMARK_API_TOKEN
   Value: xxxxx (Server API Token จาก Postmark)
   ```

#### 4. Deploy Edge Function
```bash
cd cross-learning
npx supabase functions deploy send-email
```

---

## 🎯 เปรียบเทียบตัวเลือกทั้งหมด

| ตัวเลือก | ฟรี | ง่าย | รองรับ Gmail SMTP | HTTP API | ข้อดี |
|---------|-----|------|-------------------|----------|-------|
| **EmailJS** | ✅ 200/เดือน | ⭐⭐⭐⭐⭐ | ✅ | ✅ | ง่ายที่สุด |
| **Mailgun** | ✅ 5,000/เดือน | ⭐⭐⭐⭐ | ✅ | ✅ | ฟรีเยอะที่สุด |
| **SendGrid** | ✅ 100/วัน | ⭐⭐⭐⭐ | ✅ | ✅ | น่าเชื่อถือ |
| **Brevo** | ✅ 300/วัน | ⭐⭐⭐⭐ | ✅ | ✅ | ฟรีเยอะ |
| **AWS SES** | ✅ 3,000/เดือน (12 เดือนแรก) | ⭐⭐⭐ | ❌ | ✅ | ราคาถูกมาก |
| **Postmark** | ✅ 100/เดือน | ⭐⭐⭐⭐ | ✅ | ✅ | Delivery rate สูง |

---

## 💡 คำแนะนำ

### สำหรับระบบจองห้องประชุม (500 อีเมล/เดือน):
- **แนะนำ: EmailJS** - ง่ายที่สุด ฟรี 200 อีเมล/เดือน (พอใช้)
- **หรือ Mailgun** - ฟรี 5,000 อีเมล/เดือน (เหลือเฟือ)

### ข้อดีของ Gmail SMTP:
- ✅ ไม่ต้อง verify domain
- ✅ ส่งได้ทุก email
- ✅ ใช้ Gmail account ธรรมดา
- ✅ ฟรี (ถ้าใช้ EmailJS/Mailgun)

### ข้อจำกัด:
- ⚠️ Gmail จำกัด 500 อีเมล/วัน (ถ้าใช้ Gmail SMTP โดยตรง)
- ⚠️ ถ้าใช้ EmailJS จำกัด 200 อีเมล/เดือน (ฟรี tier)
- ⚠️ ถ้าใช้ Mailgun/SendGrid ต้อง verify domain สำหรับ production (แต่ฟรี tier ไม่ต้อง)

---

## 📝 Checklist

### EmailJS:
- [ ] สร้าง Gmail App Password
- [ ] สมัคร EmailJS
- [ ] ตั้งค่า Email Service ใน EmailJS
- [ ] สร้าง Email Template
- [ ] ตั้งค่า Secrets ใน Supabase (GMAIL_USER, EMAILJS_*)
- [ ] Deploy Edge Function
- [ ] ทดสอบส่งอีเมล

### Mailgun:
- [ ] สร้าง Gmail App Password
- [ ] สมัคร Mailgun
- [ ] ตั้งค่า Domain ใน Mailgun
- [ ] ตั้งค่า Secrets ใน Supabase (GMAIL_USER, MAILGUN_*)
- [ ] Deploy Edge Function
- [ ] ทดสอบส่งอีเมล

### SendGrid:
- [ ] สร้าง Gmail App Password
- [ ] สมัคร SendGrid
- [ ] สร้าง API Key
- [ ] ตั้งค่า Secrets ใน Supabase (GMAIL_USER, SENDGRID_API_KEY)
- [ ] Deploy Edge Function
- [ ] ทดสอบส่งอีเมล

---

## 🆘 ถ้ายังไม่ทำงาน

### 1. ตรวจสอบ Logs
- Supabase Dashboard > Edge Functions > Logs
- ดู error messages

### 2. ตรวจสอบ Secrets
- ตรวจสอบว่า Secrets ถูกตั้งค่าถูกต้อง
- ตรวจสอบว่า Gmail App Password ถูกต้อง

### 3. ทดสอบ EmailJS/Mailgun/SendGrid โดยตรง
- ทดสอบส่งอีเมลผ่าน Dashboard ของ service
- ตรวจสอบว่า service ทำงานได้

---

## 📞 สรุป

**สำหรับระบบจองห้องประชุม (500 อีเมล/เดือน):**
- ✅ **EmailJS + Gmail SMTP** - ง่ายที่สุด ฟรี 200 อีเมล/เดือน
- ✅ **Mailgun + Gmail SMTP** - ฟรี 5,000 อีเมล/เดือน (เหลือเฟือ)

**ข้อดี:**
- ไม่ต้อง verify domain
- ส่งได้ทุก email
- ใช้ Gmail account ธรรมดา
- ตั้งง่าย ใช้งานได้ทันที

