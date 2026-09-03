create or replace function public.apply_vendor_payment(p_vendor_booking_id uuid,p_amount numeric,p_method text default null,p_reference text default null,p_is_advance boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_org uuid; v_project uuid; v_vendor uuid; v_cost numeric; v_adv numeric; v_final numeric; v_pool numeric; v_used numeric;
begin
  v_org:=public.my_org_id(); if v_org is null then raise exception 'No workspace'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Payment must be greater than zero'; end if;
  select vb.project_id,vb.vendor_id,coalesce(vb.quoted_cost,0),coalesce(vb.advance_paid,0),coalesce(vb.final_paid,0),coalesce(p.vendor_reserve,0)
    into v_project,v_vendor,v_cost,v_adv,v_final,v_pool
  from public.vendor_bookings vb
  join public.projects p on p.id=vb.project_id
  where vb.id=p_vendor_booking_id and p.organization_id=v_org
  for update;
  if not found then raise exception 'Vendor booking not found'; end if;
  if v_cost<=0 then raise exception 'Set vendor cost before recording payment'; end if;

  if p_is_advance then
    select coalesce(sum(coalesce(vb2.advance_paid,0)),0) into v_used
    from public.vendor_bookings vb2 where vb2.project_id=v_project and vb2.id<>p_vendor_booking_id;
    if v_used + v_adv + p_amount > v_pool then
      raise exception 'Vendor advance exceeds the reserved vendor pool. Customer reserve available: %', v_pool;
    end if;
    v_adv:=v_adv+p_amount;
  else
    v_final:=v_final+p_amount;
  end if;

  if v_adv+v_final>v_cost then raise exception 'Vendor payment exceeds vendor cost'; end if;

  insert into public.payments(organization_id,project_id,direction,party_type,party_id,amount,payment_date,method,reference,notes)
  values(v_org,v_project,'out','vendor',v_vendor,p_amount,current_date,p_method,p_reference,case when p_is_advance then 'Vendor reserve advance' else 'Vendor final payment' end);
  update public.vendor_bookings set advance_paid=v_adv,final_paid=v_final,payable=greatest(v_cost-v_adv-v_final,0),status=case when v_adv+v_final>=v_cost then 'paid' else 'reserved' end where id=p_vendor_booking_id;
  perform public.refresh_project_financials(v_project);
  return jsonb_build_object('vendor_booking_id',p_vendor_booking_id,'advance_paid',v_adv,'final_paid',v_final,'remaining',greatest(v_cost-v_adv-v_final,0),'vendor_pool',v_pool,'vendor_pool_used',v_used+v_adv);
end $$;
revoke execute on function public.apply_vendor_payment(uuid,numeric,text,text,boolean) from public,anon;
grant execute on function public.apply_vendor_payment(uuid,numeric,text,text,boolean) to authenticated;
