-- ============================================
-- Fix is_admin() Function Only (แก้ Recursive Issue)
-- รัน SQL นี้ใน Supabase SQL Editor
-- ใช้เมื่อต้องการแก้เฉพาะ function โดยไม่กระทบ policies อื่น
-- ============================================

-- ใช้ CREATE OR REPLACE แทน DROP เพื่อไม่กระทบ policies ที่ใช้อยู่
create or replace function public.is_admin()
returns boolean as $$
begin
  -- ใช้ security definer เพื่อ bypass RLS และป้องกัน recursive
  -- ใช้ limit 1 เพื่อป้องกัน infinite loop
  return exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
    and p.role = 'admin'
    limit 1
  );
end;
$$ language plpgsql stable security definer;

