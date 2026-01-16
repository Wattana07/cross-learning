-- Verify subject order_no data
-- This will show all published subjects with their order_no

select 
  s.id,
  s.title,
  c.name as category_name,
  s.order_no,
  s.created_at,
  s.status
from public.subjects s
left join public.categories c on s.category_id = c.id
where s.status = 'published'
order by c.name, s.order_no;

-- Check if there are any subjects with null or 0 order_no
select 
  count(*) as subjects_with_null_order,
  count(case when order_no is null then 1 end) as null_count,
  count(case when order_no = 0 then 1 end) as zero_count
from public.subjects
where status = 'published';

-- Show subjects grouped by category with their order
select 
  c.name as category_name,
  s.title as subject_title,
  s.order_no,
  row_number() over (partition by s.category_id order by s.order_no) as display_order
from public.subjects s
left join public.categories c on s.category_id = c.id
where s.status = 'published'
order by c.name, s.order_no;

