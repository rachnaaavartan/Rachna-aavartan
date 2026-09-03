create or replace function public.refresh_project_financials(p_project_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_org uuid;
  v_quote numeric:=0;
  v_cost numeric:=0;
  v_has_quote boolean:=false;
begin
  v_org:=public.my_org_id();
  if v_org is null then raise exception 'No workspace'; end if;

  select exists(
    select 1 from public.quotations q
    where q.project_id=p_project_id and q.status<>'rejected'
  ) into v_has_quote;

  if v_has_quote then
    select coalesce(sum(qi.customer_price*qi.quantity),0),
           coalesce(sum(qi.internal_cost*qi.quantity),0)
    into v_quote,v_cost
    from public.quotation_items qi
    join public.quotations q on q.id=qi.quotation_id
    where q.project_id=p_project_id and q.status<>'rejected';
  else
    select coalesce(sum(ps.customer_price*ps.quantity),0),
           coalesce(sum(ps.internal_cost*ps.quantity),0)
    into v_quote,v_cost
    from public.project_services ps where ps.project_id=p_project_id;

    v_quote:=v_quote + coalesce((select sum(coalesce(vb.client_price,0))
      from public.vendor_bookings vb where vb.project_id=p_project_id),0);
  end if;

  v_cost:=v_cost
    +coalesce((select sum(coalesce(vb.quoted_cost,0)) from public.vendor_bookings vb where vb.project_id=p_project_id),0)
    +coalesce((select sum(coalesce(pc.quantity,1)*coalesce(pc.unit_cost,0)) from public.production_costs pc where pc.project_id=p_project_id),0)
    +coalesce((select sum(coalesce(pe.amount,0)) from public.project_expenses pe where pe.project_id=p_project_id),0)
    +coalesce((select sum(coalesce(pt.rate,0)) from public.project_team pt where pt.project_id=p_project_id),0);

  update public.projects
  set quoted_total=v_quote, internal_cost=v_cost
  where id=p_project_id and organization_id=v_org;
end;
$$;

create index if not exists idx_event_functions_event_date on public.event_functions(event_date);
create index if not exists idx_vendor_bookings_project_function on public.vendor_bookings(project_id,function_id);
create index if not exists idx_project_services_project_function on public.project_services(project_id,function_id);
create index if not exists idx_project_team_project_function on public.project_team(project_id,function_id);
create index if not exists idx_production_costs_project_function on public.production_costs(project_id,function_id);
create index if not exists idx_production_jobs_project_function_due on public.production_jobs(project_id,function_id,due_date);
create index if not exists idx_reminders_project_function_due_status on public.reminders(project_id,function_id,due_at,status);
create index if not exists idx_event_files_project_function on public.event_files(project_id,function_id);
create index if not exists idx_payments_project_date on public.payments(project_id,payment_date);
create index if not exists idx_project_expenses_project_date on public.project_expenses(project_id,expense_date);

revoke execute on function public.apply_customer_advance(uuid,numeric,text,text) from public, anon;
revoke execute on function public.apply_vendor_payment(uuid,numeric,text,text,boolean) from public, anon;
revoke execute on function public.bootstrap_workspace(text,text) from public, anon;
revoke execute on function public.check_event_date_conflicts(date,uuid) from public, anon;
revoke execute on function public.enforce_inquiry_booking_status() from public, anon, authenticated;
revoke execute on function public.enforce_project_booking_status() from public, anon, authenticated;
revoke execute on function public.my_org_id() from public, anon, authenticated;
revoke execute on function public.project_financial_snapshot(uuid) from public, anon;
revoke execute on function public.refresh_project_financials(uuid) from public, anon;
revoke execute on function public.save_project_service_scope(uuid,jsonb) from public, anon;
revoke execute on function public.set_project_event_code() from public, anon, authenticated;

grant execute on function public.apply_customer_advance(uuid,numeric,text,text) to authenticated;
grant execute on function public.apply_vendor_payment(uuid,numeric,text,text,boolean) to authenticated;
grant execute on function public.bootstrap_workspace(text,text) to authenticated;
grant execute on function public.check_event_date_conflicts(date,uuid) to authenticated;
grant execute on function public.project_financial_snapshot(uuid) to authenticated;
grant execute on function public.refresh_project_financials(uuid) to authenticated;
grant execute on function public.save_project_service_scope(uuid,jsonb) to authenticated;

alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
