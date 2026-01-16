-- ============================================
-- Setup Category Thumbnails Storage Bucket and Policies
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- หมายเหตุ: ต้องสร้าง Storage Bucket ก่อนผ่าน Dashboard
-- 1. ไปที่ Storage > Create bucket
-- 2. Name: category-thumbs
-- 3. Public: false (Private)
-- 4. กด Create

-- หมายเหตุ: storage.objects มี RLS เปิดอยู่แล้วโดย Supabase
-- ไม่ต้อง enable RLS เอง

-- Drop existing policies if they exist
drop policy if exists "Admins can upload category thumbnails" on storage.objects;
drop policy if exists "Admins can update category thumbnails" on storage.objects;
drop policy if exists "Admins can delete category thumbnails" on storage.objects;
drop policy if exists "Admins can read category thumbnails" on storage.objects;
drop policy if exists "Users can read published category thumbnails" on storage.objects;

-- Policy: Admin can upload category thumbnails
create policy "Admins can upload category thumbnails"
on storage.objects for insert
with check (
  bucket_id = 'category-thumbs' and
  public.is_admin()
);

-- Policy: Admin can update category thumbnails
create policy "Admins can update category thumbnails"
on storage.objects for update
using (
  bucket_id = 'category-thumbs' and
  public.is_admin()
);

-- Policy: Admin can delete category thumbnails
create policy "Admins can delete category thumbnails"
on storage.objects for delete
using (
  bucket_id = 'category-thumbs' and
  public.is_admin()
);

-- Policy: Admin can read all category thumbnails
create policy "Admins can read category thumbnails"
on storage.objects for select
using (
  bucket_id = 'category-thumbs' and
  public.is_admin()
);

-- Policy: Users can read published category thumbnails
-- (This allows signed URLs to work for published categories)
create policy "Users can read published category thumbnails"
on storage.objects for select
using (
  bucket_id = 'category-thumbs' and
  exists (
    select 1 from public.categories c
    where c.thumbnail_path like '%' || storage.objects.name || '%'
    and c.status = 'published'
  )
);

