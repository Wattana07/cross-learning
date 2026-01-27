-- ============================================
-- Add RLS Policies for room_bookings INSERT/UPDATE/DELETE
-- ============================================
-- เพิ่ม policies สำหรับการ insert, update, delete bookings
-- หมายเหตุ: ต้องรัน setup-room-bookings.sql ก่อนเพื่อสร้างตาราง

-- Allow users to insert their own bookings
do $$ begin
  create policy "bookings_insert_own" on public.room_bookings 
  for insert 
  with check (auth.uid() = booked_by_user_id);
exception when duplicate_object then null;
end $$;

-- Allow admins to insert any booking
do $$ begin
  create policy "bookings_admin_insert" on public.room_bookings 
  for insert 
  with check (public.is_admin());
exception when duplicate_object then null;
end $$;

-- Allow users to update their own bookings
do $$ begin
  create policy "bookings_update_own" on public.room_bookings 
  for update 
  using (auth.uid() = booked_by_user_id);
exception when duplicate_object then null;
end $$;

-- Allow admins to update any booking
do $$ begin
  create policy "bookings_admin_update" on public.room_bookings 
  for update 
  using (public.is_admin());
exception when duplicate_object then null;
end $$;

-- Allow users to cancel their own bookings (by updating status to cancelled)
-- This is covered by bookings_update_own policy above

-- Allow all authenticated users to see all bookings (for calendar view)
do $$ begin
  create policy "bookings_select_all_authenticated" on public.room_bookings 
  for select 
  using (auth.uid() is not null);
exception when duplicate_object then null;
end $$;

-- Allow admins to delete any booking
do $$ begin
  create policy "bookings_admin_delete" on public.room_bookings 
  for delete 
  using (public.is_admin());
exception when duplicate_object then null;
end $$;

