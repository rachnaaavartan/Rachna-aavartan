begin;
drop trigger if exists trg_projects_set_event_code on public.projects;
create trigger trg_projects_set_event_code before insert on public.projects for each row execute function public.set_project_event_code();
commit;
