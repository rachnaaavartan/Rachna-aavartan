begin;

-- Vendor availability/conflict protection: a vendor cannot be committed to two
-- different events on the same dated function. Multiple functions inside the
-- same event remain allowed.
create or replace function public.enforce_vendor_booking_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.my_org_id();
  v_date date;
  v_conflict record;
begin
  if v_org is null then raise exception 'No workspace'; end if;
  if new.function_id is null or coalesce(new.status,'reserved') = 'cancelled' then return new; end if;

  select f.event_date into v_date
  from public.event_functions f
  where f.id = new.function_id and f.project_id = new.project_id;
  if not found then raise exception 'Function does not belong to this event'; end if;
  if v_date is null then return new; end if;

  select vb.id, p.event_code, f.name as function_name
    into v_conflict
  from public.vendor_bookings vb
  join public.projects p on p.id = vb.project_id
  join public.event_functions f on f.id = vb.function_id
  where vb.vendor_id = new.vendor_id
    and vb.project_id <> new.project_id
    and vb.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(vb.status,'reserved') <> 'cancelled'
    and f.event_date = v_date
    and p.organization_id = v_org
  limit 1;

  if found then
    raise exception 'Vendor is already booked on % (%). Choose another vendor or date.', v_conflict.event_code, v_conflict.function_name;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendor_booking_conflicts on public.vendor_bookings;
create trigger trg_vendor_booking_conflicts
before insert or update on public.vendor_bookings
for each row execute function public.enforce_vendor_booking_conflicts();

-- Foreign-key indexes that materially improve event-level lookups and RLS joins.
create index if not exists idx_client_portals_project on public.client_portals(project_id);
create index if not exists idx_event_files_function on public.event_files(function_id);
create index if not exists idx_event_files_organization on public.event_files(organization_id);
create index if not exists idx_portal_requests_client_portal on public.portal_requests(client_portal_id);
create index if not exists idx_portal_requests_organization on public.portal_requests(organization_id);
create index if not exists idx_production_jobs_assigned_to on public.production_jobs(assigned_to);
create index if not exists idx_production_jobs_function on public.production_jobs(function_id);
create index if not exists idx_production_jobs_organization on public.production_jobs(organization_id);

-- Remove exact duplicate indexes while retaining the canonical idx_* copies.
drop index if exists public.event_files_project_idx;
drop index if exists public.idx_functions_date;
drop index if exists public.event_functions_project_date_idx;
drop index if exists public.idx_event_ops_tasks_due;
drop index if exists public.idx_event_ops_tasks_function;
drop index if exists public.idx_event_ops_tasks_project;
drop index if exists public.project_services_project_idx;
drop index if exists public.project_team_project_idx;
drop index if exists public.quotation_items_quotation_idx;
drop index if exists public.vendor_bookings_project_idx;

-- Profiles are private workspace records. Keep them on the authenticated path
-- and cache auth.uid() once per statement via a scalar SELECT.
drop policy if exists "profile bootstrap only" on public.profiles;
drop policy if exists "profiles own org" on public.profiles;
create policy "profile bootstrap only"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id and organization_id is null);
create policy "profiles own org"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or organization_id = public.my_org_id());

commit;
