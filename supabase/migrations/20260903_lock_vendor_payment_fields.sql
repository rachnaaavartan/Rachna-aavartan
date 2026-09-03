begin;

create or replace function public.guard_vendor_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'postgres' then
    if tg_op = 'INSERT' then
      if coalesce(new.advance_paid,0) <> 0 or coalesce(new.final_paid,0) <> 0 then
        raise exception 'Vendor payments must be recorded through the payment action';
      end if;
      new.payable := greatest(coalesce(new.quoted_cost,0),0);
      new.status := case when coalesce(new.quoted_cost,0) > 0 then 'reserved' else coalesce(new.status,'reserved') end;
    else
      if new.advance_paid is distinct from old.advance_paid or new.final_paid is distinct from old.final_paid then
        raise exception 'Vendor payments must be recorded through the payment action';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_vendor_payment_fields on public.vendor_bookings;
create trigger trg_guard_vendor_payment_fields
before insert or update on public.vendor_bookings
for each row execute function public.guard_vendor_payment_fields();

revoke execute on function public.guard_vendor_payment_fields() from public, anon, authenticated;

commit;
