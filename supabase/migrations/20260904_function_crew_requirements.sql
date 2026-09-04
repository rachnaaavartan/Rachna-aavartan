create table if not exists public.function_crew_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  function_id uuid not null references public.event_functions(id) on delete cascade,
  role text not null,
  required_count integer not null default 1 check (required_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique(function_id, role)
);
create index if not exists idx_function_crew_requirements_function on public.function_crew_requirements(function_id);
create index if not exists idx_function_crew_requirements_project on public.function_crew_requirements(project_id);
alter table public.function_crew_requirements enable row level security;
drop policy if exists "function crew requirements org access" on public.function_crew_requirements;
create policy "function crew requirements org access" on public.function_crew_requirements
for all to authenticated
using (exists(select 1 from public.projects p where p.id=function_crew_requirements.project_id and p.organization_id=public.my_org_id()))
with check (exists(select 1 from public.projects p where p.id=function_crew_requirements.project_id and p.organization_id=public.my_org_id()));
grant select, insert, update, delete on public.function_crew_requirements to authenticated;
