-- ============================================
-- Room Management Schema
-- ============================================
-- Schema สำหรับระบบจัดการห้องประชุม

-- Room Categories (หมวดหมู่ห้องประชุม)
create table if not exists public.room_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  order_no int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_room_categories_active on public.room_categories(is_active);
create index if not exists idx_room_categories_order on public.room_categories(order_no);

-- Table Layouts (รูปแบบการจัดโต๊ะ)
create table if not exists public.table_layouts (
  id uuid primary key default gen_random_uuid(),
  room_category_id uuid not null references public.room_categories(id) on delete cascade,
  name text not null,
  description text,
  image_url text, -- URL รูปภาพรูปแบบการจัดโต๊ะ
  max_capacity int not null default 1, -- จำนวนคนสูงสุดสำหรับรูปแบบนี้
  order_no int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_table_layouts_category on public.table_layouts(room_category_id);
create index if not exists idx_table_layouts_active on public.table_layouts(is_active);
create index if not exists idx_table_layouts_order on public.table_layouts(order_no);

-- Room Types (ประเภทของห้องประชุม)
create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  order_no int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_room_types_active on public.room_types(is_active);
create index if not exists idx_room_types_order on public.room_types(order_no);

-- Update rooms table to add relationships
alter table public.rooms 
  add column if not exists room_category_id uuid references public.room_categories(id) on delete set null,
  add column if not exists room_type_id uuid references public.room_types(id) on delete set null,
  add column if not exists table_layout_id uuid references public.table_layouts(id) on delete set null;

create index if not exists idx_rooms_category on public.rooms(room_category_id);
create index if not exists idx_rooms_type on public.rooms(room_type_id);
create index if not exists idx_rooms_table_layout on public.rooms(table_layout_id);

-- Triggers for updated_at
do $$ begin
  create trigger trg_room_categories_updated before update on public.room_categories
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_table_layouts_updated before update on public.table_layouts
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_room_types_updated before update on public.room_types
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- RLS Policies
alter table public.room_categories enable row level security;
alter table public.table_layouts enable row level security;
alter table public.room_types enable row level security;

-- Room Categories: Admin only
create policy "room_categories_select_admin" on public.room_categories for select using (public.is_admin());
create policy "room_categories_select_active" on public.room_categories for select using (is_active = true);
create policy "room_categories_admin_insert" on public.room_categories for insert with check (public.is_admin());
create policy "room_categories_admin_update" on public.room_categories for update using (public.is_admin());
create policy "room_categories_admin_delete" on public.room_categories for delete using (public.is_admin());

-- Table Layouts: Admin only
create policy "table_layouts_select_admin" on public.table_layouts for select using (public.is_admin());
create policy "table_layouts_select_active" on public.table_layouts for select using (is_active = true);
create policy "table_layouts_admin_insert" on public.table_layouts for insert with check (public.is_admin());
create policy "table_layouts_admin_update" on public.table_layouts for update using (public.is_admin());
create policy "table_layouts_admin_delete" on public.table_layouts for delete using (public.is_admin());

-- Room Types: Admin only
create policy "room_types_select_admin" on public.room_types for select using (public.is_admin());
create policy "room_types_select_active" on public.room_types for select using (is_active = true);
create policy "room_types_admin_insert" on public.room_types for insert with check (public.is_admin());
create policy "room_types_admin_update" on public.room_types for update using (public.is_admin());
create policy "room_types_admin_delete" on public.room_types for delete using (public.is_admin());

