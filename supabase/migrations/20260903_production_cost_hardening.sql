alter table public.production_costs drop constraint if exists production_costs_quantity_valid;
alter table public.production_costs drop constraint if exists production_costs_unit_cost_valid;
alter table public.production_costs add constraint production_costs_quantity_valid check (quantity >= 0);
alter table public.production_costs add constraint production_costs_unit_cost_valid check (unit_cost >= 0);
