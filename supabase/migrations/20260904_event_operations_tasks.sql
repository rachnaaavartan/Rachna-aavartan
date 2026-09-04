create table if not exists public.event_operations_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  function_id uuid references public.event_functions(id) on delete set null,
  title text not null,
  status text not null default 'todo' check (status in ('todo','in_progress','done','blocked','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  team_member_id uuid references public.team_members(id) on delete set null,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_event_operations_tasks_project on public.event_operations_tasks(project_id);
create index if not exists idx_event_operations_tasks_function on public.event_operations_tasks(function_id);
create index if not exists idx_event_operations_tasks_due on public.event_operations_tasks(due_at);
alter table public.event_operations_tasks enable row level security;
drop policy if exists "event operations tasks org access" on public.event_operations_tasks;
create policy "event operations tasks org access" on public.event_operations_tasks
for all to authenticated
using (exists(select 1 from public.projects p where p.id=event_operations_tasks.project_id and p.organization_id=public.my_org_id()))
with check (exists(select 1 from public.projects p where p.id=event_operations_tasks.project_id and p.organization_id=public.my_org_id()));
grant select, insert, update, delete on public.event_operations_tasks to authenticated;
create or replace function public.validate_event_operation_task()
returns trigger language plpgsql as $$
begin
  if new.function_id is not null and not exists(select 1 from public.event_functions f where f.id=new.function_id and f.project_id=new.project_id) then
    raise exception 'Function does not belong to this event';
  end if;
  if new.team_member_id is not null and not exists(select 1 from public.team_members t where t.id=new.team_member_id and t.organization_id=public.my_org_id() and t.active=true) then
    raise exception 'Assigned team member is invalid or inactive';
  end if;
  if new.status='done' and new.completed_at is null then new.completed_at=now(); end if;
  if new.status<>'done' then new.completed_at=null; end if;
  return new;
end; $$;
drop trigger if exists trg_validate_event_operation_task on public.event_operations_tasks;
create trigger trg_validate_event_operation_task before insert or update on public.event_operations_tasks for each row execute function public.validate_event_operation_task();
