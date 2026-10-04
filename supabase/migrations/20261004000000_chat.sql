-- Chatbot: yalnızca personele devredilen sohbetler geçici (24 saat) saklanır.
create table public.chat_handoffs (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  lang text not null default 'tr' check (lang in ('tr','en')),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  last_customer_at timestamptz not null default now(),
  last_staff_at timestamptz,
  last_notified_at timestamptz
);
create table public.chat_messages (
  id bigserial primary key,
  handoff_id uuid not null references public.chat_handoffs(id) on delete cascade,
  sender text not null check (sender in ('customer','bot','staff')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index chat_messages_handoff_idx on public.chat_messages (handoff_id, id);

alter table public.chat_handoffs enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.chat_handoffs, public.chat_messages from anon, authenticated;
revoke all on sequence public.chat_messages_id_seq from anon, authenticated;
grant select, update (status) on public.chat_handoffs to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant usage on sequence public.chat_messages_id_seq to authenticated;

create policy chat_handoffs_admin_select on public.chat_handoffs for select to authenticated using (public.is_admin());
create policy chat_handoffs_admin_update on public.chat_handoffs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy chat_messages_admin_select on public.chat_messages for select to authenticated using (public.is_admin());
create policy chat_messages_admin_insert on public.chat_messages for insert to authenticated
  with check (public.is_admin() and sender = 'staff');

-- Personel mesajı eklenince last_staff_at güncellenir (istemciye ek yetki gerekmez).
create or replace function public.chat_touch_staff() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  if new.sender = 'staff' then
    update public.chat_handoffs set last_staff_at = new.created_at where id = new.handoff_id;
  end if;
  return new;
end $$;
create trigger chat_messages_touch after insert on public.chat_messages
  for each row execute function public.chat_touch_staff();

select cron.schedule('kumo-chat-cleanup', '*/30 * * * *',
  $$delete from public.chat_handoffs where created_at < now() - interval '24 hours'$$);

revoke all on function public.chat_touch_staff() from public, anon, authenticated;
