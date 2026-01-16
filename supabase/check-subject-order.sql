-- Check current order_no values for subjects
select 
  id,
  title,
  category_id,
  order_no,
  created_at
from public.subjects
where status = 'published'
order by category_id, order_no;

-- Check if order_no column exists
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'subjects'
  and column_name = 'order_no';

-- Check subjects without order_no or with null order_no
select 
  id,
  title,
  category_id,
  order_no,
  created_at
from public.subjects
where order_no is null or order_no = 0;

