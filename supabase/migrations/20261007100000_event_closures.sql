-- ============================================================================
-- Kumo Izakaya — etkinlik için açılan kapalı gün, etkinliğe bağlanır.
-- Etkinlik iptal edilince (status → cancelled) ya da silinince bağlı kapalı gün
-- kaydı da kalkar; normal rezervasyon o gün yeniden açılır.
-- ============================================================================
alter table public.closures add column event_id uuid references public.events(id) on delete cascade;
create index closures_event_idx on public.closures (event_id) where event_id is not null;

create or replace function public.event_cancel_closures()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  delete from public.closures where event_id = new.id;
  return new;
end $$;
revoke all on function public.event_cancel_closures() from public, anon, authenticated;
create trigger events_cancel_closures after update of status on public.events
  for each row when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.event_cancel_closures();
