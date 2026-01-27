-- ============================================
-- Cross-Learning Platform
-- Database Schema for Supabase
-- ============================================
-- คัดลอกทั้งหมดไปรันใน Supabase SQL Editor

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================
-- ENUMS
-- ============================================
do $$ begin
  create type public.user_role as enum ('learner','admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_status as enum ('draft','published','hidden');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.unlock_mode as enum ('sequential','open');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.media_type as enum ('video_url','video_upload','pdf');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.resource_type as enum ('link','file','pdf');
exception when duplicate_object then null;
end $$;

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

-- Profiles (maps to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  department text,
  avatar_path text,
  role public.user_role not null default 'learner',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_active on public.profiles(is_active);

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  thumbnail_path text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_status on public.categories(status);

-- Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null,
  description text,
  cover_path text,
  level text default 'beginner',
  unlock_mode public.unlock_mode not null default 'sequential',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subjects_category on public.subjects(category_id);
create index if not exists idx_subjects_status on public.subjects(status);

-- Episodes
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  order_no int not null default 1,
  status public.content_status not null default 'draft',
  primary_media_type public.media_type not null default 'video_url',
  video_url text,
  video_path text,
  pdf_path text,
  duration_seconds int,
  points_reward int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episodes_media_check check (
    (primary_media_type = 'video_url' and video_url is not null and video_path is null and pdf_path is null)
    or
    (primary_media_type = 'video_upload' and video_path is not null and video_url is null and pdf_path is null)
    or
    (primary_media_type = 'pdf' and pdf_path is not null and video_url is null and video_path is null)
  )
);

create index if not exists idx_episodes_subject on public.episodes(subject_id);
create index if not exists idx_episodes_subject_order on public.episodes(subject_id, order_no);
create index if not exists idx_episodes_status on public.episodes(status);

-- Episode Resources
create table if not exists public.episode_resources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  type public.resource_type not null default 'link',
  title text,
  url_or_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_episode on public.episode_resources(episode_id);

-- User Episode Progress
create table if not exists public.user_episode_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  watched_percent numeric not null default 0,
  last_position_seconds int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create index if not exists idx_progress_user on public.user_episode_progress(user_id);

-- Point Rules
create table if not exists public.point_rules (
  key text primary key,
  points int not null,
  is_active boolean not null default true,
  description text,
  updated_at timestamptz not null default now()
);

-- Default rules
insert into public.point_rules(key, points, is_active, description)
values
  ('episode_complete', 10, true, 'จบบทเรียน'),
  ('subject_complete', 50, true, 'จบทั้งวิชา'),
  ('streak_3', 20, true, 'เรียนต่อเนื่อง 3 วัน'),
  ('streak_7', 60, true, 'เรียนต่อเนื่อง 7 วัน')
on conflict (key) do nothing;

-- Point Transactions
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_key text not null references public.point_rules(key),
  ref_type text not null,
  ref_id text not null,
  points int not null,
  created_at timestamptz not null default now(),
  constraint uniq_points unique (user_id, rule_key, ref_type, ref_id)
);

create index if not exists idx_points_user on public.point_transactions(user_id);
create index if not exists idx_points_created on public.point_transactions(created_at);

-- User Wallet
create table if not exists public.user_wallet (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points int not null default 0,
  level int not null default 1,
  updated_at timestamptz not null default now()
);

-- User Streaks
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  max_streak int not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

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

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_subjects_updated before update on public.subjects
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_episodes_updated before update on public.episodes
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_rooms_updated before update on public.rooms
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_bookings_updated before update on public.room_bookings
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_streaks_updated before update on public.user_streaks
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$ language sql stable;

create or replace function public.wallet_add_points(p_user_id uuid, p_points int)
returns void as $$
declare
  new_total int;
begin
  if p_points <= 0 then
    raise exception 'Points must be positive';
  end if;
  
  insert into public.user_wallet (user_id, total_points, level)
  values (p_user_id, 0, 1)
  on conflict (user_id) do nothing;

  update public.user_wallet
  set total_points = total_points + p_points, updated_at = now()
  where user_id = p_user_id;

  select total_points into new_total from public.user_wallet where user_id = p_user_id;

  update public.user_wallet
  set level = greatest(1, floor(new_total / 500) + 1)::int, updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.subjects enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_resources enable row level security;
alter table public.user_episode_progress enable row level security;
alter table public.point_rules enable row level security;
alter table public.point_transactions enable row level security;
alter table public.user_wallet enable row level security;
alter table public.user_streaks enable row level security;
alter table public.rooms enable row level security;
alter table public.room_blocks enable row level security;
alter table public.room_bookings enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select using (public.is_admin());
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_insert" on public.profiles for insert with check (public.is_admin());
create policy "profiles_admin_update" on public.profiles for update using (public.is_admin());
create policy "profiles_admin_delete" on public.profiles for delete using (public.is_admin());

-- Categories
create policy "categories_select_published" on public.categories for select using (status = 'published' or public.is_admin());
create policy "categories_admin_insert" on public.categories for insert with check (public.is_admin());
create policy "categories_admin_update" on public.categories for update using (public.is_admin());
create policy "categories_admin_delete" on public.categories for delete using (public.is_admin());

-- Subjects
create policy "subjects_select_published" on public.subjects for select using (status = 'published' or public.is_admin());
create policy "subjects_admin_insert" on public.subjects for insert with check (public.is_admin());
create policy "subjects_admin_update" on public.subjects for update using (public.is_admin());
create policy "subjects_admin_delete" on public.subjects for delete using (public.is_admin());

-- Episodes
create policy "episodes_select_published" on public.episodes for select using (status = 'published' or public.is_admin());
create policy "episodes_admin_insert" on public.episodes for insert with check (public.is_admin());
create policy "episodes_admin_update" on public.episodes for update using (public.is_admin());
create policy "episodes_admin_delete" on public.episodes for delete using (public.is_admin());

-- Resources
create policy "resources_select" on public.episode_resources for select using (
  exists (select 1 from public.episodes e where e.id = episode_id and (e.status = 'published' or public.is_admin()))
);
create policy "resources_admin_insert" on public.episode_resources for insert with check (public.is_admin());
create policy "resources_admin_update" on public.episode_resources for update using (public.is_admin());
create policy "resources_admin_delete" on public.episode_resources for delete using (public.is_admin());

-- Progress
create policy "progress_select_own" on public.user_episode_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.user_episode_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.user_episode_progress for update using (auth.uid() = user_id);
create policy "progress_admin_select" on public.user_episode_progress for select using (public.is_admin());

-- Point Rules
create policy "rules_select_all" on public.point_rules for select using (true);
create policy "rules_admin_insert" on public.point_rules for insert with check (public.is_admin());
create policy "rules_admin_update" on public.point_rules for update using (public.is_admin());
create policy "rules_admin_delete" on public.point_rules for delete using (public.is_admin());

-- Point Transactions
create policy "points_select_own" on public.point_transactions for select using (auth.uid() = user_id);
create policy "points_admin_select" on public.point_transactions for select using (public.is_admin());

-- Wallet
create policy "wallet_select_own" on public.user_wallet for select using (auth.uid() = user_id);
create policy "wallet_admin_select" on public.user_wallet for select using (public.is_admin());

-- Streaks
create policy "streaks_select_own" on public.user_streaks for select using (auth.uid() = user_id);
create policy "streaks_admin_select" on public.user_streaks for select using (public.is_admin());

-- Rooms
create policy "rooms_select_active" on public.rooms for select using (status = 'active' or public.is_admin());
create policy "rooms_admin_insert" on public.rooms for insert with check (public.is_admin());
create policy "rooms_admin_update" on public.rooms for update using (public.is_admin());
create policy "rooms_admin_delete" on public.rooms for delete using (public.is_admin());

-- Room Blocks
create policy "blocks_select_all" on public.room_blocks for select using (true);
create policy "blocks_admin_insert" on public.room_blocks for insert with check (public.is_admin());
create policy "blocks_admin_update" on public.room_blocks for update using (public.is_admin());
create policy "blocks_admin_delete" on public.room_blocks for delete using (public.is_admin());

-- Bookings
create policy "bookings_select_own" on public.room_bookings for select using (auth.uid() = booked_by_user_id);
create policy "bookings_select_admin" on public.room_bookings for select using (public.is_admin());
create policy "bookings_select_all_authenticated" on public.room_bookings for select using (auth.uid() is not null);

-- ============================================
-- สร้าง Admin User คนแรก
-- หลังจากสร้าง user ใน Authentication แล้ว
-- ให้รัน SQL นี้โดยแทน 'USER_ID' และ 'EMAIL'
-- ============================================
-- insert into public.profiles (id, email, full_name, role, is_active)
-- values ('USER_ID', 'EMAIL', 'Admin User', 'admin', true);
-- insert into public.user_wallet (user_id) values ('USER_ID');
-- insert into public.user_streaks (user_id) values ('USER_ID');

