-- ============================================
-- Add RLS Policies for room_bookings INSERT/UPDATE/DELETE
-- ============================================
-- เพิ่ม policies สำหรับการ insert, update, delete bookings

-- Allow users to insert their own bookings
create policy "bookings_insert_own" on public.room_bookings 
for insert 
with check (auth.uid() = booked_by_user_id);

-- Allow admins to insert any booking
create policy "bookings_admin_insert" on public.room_bookings 
for insert 
with check (public.is_admin());

-- Allow admins to update any booking
create policy "bookings_admin_update" on public.room_bookings 
for update 
using (public.is_admin());

-- Allow admins to delete any booking
create policy "bookings_admin_delete" on public.room_bookings 
for delete 
using (public.is_admin());

