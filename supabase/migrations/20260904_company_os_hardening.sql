-- Company OS security hardening.
alter function public.validate_event_operation_task() set search_path = public;

-- Keep public client portal actions available; do not expose internal workspace helpers as RPCs.
revoke execute on function public.my_org_id() from anon, authenticated;
revoke execute on function public.get_client_portal(text) from authenticated;

-- These authenticated RPCs are intentionally callable by the signed-in OS because the functions enforce project/org checks.
grant execute on function public.apply_customer_advance(uuid, numeric, text, text) to authenticated;
grant execute on function public.apply_vendor_payment(uuid, numeric, text, text, boolean) to authenticated;
grant execute on function public.bootstrap_workspace(text, text) to authenticated;
grant execute on function public.check_event_date_conflicts(date, uuid) to authenticated;
grant execute on function public.create_client_portal(uuid) to authenticated;
grant execute on function public.save_project_service_scope(uuid, jsonb) to authenticated;

-- Public client portal RPCs stay available for token-authenticated portal visitors.
grant execute on function public.get_client_portal(text) to anon;
grant execute on function public.portal_submit_request(text, text, text) to anon;
