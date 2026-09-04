create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  quotation_id uuid references public.quotations(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  document_type text not null check (document_type in ('quotation','invoice','receipt')),
  document_number text not null,
  issue_date date not null default current_date,
  amount numeric not null default 0 check (amount >= 0),
  status text not null default 'draft' check (status in ('draft','issued','paid','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, document_type, document_number)
);
create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_documents_org_date on public.documents(organization_id, issue_date desc);
alter table public.documents enable row level security;
drop policy if exists "documents org access" on public.documents;
create policy "documents org access" on public.documents
for all to authenticated
using (organization_id = public.my_org_id())
with check (organization_id = public.my_org_id());
grant select, insert, update, delete on public.documents to authenticated;
