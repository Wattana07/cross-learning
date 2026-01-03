-- ============================================
-- Fix Recursive Policy Issue
-- แก้ปัญหา "stack depth limit exceeded"
-- รัน SQL นี้ใน Supabase SQL Editor
-- ============================================

-- Drop existing is_admin function
drop function if exists public.is_admin();

-- สร้าง is_admin function ใหม่ที่ใช้ auth.jwt() แทน
-- เพื่อหลีกเลี่ยง recursive query
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  -- Get role from JWT claim (faster, no recursive query)
  select (auth.jwt() ->> 'user_role')::text into user_role;
  
  -- If not in JWT, check from profiles (but cache it)
  if user_role is null then
    select role::text into user_role
    from public.profiles
    where id = auth.uid()
    limit 1;
  end if;
  
  return user_role = 'admin';
end;
$$ language plpgsql stable security definer;

-- หรือใช้วิธีที่ง่ายกว่า - เช็คโดยตรงใน policy
-- Drop existing profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_admin_delete" on public.profiles;

-- Recreate policies โดยใช้ inline check แทน function
-- Admin can see all profiles
create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() 
      and p.role = 'admin'
      limit 1
    )
  );

-- Users can see their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile (but not role/is_active)
create policy "profiles_update_own" on public.profiles
  for update 
  using (auth.uid() = id)
  with check (
    auth.uid() = id and
    role = (select role from public.profiles where id = auth.uid() limit 1) and
    is_active = (select is_active from public.profiles where id = auth.uid() limit 1)
  );

-- Admin can insert profiles
create policy "profiles_admin_insert" on public.profiles
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() 
      and p.role = 'admin'
      limit 1
    )
  );

-- Admin can update any profile
create policy "profiles_admin_update" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() 
      and p.role = 'admin'
      limit 1
    )
  );

-- Admin can delete profiles
create policy "profiles_admin_delete" on public.profiles
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() 
      and p.role = 'admin'
      limit 1
    )
  );

