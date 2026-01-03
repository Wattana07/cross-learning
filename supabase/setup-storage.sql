-- ============================================
-- Setup Storage Bucket and Policies
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- หมายเหตุ: ต้องสร้าง Storage Bucket ก่อนผ่าน Dashboard
-- 1. ไปที่ Storage > Create bucket
-- 2. Name: user-avatars
-- 3. Public: false (Private)
-- 4. กด Create

-- หมายเหตุ: storage.objects มี RLS เปิดอยู่แล้วโดย Supabase
-- ไม่ต้อง enable RLS เอง

-- Drop existing policies if they exist
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Users can delete own avatar" on storage.objects;
drop policy if exists "Users can read own avatar" on storage.objects;
drop policy if exists "Admins can read all avatars" on storage.objects;
drop policy if exists "Admins can delete any avatar" on storage.objects;
drop policy if exists "Admins can upload any avatar" on storage.objects;

-- Policy: Users can upload their own avatar
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'user-avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatar
create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'user-avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatar
create policy "Users can delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'user-avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can read their own avatar (for signed URL generation)
create policy "Users can read own avatar"
on storage.objects for select
using (
  bucket_id = 'user-avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admin can read all avatars
create policy "Admins can read all avatars"
on storage.objects for select
using (
  bucket_id = 'user-avatars' and
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- Policy: Admin can delete any avatar
create policy "Admins can delete any avatar"
on storage.objects for delete
using (
  bucket_id = 'user-avatars' and
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- Policy: Admin can upload for any user (for admin creating users)
create policy "Admins can upload any avatar"
on storage.objects for insert
with check (
  bucket_id = 'user-avatars' and
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);
