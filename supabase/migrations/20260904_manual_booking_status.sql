-- Booking status is controlled manually by the business owner.
-- Customer advances remain financial records only and do not automatically
-- change an inquiry/project to booked.

drop trigger if exists trg_enforce_inquiry_booking_status on public.inquiries;
drop trigger if exists trg_enforce_project_booking_status on public.projects;
drop function if exists public.enforce_inquiry_booking_status();
drop function if exists public.enforce_project_booking_status();

create or replace function public.apply_customer_advance(p_project_id uuid,p_amount numeric,p_method text default null,p_reference text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_total numeric; v_received numeric; v_reserve numeric; v_customer uuid;
begin
  v_org:=public.my_org_id();
  if v_org is null then raise exception 'No workspace'; end if;
  select quoted_total,customer_id,customer_advance into v_total,v_customer,v_received
  from public.projects where id=p_project_id and organization_id=v_org for update;
  if not found then raise exception 'Project not found'; end if;
  if coalesce(v_total,0)<=0 then raise exception 'Add a customer quotation before collecting a booking advance'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Advance must be greater than zero'; end if;
  v_received:=coalesce(v_received,0)+p_amount;
  v_reserve:=v_received*0.15;
  insert into public.payments(organization_id,project_id,direction,party_type,party_id,amount,payment_date,method,reference,notes)
  values(v_org,p_project_id,'in','customer',v_customer,p_amount,current_date,p_method,p_reference,'Advance payment');
  update public.projects set customer_advance=v_received,vendor_reserve=v_reserve
  where id=p_project_id and organization_id=v_org;
  return jsonb_build_object('received',v_received,'required',v_total*0.30,'vendor_reserve',v_reserve,'booked',false,'status_managed_manually',true);
end $$;
