-- Create research_trends table to track performance over time
create table public.research_trends (
  id uuid not null default gen_random_uuid(),
  research_id uuid not null,
  recorded_at timestamp with time zone not null default now(),
  views integer not null,
  likes integer not null,
  followers integer not null,
  created_at timestamp with time zone not null default now(),
  constraint research_trends_pkey primary key (id),
  constraint research_trends_research_id_fkey foreign key (research_id) references research (id) on delete cascade
) tablespace pg_default;

-- Enable RLS
alter table public.research_trends enable row level security;

-- Create RLS policies
create policy "View research trends if workspace member"
on public.research_trends
for select
using (
  exists (
    select 1 from research r
    inner join workspace_members wm on wm.workspace_id = r.workspace_id
    where r.id = research_trends.research_id
    and wm.user_id = auth.uid()
  )
);

create policy "Manage research trends if contributor"
on public.research_trends
for all
using (
  exists (
    select 1 from research r
    inner join workspace_members wm on wm.workspace_id = r.workspace_id
    where r.id = research_trends.research_id
    and wm.user_id = auth.uid()
  )
);
