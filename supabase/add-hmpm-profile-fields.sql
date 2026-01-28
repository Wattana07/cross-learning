-- เพิ่มฟิลด์สำหรับเชื่อมต่อระบบสมาชิก HMPM เข้ากับ profiles
-- รันไฟล์นี้ใน Supabase SQL Editor เพื่อตั้งค่าโครงสร้างตาราง

alter table public.profiles
  add column if not exists hmpm_mcode text,
  add column if not exists hmpm_member_group text[],
  add column if not exists hmpm_pos_cur jsonb,
  add column if not exists hmpm_honor jsonb,
  add column if not exists hmpm_member_status int,
  add column if not exists hmpm_expire date,
  add column if not exists hmpm_raw jsonb;

create index if not exists idx_profiles_hmpm_mcode on public.profiles(hmpm_mcode);

