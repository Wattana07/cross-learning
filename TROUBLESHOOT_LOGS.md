# 🔧 แก้ไขปัญหา: หน้า /admin/logs ไม่ทำงาน

## ❌ ปัญหาที่พบบ่อย

### 1. Error: "relation system_logs does not exist" หรือ "table system_logs does not exist"

**สาเหตุ:** ยังไม่ได้รัน SQL migration เพื่อสร้างตาราง `system_logs`

**วิธีแก้ไข:**

1. **เปิด Supabase Dashboard**
   - ไปที่: https://supabase.com/dashboard/project/wmfuzaahfdknfjvqwwsi/editor
   - หรือ: https://supabase.com/dashboard → เลือก Project → SQL Editor

2. **รัน SQL Migration**
   - เปิดไฟล์: `supabase/migrations/add-logs-table.sql`
   - คัดลอก SQL ทั้งหมด
   - วางใน SQL Editor ของ Supabase
   - คลิก **Run** หรือกด `Ctrl/Cmd + Enter`

3. **ตรวจสอบว่า Table ถูกสร้างแล้ว**
   - ไปที่ **Table Editor** ใน Supabase Dashboard
   - ควรเห็นตาราง `system_logs` ในรายการ

4. **รีเฟรชหน้า Logs**
   - กลับไปที่ `http://localhost:5173/admin/logs`
   - กด **F5** หรือคลิกปุ่ม **รีเฟรช**

---

### 2. Error: "permission denied for table system_logs"

**สาเหตุ:** RLS Policy ยังไม่ถูกตั้งค่าหรือผู้ใช้ไม่มีสิทธิ์ Admin

**วิธีแก้ไข:**

1. **ตรวจสอบว่าเป็น Admin**
   - ตรวจสอบว่า User ของคุณมี role เป็น `admin` ในตาราง `profiles`

2. **ตรวจสอบ RLS Policies**
   - ไปที่ Supabase Dashboard → Table Editor → `system_logs`
   - ตรวจสอบว่า Policies ถูกสร้างแล้ว:
     - "Admins can view all logs" (SELECT)
     - "Users can insert logs" (INSERT)

3. **รัน SQL อีกครั้ง** (ถ้ายังไม่มี Policies)
   - ใช้ SQL จาก `supabase/migrations/add-logs-table.sql`
   - ส่วนที่สร้าง Policies จะรันได้แม้ว่าจะมี Policies อยู่แล้ว (เพราะใช้ `DROP POLICY IF EXISTS`)

---

### 3. หน้า Logs แสดงว่างเปล่า (ไม่มี Error)

**สาเหตุ:** ยังไม่มี logs ในระบบ

**วิธีแก้ไข:**

1. **สร้าง Log ทดสอบ**
   - ลองล็อกอินใหม่
   - หรือลองสร้างผู้ใช้ใหม่ (ถ้าเป็น Admin)
   - หรือลองดูบทเรียน หรือจองห้อง

2. **ตรวจสอบว่า Logs ถูกบันทึก**
   - ไปที่ Supabase Dashboard → Table Editor → `system_logs`
   - ดูว่ามีข้อมูลหรือไม่

---

### 4. Error: "Failed to fetch" หรือ Network Error

**สาเหตุ:** 
- Network connection
- Supabase credentials ไม่ถูกต้อง

**วิธีแก้ไข:**

1. **ตรวจสอบ `.env` file**
   - ตรวจสอบว่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ถูกต้อง
   - รีสตาร์ท Dev Server (`npm run dev`)

2. **ตรวจสอบ Browser Console**
   - กด F12 → Console tab
   - ดูว่ามี error อะไร

---

## ✅ Checklist การแก้ไข

- [ ] รัน SQL migration ใน Supabase Dashboard
- [ ] ตรวจสอบว่า table `system_logs` ถูกสร้างแล้ว
- [ ] ตรวจสอบว่า RLS policies ถูกสร้างแล้ว
- [ ] ตรวจสอบว่าเป็น Admin role
- [ ] ตรวจสอบ `.env` file มี credentials ถูกต้อง
- [ ] รีสตาร์ท Dev Server
- [ ] ตรวจสอบ Browser Console สำหรับ errors
- [ ] ลองสร้าง log ทดสอบ (ล็อกอิน, สร้างผู้ใช้, ฯลฯ)

---

## 📝 SQL ที่ต้องรัน

คัดลอก SQL จาก `supabase/migrations/add-logs-table.sql`:

```sql
-- Create logs table for system logging
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);

-- ... (ดูไฟล์เต็มใน supabase/migrations/add-logs-table.sql)
```

---

## 🔍 ตรวจสอบปัญหา

1. **ดู Browser Console** (F12 → Console)
   - ดู error messages

2. **ดู Network Tab** (F12 → Network)
   - ดู API calls ไปที่ Supabase
   - ตรวจสอบ response

3. **ตรวจสอบ Supabase Dashboard**
   - Table Editor → `system_logs`
   - ดูว่ามีข้อมูลหรือไม่

---

## 📞 ถ้ายังแก้ไขไม่ได้

1. ตรวจสอบ error message ใน Browser Console
2. ตรวจสอบ error ใน Supabase Dashboard → Logs
3. ลองรัน SQL migration อีกครั้ง

