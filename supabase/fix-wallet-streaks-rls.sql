-- Fix RLS policies for user_wallet and user_streaks tables
-- This script drops and recreates the policies to ensure correct permissions

-- Drop existing policies for user_wallet
drop policy if exists "wallet_select_own" on public.user_wallet;
drop policy if exists "wallet_admin_select" on public.user_wallet;

-- Drop existing policies for user_streaks
drop policy if exists "streaks_select_own" on public.user_streaks;
drop policy if exists "streaks_admin_select" on public.user_streaks;

-- Recreate policies for user_wallet
-- Users can select their own wallet
create policy "wallet_select_own" on public.user_wallet
  for select
  using (auth.uid() = user_id);

-- Admins can select all wallets
create policy "wallet_admin_select" on public.user_wallet
  for select
  using (public.is_admin());

-- Recreate policies for user_streaks
-- Users can select their own streak
create policy "streaks_select_own" on public.user_streaks
  for select
  using (auth.uid() = user_id);

-- Admins can select all streaks
create policy "streaks_admin_select" on public.user_streaks
  for select
  using (public.is_admin());

