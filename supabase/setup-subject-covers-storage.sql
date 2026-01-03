-- ============================================
-- Setup Subject Covers Storage Bucket and Policies
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- หมายเหตุ: ต้องสร้าง Storage Bucket ก่อนผ่าน Dashboard
-- 1. ไปที่ Storage > Create bucket
-- 2. Name: subject-covers
-- 3. Public: false (Private)
-- 4. กด Create

-- หมายเหตุ: storage.objects มี RLS เปิดอยู่แล้วโดย Supabase
-- ไม่ต้อง enable RLS เอง

-- Drop existing policies if they exist
drop policy if exists "Admins can upload subject covers" on storage.objects;
drop policy if exists "Admins can update subject covers" on storage.objects;
drop policy if exists "Admins can delete subject covers" on storage.objects;
drop policy if exists "Admins can read subject covers" on storage.objects;
drop policy if exists "Users can read published subject covers" on storage.objects;

-- Policy: Admin can upload subject covers
create policy "Admins can upload subject covers"
on storage.objects for insert
with check (
  bucket_id = 'subject-covers' and
  public.is_admin()
);

-- Policy: Admin can update subject covers
create policy "Admins can update subject covers"
on storage.objects for update
using (
  bucket_id = 'subject-covers' and
  public.is_admin()
);

-- Policy: Admin can delete subject covers
create policy "Admins can delete subject covers"
on storage.objects for delete
using (
  bucket_id = 'subject-covers' and
  public.is_admin()
);

-- Policy: Admin can read all subject covers
create policy "Admins can read subject covers"
on storage.objects for select
using (
  bucket_id = 'subject-covers' and
  public.is_admin()
);

-- Policy: Users can read published subject covers
-- (This allows signed URLs to work for published subjects)
create policy "Users can read published subject covers"
on storage.objects for select
using (
  bucket_id = 'subject-covers' and
  exists (
    select 1 from public.subjects s
    where s.cover_path like '%' || storage.objects.name || '%'
    and s.status = 'published'
  )
);

