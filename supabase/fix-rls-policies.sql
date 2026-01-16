-- ============================================
-- Fix RLS Policies for Admin Users Page
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- Drop existing policies if they exist (to recreate)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_admin_delete" on public.profiles;

-- Recreate policies
-- Admin can see all profiles
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

