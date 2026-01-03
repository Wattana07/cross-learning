-- ============================================
-- Storage Bucket Policies
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- สร้าง Storage Bucket สำหรับ user-avatars (ถ้ายังไม่มี)
-- ไปที่ Storage > Create bucket > ชื่อ: user-avatars, Private: true

-- Storage Policies สำหรับ user-avatars
-- อนุญาตให้ผู้ใช้ upload/update/delete รูปของตัวเอง
-- อนุญาตให้ทุกคนอ่าน (ผ่าน signed URL)

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

