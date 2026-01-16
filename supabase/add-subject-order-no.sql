-- Add order_no column to subjects table
alter table public.subjects 
add column if not exists order_no int not null default 1;

-- Create index for efficient ordering
create index if not exists idx_subjects_category_order on public.subjects(category_id, order_no);

-- Update existing subjects to have order_no based on created_at
update public.subjects
set order_no = sub.row_num
from (
  select 
    id,
    row_number() over (partition by category_id order by created_at asc) as row_num
  from public.subjects
) as sub
where public.subjects.id = sub.id;

