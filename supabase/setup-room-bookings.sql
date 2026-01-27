-- ============================================
-- Setup Room Bookings Tables and Dependencies
-- ============================================
-- รันไฟล์นี้ก่อนรัน add-bookings-rls-policies.sql
-- ไฟล์นี้จะสร้าง enum types, ตาราง rooms และ room_bookings

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================
-- ENUMS
-- ============================================
do $$ begin
  create type public.room_status as enum ('active','maintenance');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum ('approved','pending','rejected','cancelled');
exception when duplicate_object then null;
end $$;

-- ============================================
-- TABLES
-- ============================================

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  capacity int not null default 1,
  features_json jsonb not null default '{}'::jsonb,
  status public.room_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_status on public.rooms(status);

-- Room Blocks
create table if not exists public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint room_blocks_time_check check (end_at > start_at)
);

create index if not exists idx_room_blocks_room on public.room_blocks(room_id, start_at, end_at);

-- Room Bookings
create table if not exists public.room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  booked_by_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.booking_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_bookings_time_check check (end_at > start_at)
);

create index if not exists idx_bookings_room on public.room_bookings(room_id, start_at, end_at);
create index if not exists idx_bookings_user on public.room_bookings(booked_by_user_id);
create index if not exists idx_bookings_status on public.room_bookings(status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to set updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for rooms
do $$ begin
  create trigger trg_rooms_updated before update on public.rooms
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- Trigger for bookings
do $$ begin
  create trigger trg_bookings_updated before update on public.room_bookings
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
alter table public.rooms enable row level security;
alter table public.room_blocks enable row level security;
alter table public.room_bookings enable row level security;

-- Helper function for admin check (if not exists)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$ language sql stable;

-- Rooms policies
do $$ begin
  create policy "rooms_select_active" on public.rooms for select using (status = 'active' or public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "rooms_admin_insert" on public.rooms for insert with check (public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "rooms_admin_update" on public.rooms for update using (public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "rooms_admin_delete" on public.rooms for delete using (public.is_admin());
exception when duplicate_object then null;
end $$;

-- Room Blocks policies
do $$ begin
  create policy "blocks_select_all" on public.room_blocks for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "blocks_admin_insert" on public.room_blocks for insert with check (public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "blocks_admin_update" on public.room_blocks for update using (public.is_admin());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "blocks_admin_delete" on public.room_blocks for delete using (public.is_admin());
exception when duplicate_object then null;
end $$;

-- Bookings SELECT policies (basic)
do $$ begin
  create policy "bookings_select_own" on public.room_bookings for select using (auth.uid() = booked_by_user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "bookings_select_admin" on public.room_bookings for select using (public.is_admin());
exception when duplicate_object then null;
end $$;

-- ============================================
-- Success message
-- ============================================
do $$ 
begin
  raise notice 'Room bookings tables and basic policies created successfully!';
  raise notice 'Next step: Run add-bookings-rls-policies.sql to add INSERT/UPDATE/DELETE policies';
end $$;
