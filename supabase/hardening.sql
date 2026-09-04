-- Rachna OS hardening layer
-- Mirrors the live hardening migration applied to Supabase.

create index if not exists idx_event_functions_date on public.event_functions (event_date) where event_date is not null;
create index if not exists idx_vendor_bookings_project on public.vendor_bookings (project_id);
create index if not exists idx_project_team_project_function on public.project_team (project_id,function_id);
create index if not exists idx_production_costs_project on public.production_costs (project_id);
create index if not exists idx_production_jobs_project_stage on public.production_jobs (project_id,stage);
create index if not exists idx_event_files_project on public.event_files (project_id);
create index if not exists idx_reminders_open_due on public.reminders (status,due_at) where status='open';

create or replace function public.check_event_date_conflicts(p_event_date date,p_exclude_project_id uuid default null)
returns table(function_id uuid,project_id uuid,event_name text,function_name text,venue text,start_time time,guest_count integer)
language sql security definer set search_path=public as $$
  select ef.id, p.id, p.name, ef.name, ef.venue, ef.start_time, ef.guest_count
  from public.event_functions ef join public.projects p on p.id=ef.project_id
  where p.organization_id=public.my_org_id() and ef.event_date=p_event_date
    and (p_exclude_project_id is null or p.id<>p_exclude_project_id)
  order by ef.start_time nulls last, p.name, ef.name;
$$;
revoke all on function public.check_event_date_conflicts(date,uuid) from public;
grant execute on function public.check_event_date_conflicts(date,uuid) to authenticated;

create or replace function public.project_financial_snapshot(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_total numeric:=0; v_cost numeric:=0; v_paid numeric:=0; v_out numeric:=0; v_balance numeric:=0; v_profit numeric:=0; v_status text;
begin
  v_org:=public.my_org_id(); if v_org is null then raise exception 'No workspace'; end if;
  if not exists(select 1 from public.projects where id=p_project_id and organization_id=v_org) then raise exception 'Project not found'; end if;
  perform public.refresh_project_financials(p_project_id);
  select quoted_total,internal_cost,customer_advance,status into v_total,v_cost,v_paid,v_status from public.projects where id=p_project_id and organization_id=v_org;
  select coalesce(sum(amount),0) into v_out from public.payments where project_id=p_project_id and direction='out';
  v_balance:=greatest(v_total-v_paid,0); v_profit:=v_total-v_cost;
  return jsonb_build_object('quoted_total',v_total,'internal_cost',v_cost,'customer_received',v_paid,'customer_balance',v_balance,'cash_out',v_out,'estimated_profit',v_profit,'margin_pct',case when v_total>0 then round((v_profit/v_total)*100,2) else 0 end,'booked',v_status='booked','status',v_status);
end; $$;
revoke all on function public.project_financial_snapshot(uuid) from public;
grant execute on function public.project_financial_snapshot(uuid) to authenticated;

-- Vendor payment integrity: positive amounts, no overpayment, payable stays synchronized.
create or replace function public.apply_vendor_payment(p_vendor_booking_id uuid,p_amount numeric,p_method text default null,p_reference text default null,p_is_advance boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_project uuid; v_vendor uuid; v_cost numeric; v_adv numeric; v_final numeric;
begin
  v_org:=public.my_org_id(); if v_org is null then raise exception 'No workspace'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Payment must be greater than zero'; end if;
  select vb.project_id,vb.vendor_id,coalesce(vb.quoted_cost,0),coalesce(vb.advance_paid,0),coalesce(vb.final_paid,0) into v_project,v_vendor,v_cost,v_adv,v_final
  from public.vendor_bookings vb join public.projects p on p.id=vb.project_id
  where vb.id=p_vendor_booking_id and p.organization_id=v_org for update;
  if not found then raise exception 'Vendor booking not found'; end if;
  if v_cost<=0 then raise exception 'Set vendor cost before recording payment'; end if;
  if p_is_advance and v_adv+p_amount>v_cost then raise exception 'Vendor advance exceeds vendor cost'; end if;
  if not p_is_advance and v_adv+v_final+p_amount>v_cost then raise exception 'Vendor payment exceeds vendor cost'; end if;
  if p_is_advance then v_adv:=v_adv+p_amount; else v_final:=v_final+p_amount; end if;
  insert into public.payments(organization_id,project_id,direction,party_type,party_id,amount,payment_date,method,reference,notes)
  values(v_org,v_project,'out','vendor',v_vendor,p_amount,current_date,p_method,p_reference,case when p_is_advance then 'Vendor advance' else 'Vendor final payment' end);
  update public.vendor_bookings set advance_paid=v_adv,final_paid=v_final,payable=greatest(v_cost-v_adv-v_final,0),status=case when v_adv+v_final>=v_cost then 'paid' else 'reserved' end where id=p_vendor_booking_id;
  perform public.refresh_project_financials(v_project);
  return jsonb_build_object('vendor_booking_id',p_vendor_booking_id,'advance_paid',v_adv,'final_paid',v_final,'remaining',greatest(v_cost-v_adv-v_final,0));
end $$;
revoke all on function public.apply_vendor_payment(uuid,numeric,text,text,boolean) from public;
grant execute on function public.apply_vendor_payment(uuid,numeric,text,text,boolean) to authenticated;

revoke execute on function public.apply_customer_advance(uuid,numeric,text,text) from public;
grant execute on function public.apply_customer_advance(uuid,numeric,text,text) to authenticated;
revoke execute on function public.bootstrap_workspace(text,text) from public;
grant execute on function public.bootstrap_workspace(text,text) to authenticated;
revoke execute on function public.save_project_service_scope(uuid,jsonb) from public;
grant execute on function public.save_project_service_scope(uuid,jsonb) to authenticated;
revoke execute on function public.refresh_project_financials(uuid) from public;
grant execute on function public.refresh_project_financials(uuid) to authenticated;
revoke execute on function public.my_org_id() from public;
grant execute on function public.my_org_id() to authenticated;
