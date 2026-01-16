# 🔧 แก้ไขปัญหา "Failed to send a request to the Edge Function"

## ⚠️ สาเหตุของปัญหา:

ข้อผิดพลาดนี้มักเกิดจาก:
1. Edge Function `create-user` ยังไม่ได้ถูก deploy
2. Supabase Project ยังไม่ได้ link
3. Network/Connection issue

---

## ✅ วิธีแก้ไข:

### ขั้นตอนที่ 1: ตรวจสอบว่า Edge Function ถูก deploy แล้วหรือยัง

เปิด Terminal/PowerShell แล้วรัน:

```bash
# ไปที่โฟลเดอร์โปรเจกต์
cd "C:\Users\USER\Downloads\cross-learning-main (1)\cross-learning-main"

# ตรวจสอบ Edge Functions ที่ deploy แล้ว
npx supabase functions list
```

**ถ้ายังไม่เห็น `create-user`** → ไปขั้นตอนที่ 2

**ถ้าเห็นแล้ว** → ไปขั้นตอนที่ 4

---

### ขั้นตอนที่ 2: Login Supabase (ถ้ายังไม่ได้ login)

```bash
npx supabase login
```

- จะเปิด Browser ให้ login
- Login ด้วย GitHub account

---

### ขั้นตอนที่ 3: Link Supabase Project

```bash
npx supabase link --project-ref wmfuzaahfdknfjvqwwsi
```

หรือถ้าไม่รู้ project-ref:

```bash
npx supabase link
```

- เลือก project ที่ต้องการ

---

### ขั้นตอนที่ 4: Deploy Edge Function

```bash
npx supabase functions deploy create-user
```

**ควรเห็น:**
```
Deployed Function create-user
```

---

### ขั้นตอนที่ 5: ตรวจสอบว่า Deploy สำเร็จ

1. **ตรวจสอบใน Terminal:**
   ```bash
   npx supabase functions list
   ```
   - ควรเห็น `create-user` ในรายการ

2. **ตรวจสอบใน Supabase Dashboard:**
   - ไปที่: https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi/functions
   - ตรวจสอบว่า `create-user` เป็น **ACTIVE**

---

## 🔍 ตรวจสอบ Logs (ถ้ายังมีปัญหา)

```bash
npx supabase functions logs create-user
```

หรือไปที่ Supabase Dashboard > Edge Functions > create-user > Logs

---

## ⚡ Quick Fix (ถ้าต้องการแก้ไขเร็ว):

```bash
# 1. Login
npx supabase login

# 2. Link Project
npx supabase link --project-ref wmfuzaahfdknfjvqwwsi

# 3. Deploy Function
npx supabase functions deploy create-user
```

---

## 📝 หมายเหตุ:

- **ทุกครั้งที่แก้ไขโค้ด Edge Function** ต้อง deploy ใหม่
- หลังจาก deploy แล้ว อาจต้องรอ 1-2 นาทีให้ระบบอัปเดต
- ถ้าใช้ localhost ตรวจสอบว่า `VITE_SUPABASE_URL` ถูกต้อง

---

## ✅ หลังจาก Deploy สำเร็จ:

ลองเพิ่มผู้ใช้ใหม่ที่:
- Admin > Users > เพิ่มผู้ใช้ใหม่

ควรทำงานได้ปกติแล้ว! 🎉

