create or replace function public.refresh_project_financials(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_quote numeric := 0;
  v_cost numeric := 0;
  v_quote_id uuid;
begin
  v_org := public.my_org_id();
  if v_org is null then raise exception 'No workspace'; end if;

  select q.id into v_quote_id
  from public.quotations q
  where q.project_id = p_project_id
    and q.status <> 'rejected'
  order by q.version desc, q.created_at desc
  limit 1;

  if v_quote_id is not null then
    select coalesce(sum(qi.customer_price * qi.quantity),0),
           coalesce(sum(qi.internal_cost * qi.quantity),0)
    into v_quote, v_cost
    from public.quotation_items qi
    where qi.quotation_id = v_quote_id;
  else
    select coalesce(sum(ps.customer_price * ps.quantity),0),
           coalesce(sum(ps.internal_cost * ps.quantity),0)
    into v_quote, v_cost
    from public.project_services ps
    where ps.project_id = p_project_id;

    v_quote := v_quote + coalesce((select sum(coalesce(vb.client_price,0))
      from public.vendor_bookings vb where vb.project_id = p_project_id),0);
  end if;

  v_cost := v_cost
    + coalesce((select sum(coalesce(vb.quoted_cost,0)) from public.vendor_bookings vb where vb.project_id = p_project_id),0)
    + coalesce((select sum(coalesce(pc.quantity,1) * coalesce(pc.unit_cost,0)) from public.production_costs pc where pc.project_id = p_project_id),0)
    + coalesce((select sum(coalesce(pe.amount,0)) from public.project_expenses pe where pe.project_id = p_project_id),0)
    + coalesce((select sum(coalesce(pt.rate,0)) from public.project_team pt where pt.project_id = p_project_id),0);

  update public.projects
  set quoted_total = v_quote,
      internal_cost = v_cost
  where id = p_project_id and organization_id = v_org;
end;
$$;

revoke execute on function public.refresh_project_financials(uuid) from public, anon;
grant execute on function public.refresh_project_financials(uuid) to authenticated;
