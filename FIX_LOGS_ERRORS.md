# 🔧 แก้ไขปัญหา Logs และ Status

## ❌ ปัญหาที่พบบ่อย

### 1. Error: "relation system_logs does not exist"

**สาเหตุ:** ยังไม่ได้รัน SQL migration เพื่อสร้างตาราง

**วิธีแก้ไข:**
1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. คัดลอก SQL จาก `supabase/migrations/add-logs-table.sql`
4. รัน SQL

---

### 2. Error: "permission denied for table system_logs"

**สาเหตุ:** RLS Policy ยังไม่ถูกตั้งค่าหรือผู้ใช้ไม่มีสิทธิ์

**วิธีแก้ไข:**
1. ตรวจสอบว่าเป็น Admin
2. รัน SQL migration อีกครั้ง (ใช้ `create policy if not exists` แทน)
3. ตรวจสอบ RLS policies ใน Supabase Dashboard

---

### 3. Error: "policy already exists"

**สาเหตุ:** Policy ถูกสร้างแล้ว

**วิธีแก้ไข:**
- ใช้ SQL นี้แทน:

```sql
-- Drop existing policies if exist
drop policy if exists "Admins can view all logs" on public.system_logs;
drop policy if exists "Users can insert logs" on public.system_logs;

-- Create policies
create policy "Admins can view all logs" on public.system_logs
  for select
  using (public.is_admin());

create policy "Users can insert logs" on public.system_logs
  for insert
  with check (auth.uid() is not null);
```

---

### 4. Logs ไม่แสดงในหน้า /admin/logs

**สาเหตุ:**
- Table ยังไม่ถูกสร้าง
- ไม่มี logs ในระบบ
- ไม่ใช่ Admin

**วิธีแก้ไข:**
1. ตรวจสอบว่า table `system_logs` มีอยู่
2. ลองสร้างผู้ใช้ใหม่เพื่อทดสอบว่ามี log หรือไม่
3. ตรวจสอบว่าเป็น Admin role

---

### 5. Status Page แสดง Offline

**สาเหตุ:**
- Network connection
- Supabase credentials ไม่ถูกต้อง

**วิธีแก้ไข:**
1. ตรวจสอบ `.env` มี `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
2. ตรวจสอบ Network connection
3. ตรวจสอบ Supabase project ยังใช้งานได้

---

## 📝 SQL ที่ปรับปรุงแล้ว (แก้ปัญหา duplicate policy)

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

-- Create indexes
create index if not exists idx_logs_user on public.system_logs(user_id);
create index if not exists idx_logs_action on public.system_logs(action);
create index if not exists idx_logs_status on public.system_logs(status);
create index if not exists idx_logs_created on public.system_logs(created_at desc);
create index if not exists idx_logs_resource on public.system_logs(resource_type, resource_id);

-- Enable RLS
alter table public.system_logs enable row level security;

-- Drop existing policies if exist (avoid duplicate error)
drop policy if exists "Admins can view all logs" on public.system_logs;
drop policy if exists "Users can insert logs" on public.system_logs;

-- Create policies
create policy "Admins can view all logs" on public.system_logs
  for select
  using (public.is_admin());

create policy "Users can insert logs" on public.system_logs
  for insert
  with check (auth.uid() is not null);
```

---

## ✅ Checklist การแก้ไข

- [ ] รัน SQL migration ที่ปรับปรุงแล้ว
- [ ] ตรวจสอบว่า table `system_logs` ถูกสร้างแล้ว
- [ ] ตรวจสอบว่า policies ถูกสร้างแล้ว
- [ ] ทดสอบสร้างผู้ใช้ใหม่เพื่อดูว่ามี log หรือไม่
- [ ] ไปที่ `/admin/logs` เพื่อดู logs
- [ ] ไปที่ `/admin/status` เพื่อตรวจสอบสถานะ

