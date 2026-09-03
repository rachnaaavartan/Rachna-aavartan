begin;

create extension if not exists pgcrypto;

create table if not exists public.client_portals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_opened_at timestamptz
);

create index if not exists idx_client_portals_org_project on public.client_portals(organization_id, project_id);
create index if not exists idx_client_portals_token_active on public.client_portals(token) where active = true;

create table if not exists public.portal_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_portal_id uuid not null references public.client_portals(id) on delete cascade,
  request_type text not null default 'general' check (request_type in ('general','change','approval','album','delivery','payment')),
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','done','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portal_requests_project_status on public.portal_requests(project_id,status,created_at desc);

alter table public.client_portals enable row level security;
alter table public.portal_requests enable row level security;

drop policy if exists client_portals_org_access on public.client_portals;
create policy client_portals_org_access on public.client_portals
for all to authenticated
using (organization_id = public.my_org_id())
with check (organization_id = public.my_org_id());

drop policy if exists portal_requests_org_access on public.portal_requests;
create policy portal_requests_org_access on public.portal_requests
for all to authenticated
using (organization_id = public.my_org_id())
with check (organization_id = public.my_org_id());

create or replace function public.create_client_portal(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.my_org_id();
  v_portal public.client_portals;
begin
  if v_org is null then raise exception 'No workspace'; end if;

  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.organization_id = v_org
  ) then
    raise exception 'Event not found';
  end if;

  select * into v_portal
  from public.client_portals
  where project_id = p_project_id and organization_id = v_org
  order by created_at desc
  limit 1;

  if v_portal.id is null then
    insert into public.client_portals (organization_id, project_id)
    values (v_org, p_project_id)
    returning * into v_portal;
  elsif not v_portal.active then
    update public.client_portals
    set active = true, token = encode(gen_random_bytes(24), 'hex')
    where id = v_portal.id
    returning * into v_portal;
  end if;

  return jsonb_build_object(
    'id', v_portal.id,
    'project_id', v_portal.project_id,
    'token', v_portal.token,
    'active', v_portal.active
  );
end;
$$;

create or replace function public.revoke_client_portal(p_project_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid := public.my_org_id();
begin
  if v_org is null then raise exception 'No workspace'; end if;
  update public.client_portals
  set active = false
  where project_id = p_project_id and organization_id = v_org;
  return true;
end;
$$;

create or replace function public.get_client_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal public.client_portals;
  v_project public.projects;
  v_customer public.customers;
  v_functions jsonb;
  v_services jsonb;
  v_files jsonb;
  v_deliverables jsonb;
  v_quotes jsonb;
begin
  select * into v_portal
  from public.client_portals
  where token = p_token and active = true
  limit 1;

  if v_portal.id is null then
    raise exception 'Portal not found or expired';
  end if;

  update public.client_portals set last_opened_at = now() where id = v_portal.id;

  select * into v_project from public.projects where id = v_portal.project_id;
  select * into v_customer from public.customers where id = v_project.customer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'event_date', f.event_date,
    'event_date_bs', f.event_date_bs,
    'start_time', f.start_time,
    'venue', f.venue,
    'guest_count', f.guest_count
  ) order by f.event_date nulls last, f.name), '[]'::jsonb)
  into v_functions
  from public.event_functions f where f.project_id = v_project.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ps.id,
    'function_id', ps.function_id,
    'name', ps.name,
    'quantity', ps.quantity,
    'customer_price', ps.customer_price
  ) order by ps.id), '[]'::jsonb)
  into v_services
  from public.project_services ps where ps.project_id = v_project.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ef.id,
    'function_id', ef.function_id,
    'name', ef.name,
    'kind', ef.kind,
    'url', ef.url,
    'notes', ef.notes
  ) order by ef.created_at desc), '[]'::jsonb)
  into v_files
  from public.event_files ef where ef.project_id = v_project.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ad.id,
    'function_id', ad.function_id,
    'deliverable', ad.deliverable,
    'status', ad.status,
    'due_date', ad.due_date
  ) order by ad.due_date nulls last), '[]'::jsonb)
  into v_deliverables
  from public.aavartan_deliverables ad where ad.project_id = v_project.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'version', q.version,
    'status', q.status,
    'customer_total', q.customer_total,
    'notes', q.notes
  ) order by q.version desc), '[]'::jsonb)
  into v_quotes
  from public.quotations q where q.project_id = v_project.id and q.status <> 'rejected';

  return jsonb_build_object(
    'portal', jsonb_build_object('id', v_portal.id, 'project_id', v_project.id),
    'event', jsonb_build_object(
      'id', v_project.id,
      'event_code', v_project.event_code,
      'name', v_project.name,
      'brand', v_project.brand,
      'status', v_project.status,
      'date_range_bs', v_project.date_range_bs,
      'quoted_total', v_project.quoted_total,
      'customer_advance', v_project.customer_advance,
      'balance', greatest(coalesce(v_project.quoted_total,0)-coalesce(v_project.customer_advance,0),0)
    ),
    'customer', jsonb_build_object('name', coalesce(v_customer.name,'Guest')),
    'functions', v_functions,
    'services', v_services,
    'files', v_files,
    'deliverables', v_deliverables,
    'quotations', v_quotes
  );
end;
$$;

create or replace function public.portal_submit_request(
  p_token text,
  p_request_type text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal public.client_portals;
  v_request public.portal_requests;
  v_message text := nullif(trim(p_message),'');
  v_type text := coalesce(nullif(p_request_type,''),'general');
begin
  if v_message is null then raise exception 'Message is required'; end if;
  if v_type not in ('general','change','approval','album','delivery','payment') then v_type := 'general'; end if;

  select * into v_portal from public.client_portals where token=p_token and active=true limit 1;
  if v_portal.id is null then raise exception 'Portal not found or expired'; end if;

  insert into public.portal_requests (organization_id, project_id, client_portal_id, request_type, message)
  values (v_portal.organization_id, v_portal.project_id, v_portal.id, v_type, v_message)
  returning * into v_request;

  return jsonb_build_object('id',v_request.id,'status',v_request.status,'created_at',v_request.created_at);
end;
$$;

revoke execute on function public.create_client_portal(uuid) from public, anon;
revoke execute on function public.revoke_client_portal(uuid) from public, anon;
revoke execute on function public.get_client_portal(text) from public;
revoke execute on function public.portal_submit_request(text,text,text) from public;
grant execute on function public.create_client_portal(uuid) to authenticated;
grant execute on function public.revoke_client_portal(uuid) to authenticated;
grant execute on function public.get_client_portal(text) to anon, authenticated;
grant execute on function public.portal_submit_request(text,text,text) to anon, authenticated;

commit;
