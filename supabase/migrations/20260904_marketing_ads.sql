create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  platform text not null default 'Meta',
  objective text,
  status text not null default 'active' check (status in ('draft','active','paused','completed')),
  start_date date,
  end_date date,
  budget numeric not null default 0 check (budget >= 0),
  spend numeric not null default 0 check (spend >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  leads integer not null default 0 check (leads >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_org on public.marketing_campaigns(organization_id);
create index if not exists idx_marketing_campaigns_status on public.marketing_campaigns(organization_id,status);

alter table public.inquiries add column if not exists campaign_id uuid references public.marketing_campaigns(id) on delete set null;
create index if not exists idx_inquiries_campaign on public.inquiries(campaign_id);

alter table public.marketing_campaigns enable row level security;
drop policy if exists "marketing campaigns org access" on public.marketing_campaigns;
create policy "marketing campaigns org access" on public.marketing_campaigns
for all to authenticated
using (organization_id = public.my_org_id())
with check (organization_id = public.my_org_id());

grant select, insert, update, delete on public.marketing_campaigns to authenticated;