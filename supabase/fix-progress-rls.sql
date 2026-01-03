-- Fix RLS policies for user_episode_progress
-- Drop existing policies first
drop policy if exists "progress_select_own" on public.user_episode_progress;
drop policy if exists "progress_insert_own" on public.user_episode_progress;
drop policy if exists "progress_update_own" on public.user_episode_progress;
drop policy if exists "progress_admin_select" on public.user_episode_progress;

-- Recreate policies with proper checks
-- Select: Users can see their own progress
create policy "progress_select_own" on public.user_episode_progress
for select 
using (auth.uid() = user_id);

-- Insert: Users can insert their own progress
create policy "progress_insert_own" on public.user_episode_progress
for insert 
with check (auth.uid() = user_id);

-- Update: Users can update their own progress
create policy "progress_update_own" on public.user_episode_progress
for update 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admin can see all progress
create policy "progress_admin_select" on public.user_episode_progress
for select 
using (public.is_admin());

-- Ensure RLS is enabled
alter table public.user_episode_progress enable row level security;

