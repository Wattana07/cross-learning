-- ============================================
-- Fix All RLS Policies (รวม Profiles + Storage)
-- รัน SQL นี้ใน Supabase SQL Editor (รันครั้งเดียว)
-- ============================================

-- ============================================
-- 1. Fix Profiles Policies
-- ============================================

-- Drop existing policies
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_admin_delete" on public.profiles;

-- Recreate policies
-- Admin can see all profiles (ต้องมาก่อนเพื่อให้ admin อ่านได้)
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

-- Users can see their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile (but not role/is_active)
create policy "profiles_update_own" on public.profiles
  for update 
  using (auth.uid() = id)
  with check (
    auth.uid() = id and
    role = (select role from public.profiles where id = auth.uid()) and
    is_active = (select is_active from public.profiles where id = auth.uid())
  );

-- Admin can insert profiles
create policy "profiles_admin_insert" on public.profiles
  for insert with check (public.is_admin());

-- Admin can update any profile
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- Admin can delete profiles
create policy "profiles_admin_delete" on public.profiles
  for delete using (public.is_admin());

-- ============================================
-- 2. Fix Storage Policies
-- ============================================

-- หมายเหตุ: storage.objects มี RLS เปิดอยู่แล้วโดย Supabase
-- ไม่ต้อง enable RLS เอง

-- Drop existing policies
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
