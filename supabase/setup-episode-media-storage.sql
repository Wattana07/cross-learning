-- ============================================
-- Setup Episode Media Storage Bucket and Policies
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- หมายเหตุ: ต้องสร้าง Storage Bucket ก่อนผ่าน Dashboard
-- 1. ไปที่ Storage > Create bucket
-- 2. Name: episode-media
-- 3. Public: false (Private)
-- 4. กด Create

-- หมายเหตุ: storage.objects มี RLS เปิดอยู่แล้วโดย Supabase
-- ไม่ต้อง enable RLS เอง

-- Drop existing policies if they exist
drop policy if exists "Admins can upload episode media" on storage.objects;
drop policy if exists "Admins can update episode media" on storage.objects;
drop policy if exists "Admins can delete episode media" on storage.objects;
drop policy if exists "Admins can read episode media" on storage.objects;
drop policy if exists "Users can read published episode media" on storage.objects;

-- Policy: Admin can upload episode media
create policy "Admins can upload episode media"
on storage.objects for insert
with check (
  bucket_id = 'episode-media' and
  public.is_admin()
);

-- Policy: Admin can update episode media
create policy "Admins can update episode media"
on storage.objects for update
using (
  bucket_id = 'episode-media' and
  public.is_admin()
);

-- Policy: Admin can delete episode media
create policy "Admins can delete episode media"
on storage.objects for delete
using (
  bucket_id = 'episode-media' and
  public.is_admin()
);

-- Policy: Admin can read all episode media
create policy "Admins can read episode media"
on storage.objects for select
using (
  bucket_id = 'episode-media' and
  public.is_admin()
);

-- Policy: Users can read published episode media
-- (This allows signed URLs to work for published episodes)
create policy "Users can read published episode media"
on storage.objects for select
using (
  bucket_id = 'episode-media' and
  exists (
    select 1 from public.episodes e
    where (
      e.video_path like '%' || storage.objects.name || '%'
      or e.pdf_path like '%' || storage.objects.name || '%'
    )
    and e.status = 'published'
  )
);

