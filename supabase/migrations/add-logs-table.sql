-- Create logs table for system logging
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  status text not null default 'success', -- success, error, warning, info
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_logs_user on public.system_logs(user_id);
create index if not exists idx_logs_action on public.system_logs(action);
create index if not exists idx_logs_status on public.system_logs(status);
create index if not exists idx_logs_created on public.system_logs(created_at desc);
create index if not exists idx_logs_resource on public.system_logs(resource_type, resource_id);

-- Enable RLS
alter table public.system_logs enable row level security;

-- Drop existing policies if exist (to avoid duplicate error)
drop policy if exists "Admins can view all logs" on public.system_logs;
drop policy if exists "Users can view own logs" on public.system_logs;
drop policy if exists "Users can insert logs" on public.system_logs;

-- Policy: Only admins can view logs
create policy "Admins can view all logs" on public.system_logs
  for select
  using (public.is_admin());

-- Policy: Normal users can view only their own logs
create policy "Users can view own logs" on public.system_logs
  for select
  using (auth.uid() = user_id);

-- Policy: Authenticated users can insert logs (for logging their own actions)
create policy "Users can insert logs" on public.system_logs
  for insert
  with check (auth.uid() is not null);

