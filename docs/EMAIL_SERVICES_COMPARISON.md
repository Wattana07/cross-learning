# 📧 เปรียบเทียบ Email Services ทั้งหมด

## 🎯 สำหรับระบบจองห้องประชุม (500 อีเมล/เดือน)

---

## 📊 ตารางเปรียบเทียบ

| Service | ฟรี | ง่าย | ไม่ต้อง Domain | HTTP API | ข้อดี | ข้อเสีย |
|---------|-----|------|---------------|----------|-------|--------|
| **EmailJS** | ✅ 200/เดือน | ⭐⭐⭐⭐⭐ | ✅ | ✅ | ง่ายที่สุด | จำกัด 200/เดือน |
| **Mailgun** | ✅ 5,000/เดือน | ⭐⭐⭐⭐ | ✅ | ✅ | ฟรีเยอะที่สุด | ต้อง verify phone |
| **Brevo** | ✅ 300/วัน | ⭐⭐⭐⭐ | ✅ | ✅ | ฟรีเยอะ | ต้อง verify phone |
| **SendGrid** | ✅ 100/วัน | ⭐⭐⭐⭐ | ✅ | ✅ | น่าเชื่อถือ | ต้อง verify phone |
| **Postmark** | ✅ 100/เดือน | ⭐⭐⭐⭐ | ✅ | ✅ | Delivery rate สูง | ฟรีน้อย |
| **AWS SES** | ✅ 3,000/เดือน (12 เดือนแรก) | ⭐⭐⭐ | ⚠️ ต้อง verify email | ✅ | ราคาถูกมาก | ซับซ้อน |
| **Resend** | ✅ 3,000/เดือน | ⭐⭐⭐⭐⭐ | ⚠️ ต้อง verify email/domain | ✅ | ง่ายมาก | ต้อง verify |

---

## 🥇 ตัวเลือกที่แนะนำ

### สำหรับระบบจองห้องประชุม (500 อีเมล/เดือน):

#### 1. **Mailgun** (แนะนำที่สุด)
- ✅ **ฟรี 5,000 อีเมล/เดือน** - เหลือเฟือ
- ✅ ไม่ต้อง verify domain (ใช้ sandbox domain)
- ✅ HTTP API ง่าย
- ✅ รองรับ SMTP และ HTTP API
- ⚠️ ต้อง verify phone number

#### 2. **Brevo** (เดิมชื่อ Sendinblue)
- ✅ **ฟรี 300 อีเมล/วัน** (9,000/เดือน) - เหลือเฟือมาก
- ✅ ไม่ต้อง verify domain
- ✅ HTTP API ง่าย
- ⚠️ ต้อง verify phone number

#### 3. **EmailJS**
- ✅ **ง่ายที่สุด** - ตั้งค่า 5 นาที
- ✅ ไม่ต้อง verify domain
- ✅ ไม่ต้อง verify phone
- ⚠️ จำกัด 200 อีเมล/เดือน (พอใช้สำหรับ 500/เดือน ถ้าใช้ 2-3 เดือน)

#### 4. **SendGrid**
- ✅ **ฟรี 100 อีเมล/วัน** (3,000/เดือน) - พอใช้
- ✅ น่าเชื่อถือ
- ✅ HTTP API ง่าย
- ⚠️ ต้อง verify phone number

---

## 📋 วิธีตั้งค่าแต่ละ Service

### 1. Mailgun (แนะนำ)

**ขั้นตอน:**
1. สมัคร: https://www.mailgun.com
2. Verify email และ phone
3. ไปที่ **"Sending"** → **"Domains"** → ใช้ **"Sandbox Domain"** (ฟรี)
4. **คัดลอก Domain** (เช่น `sandbox-xxxxx.mailgun.org`)
5. ไปที่ **"Settings"** → **"API Keys"** → **คัดลอก API Key**

**ตั้งค่า Supabase Secrets:**
```
MAILGUN_API_KEY = xxxxx
MAILGUN_DOMAIN = sandbox-xxxxx.mailgun.org
GMAIL_USER = your-email@gmail.com (optional, สำหรับ from address)
```

---

### 2. Brevo (เดิมชื่อ Sendinblue)

**ขั้นตอน:**
1. สมัคร: https://www.brevo.com
2. Verify email และ phone
3. ไปที่ **"Settings"** → **"API Keys"**
4. คลิก **"Generate a new API key"**
5. **คัดลอก API Key**

**ตั้งค่า Supabase Secrets:**
```
BREVO_API_KEY = xxxxx
GMAIL_USER = your-email@gmail.com (optional, สำหรับ from address)
```

---

### 3. EmailJS

**ขั้นตอน:**
1. สมัคร: https://www.emailjs.com
2. ไปที่ **"Email Services"** → **"Add New Service"** → เลือก **"Gmail"**
3. ใส่ Gmail และ App Password
4. **คัดลอก Service ID**
5. ไปที่ **"Email Templates"** → สร้าง Template → **คัดลอก Template ID**
6. ไปที่ **"Account"** → **"General"** → **คัดลอก Public Key**

**ตั้งค่า Supabase Secrets:**
```
EMAILJS_SERVICE_ID = service_xxxxx
EMAILJS_TEMPLATE_ID = template_xxxxx
EMAILJS_PUBLIC_KEY = xxxxxxxxxxxxx
GMAIL_USER = your-email@gmail.com
```

---

### 4. SendGrid

**ขั้นตอน:**
1. สมัคร: https://sendgrid.com
2. Verify email และ phone
3. ไปที่ **"Settings"** → **"API Keys"**
4. คลิก **"Create API Key"**
5. **คัดลอก API Key**

**ตั้งค่า Supabase Secrets:**
```
SENDGRID_API_KEY = SG.xxxxx
GMAIL_USER = your-email@gmail.com (optional, สำหรับ from address)
```

---

### 5. Postmark

**ขั้นตอน:**
1. สมัคร: https://postmarkapp.com
2. Verify email
3. ไปที่ **"Servers"** → **"Add Server"**
4. **คัดลอก Server API Token**

**ตั้งค่า Supabase Secrets:**
```
POSTMARK_API_TOKEN = xxxxx
GMAIL_USER = your-email@gmail.com (optional, สำหรับ from address)
```

---

## 🎯 คำแนะนำสำหรับระบบจองห้องประชุม

### ถ้าต้องการง่ายที่สุด:
- ✅ **EmailJS** - ตั้งค่า 5 นาที ไม่ต้อง verify phone

### ถ้าต้องการฟรีเยอะ:
- ✅ **Mailgun** - ฟรี 5,000/เดือน (เหลือเฟือ)
- ✅ **Brevo** - ฟรี 300/วัน (9,000/เดือน)

### ถ้าต้องการน่าเชื่อถือ:
- ✅ **SendGrid** - น่าเชื่อถือ มีชื่อเสียง
- ✅ **Postmark** - Delivery rate สูง

---

## 📝 Checklist

### Mailgun:
- [ ] สมัคร Mailgun
- [ ] Verify email และ phone
- [ ] ใช้ Sandbox Domain
- [ ] คัดลอก API Key และ Domain
- [ ] ตั้งค่า Secrets ใน Supabase
- [ ] Deploy function
- [ ] ทดสอบส่งอีเมล

### Brevo:
- [ ] สมัคร Brevo
- [ ] Verify email และ phone
- [ ] สร้าง API Key
- [ ] ตั้งค่า Secrets ใน Supabase
- [ ] Deploy function
- [ ] ทดสอบส่งอีเมล

### EmailJS:
- [ ] สร้าง Gmail App Password
- [ ] สมัคร EmailJS
- [ ] ตั้งค่า Gmail Service
- [ ] สร้าง Email Template
- [ ] ตั้งค่า Secrets ใน Supabase
- [ ] Deploy function
- [ ] ทดสอบส่งอีเมล

---

## 🆘 ถ้ายังไม่ทำงาน

1. **ตรวจสอบ Logs:**
   - Supabase Dashboard > Edge Functions > Logs
   - ดู error messages

2. **ตรวจสอบ Secrets:**
   - ตรวจสอบว่า Secrets ถูกตั้งค่าถูกต้อง
   - ตรวจสอบว่า API Key ถูกต้อง

3. **ทดสอบ API โดยตรง:**
   - ใช้ curl หรือ Postman
   - ทดสอบส่งอีเมลผ่าน API โดยตรง

---

## 📞 สรุป

**สำหรับระบบจองห้องประชุม (500 อีเมล/เดือน):**

**แนะนำ:**
1. **Mailgun** - ฟรี 5,000/เดือน เหลือเฟือ
2. **Brevo** - ฟรี 300/วัน (9,000/เดือน) เหลือเฟือมาก
3. **EmailJS** - ง่ายที่สุด แต่จำกัด 200/เดือน

**ข้อดี:**
- ไม่ต้อง verify domain
- ส่งได้ทุก email
- ตั้งง่าย ใช้งานได้ทันที
- ฟรีเพียงพอสำหรับระบบจองห้องประชุม

