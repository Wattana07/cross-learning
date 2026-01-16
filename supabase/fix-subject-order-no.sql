-- Fix order_no for subjects that are null or 0
-- This will set order_no based on created_at within each category

update public.subjects
set order_no = sub.row_num
from (
  select 
    id,
    row_number() over (partition by category_id order by created_at asc) as row_num
  from public.subjects
  where order_no is null or order_no = 0
) as sub
where public.subjects.id = sub.id;

-- Verify the fix
select 
  category_id,
  id,
  title,
  order_no,
  created_at
from public.subjects
where status = 'published'
order by category_id, order_no;

