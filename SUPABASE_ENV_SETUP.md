# ตั้งค่า Environment Variables ใน Supabase Edge Functions

## 🔧 ขั้นตอนการตั้งค่า

### Step 1: ไปที่ Supabase Dashboard

1. เปิด https://supabase.com/dashboard
2. เลือก project: `wmfuzaahfdknfjvqwwsi`
3. ไปที่ **Project Settings** > **Edge Functions** > **Secrets**

---

### Step 2: เพิ่ม Secret

คลิก "Add new secret" และเพิ่ม:

**Secret 1:**
- Name: `SITE_URL`
- Value: `https://crosslearning.com` (หรือ URL ของ Vercel deployment)
- Description: Production site URL for email links

---

### Step 3: Deploy Edge Function อีกครั้ง

```bash
cd cross-learning
npx supabase functions deploy create-user
```

---

## ✅ Checklist

- [ ] ไปที่ Supabase Dashboard > Edge Functions > Secrets
- [ ] เพิ่ม Secret: `SITE_URL = https://crosslearning.com`
- [ ] Deploy Edge Function: `npx supabase functions deploy create-user`
- [ ] ทดสอบเพิ่ม User ใหม่
- [ ] ตรวจสอบลิงก์ในอีเมลว่าเป็น HTTPS

---

## 📝 หมายเหตุ

- `SITE_URL` จะถูกใช้เป็น `redirectTo` ใน recovery link
- ต้องเป็น HTTPS เสมอ (เพื่อความปลอดภัย)
- ถ้าไม่ตั้งค่า จะใช้ค่า default จาก request body หรือ fallback

---

## 🔍 ตรวจสอบ

หลังจากตั้งค่าแล้ว:
1. ลองเพิ่ม User ใหม่
2. ตรวจสอบอีเมลที่ได้รับ
3. ลิงก์ควรเป็น HTTPS และชี้ไปที่ production URL

