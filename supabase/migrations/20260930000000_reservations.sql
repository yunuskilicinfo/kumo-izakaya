-- ============================================================================
-- Kumo Izakaya — rezervasyon sistemi (Supabase, Postgres 17)
-- Canlı projeye 5 ayrı migration olarak uygulandı; burada nihai hâli tek dosyada.
-- Yeni bir projeye kurmak için bu dosyayı SQL Editor'da çalıştırın (cron bölümü
-- için Vault + pg_cron + pg_net gerekir; proje URL'sini aşağıda değiştirin).
-- ============================================================================

-- ---------- Tablolar ----------
create table public.settings (
  id int primary key default 1 check (id = 1),
  hall_capacity int not null default 30 check (hall_capacity > 0),
  private_capacity int not null default 8 check (private_capacity > 0),
  seating_minutes int not null default 120 check (seating_minutes >= 30),
  slot_minutes int not null default 30 check (slot_minutes >= 15),
  min_lead_minutes int not null default 120 check (min_lead_minutes >= 0),
  horizon_days int not null default 60 check (horizon_days > 0),
  max_party_hall int not null default 6 check (max_party_hall > 0),
  max_party_private int not null default 8 check (max_party_private > 0),
  restaurant_email text,
  timezone text not null default 'Europe/Istanbul'
);
insert into public.settings default values;

create table public.opening_hours (
  weekday int primary key check (weekday between 0 and 6), -- 0 = Pazar (extract(dow))
  is_closed boolean not null default false,
  first_seating time,
  last_seating time
);
insert into public.opening_hours (weekday, is_closed, first_seating, last_seating) values
  (0, true,  null, null), (1, true,  null, null),
  (2, false, '18:00', '22:00'), (3, false, '18:00', '22:00'), (4, false, '18:00', '22:00'),
  (5, false, '18:00', '22:00'), (6, false, '18:00', '22:00');

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  area text not null default 'all' check (area in ('all','hall','private')),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
create index closures_date_idx on public.closures (date);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','no_show','completed')),
  area text not null check (area in ('hall','private')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  party_size int not null check (party_size >= 1),
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  email text check (char_length(email) <= 200),
  note text check (char_length(note) <= 500),
  lang text not null default 'tr' check (lang in ('tr','en')),
  source text not null default 'web' check (source in ('web','admin')),
  cancel_token_hash text,
  reminder_sent_at timestamptz,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('customer','admin')),
  check (ends_at > starts_at)
);
create index reservations_area_start_idx on public.reservations (area, starts_at) where status = 'confirmed';
create index reservations_start_idx on public.reservations (starts_at);
create index reservations_token_idx on public.reservations (cancel_token_hash);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- ---------- Admin yardımcısı ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------- RLS ----------
alter table public.settings enable row level security;
alter table public.opening_hours enable row level security;
alter table public.closures enable row level security;
alter table public.reservations enable row level security;
alter table public.admin_users enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.settings, public.opening_hours, public.closures, public.reservations,
              public.admin_users, public.rate_limits from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;
grant select on public.admin_users to authenticated;
grant select, update on public.settings to authenticated;
grant select, update on public.opening_hours to authenticated;
grant select, insert, update, delete on public.closures to authenticated;
grant select on public.reservations to authenticated;

create policy admin_users_self on public.admin_users for select to authenticated using (user_id = auth.uid());
create policy settings_admin_select on public.settings for select to authenticated using (public.is_admin());
create policy settings_admin_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hours_admin_select on public.opening_hours for select to authenticated using (public.is_admin());
create policy hours_admin_update on public.opening_hours for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy closures_admin_all on public.closures for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reservations_admin_select on public.reservations for select to authenticated using (public.is_admin());

-- ---------- Kapasite mantığı (tek doğruluk kaynağı) ----------
-- döner: ok | invalid | closed | lead | horizon | party | full
create or replace function public.slot_status(p_start timestamptz, p_party int, p_area text)
returns text
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  s public.settings%rowtype; oh public.opening_hours%rowtype;
  local_ts timestamp; d date; t time; cap int; max_party int; slice timestamptz; load int;
begin
  select * into s from public.settings where id = 1;
  if p_area not in ('hall','private') then return 'invalid'; end if;

  local_ts := p_start at time zone s.timezone;
  d := local_ts::date; t := local_ts::time;

  select * into oh from public.opening_hours where weekday = extract(dow from d)::int;
  if oh.is_closed or oh.first_seating is null
     or t < oh.first_seating or t > oh.last_seating
     or (extract(epoch from (t - oh.first_seating))::int % (s.slot_minutes * 60)) <> 0 then
    return 'closed';
  end if;
  if exists (select 1 from public.closures c where c.date = d and c.area in ('all', p_area)) then
    return 'closed';
  end if;

  if p_start < now() + make_interval(mins => s.min_lead_minutes) then return 'lead'; end if;
  if p_start > now() + make_interval(days => s.horizon_days) then return 'horizon'; end if;

  if p_area = 'hall' then cap := s.hall_capacity; max_party := s.max_party_hall;
  else cap := s.private_capacity; max_party := s.max_party_private; end if;
  if p_party < 1 or p_party > max_party then return 'party'; end if;

  for slice in
    select generate_series(p_start, p_start + make_interval(mins => s.seating_minutes - s.slot_minutes),
                           make_interval(mins => s.slot_minutes))
  loop
    select coalesce(sum(party_size), 0) into load from public.reservations
      where status = 'confirmed' and area = p_area and starts_at <= slice and ends_at > slice;
    if load + p_party > cap then return 'full'; end if;
  end loop;
  return 'ok';
end $$;

create or replace function public.get_availability(p_date date, p_party int, p_area text)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  s public.settings%rowtype; oh public.opening_hours%rowtype;
  t time; st timestamptz; r text; out jsonb := '[]'::jsonb;
begin
  select * into s from public.settings where id = 1;
  if p_area not in ('hall','private') then return jsonb_build_object('closed', true, 'slots', '[]'::jsonb); end if;
  select * into oh from public.opening_hours where weekday = extract(dow from p_date)::int;
  if oh.is_closed or oh.first_seating is null
     or exists (select 1 from public.closures c where c.date = p_date and c.area in ('all', p_area)) then
    return jsonb_build_object('closed', true, 'slots', '[]'::jsonb);
  end if;
  t := oh.first_seating;
  while t <= oh.last_seating loop
    st := (p_date + t) at time zone s.timezone;
    r := public.slot_status(st, p_party, p_area);
    out := out || jsonb_build_object('time', to_char(t, 'HH24:MI'), 'starts_at', st, 'available', r = 'ok', 'reason', r);
    t := t + make_interval(mins => s.slot_minutes);
    exit when t < oh.first_seating; -- gece yarısını aştı
  end loop;
  return jsonb_build_object('closed', false, 'slots', out);
end $$;

-- Atomik rezervasyon: alan başına seri hâle getirilir (son yere iki kişi aynı anda basamaz).
-- p_force = yönetici geçersiz kılması (tüm kuralları atlar).
create or replace function public.create_reservation(
  p_start timestamptz, p_party int, p_area text,
  p_name text, p_phone text, p_email text, p_note text, p_lang text,
  p_token_hash text, p_source text default 'web', p_force boolean default false,
  p_consent boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  s public.settings%rowtype; st text; local_date date; phone_norm text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text; v_id uuid; v_end timestamptz; i int;
begin
  select * into s from public.settings where id = 1;
  if p_area not in ('hall','private') then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;

  perform pg_advisory_xact_lock(hashtext('kumo-res-' || p_area));

  if not p_force then
    st := public.slot_status(p_start, p_party, p_area);
    if st <> 'ok' then return jsonb_build_object('ok', false, 'reason', st); end if;

    local_date := (p_start at time zone s.timezone)::date;
    phone_norm := right(regexp_replace(p_phone, '\D', '', 'g'), 10); -- "0555…", "+90 555…", "555…" eşleşir
    if exists (
      select 1 from public.reservations r
      where r.status = 'confirmed'
        and right(regexp_replace(r.phone, '\D', '', 'g'), 10) = phone_norm
        and (r.starts_at at time zone s.timezone)::date = local_date
    ) then
      return jsonb_build_object('ok', false, 'reason', 'duplicate');
    end if;
  end if;

  v_end := p_start + make_interval(mins => s.seating_minutes);
  loop
    v_code := 'KM-';
    for i in 1..4 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations
    (code, area, starts_at, ends_at, party_size, name, phone, email, note, lang, source, cancel_token_hash, consent_at)
  values
    (v_code, p_area, p_start, v_end, p_party, trim(p_name), trim(p_phone),
     nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_note, '')), ''),
     coalesce(p_lang, 'tr'), coalesce(p_source, 'web'), p_token_hash, case when p_consent then now() end)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'code', v_code, 'starts_at', p_start,
                            'ends_at', v_end, 'area', p_area, 'party_size', p_party);
end $$;

create or replace function public.get_reservation_by_token(p_hash text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce((
    select jsonb_build_object('code', code, 'status', status, 'area', area, 'starts_at', starts_at,
      'party_size', party_size, 'name', name, 'lang', lang,
      'cancellable', status = 'confirmed' and starts_at > now())
    from public.reservations where cancel_token_hash = p_hash and p_hash is not null and p_hash <> ''
  ), jsonb_build_object('error', 'not_found'));
$$;

create or replace function public.cancel_reservation_by_token(p_hash text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.reservations%rowtype;
begin
  if p_hash is null or p_hash = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into r from public.reservations where cancel_token_hash = p_hash for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'not_active', 'status', r.status); end if;
  if r.starts_at <= now() then return jsonb_build_object('ok', false, 'reason', 'past'); end if;
  update public.reservations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer' where id = r.id;
  return jsonb_build_object('ok', true, 'id', r.id, 'code', r.code, 'name', r.name, 'email', r.email,
    'phone', r.phone, 'lang', r.lang, 'area', r.area, 'starts_at', r.starts_at, 'party_size', r.party_size);
end $$;

create or replace function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare w timestamptz; c int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;
  return c <= p_max;
end $$;

-- 24 saat hatırlatması: >24 saat önceden alınmış, 24 saat içinde başlayan rezervasyonları atomik "sahiplenir".
create or replace function public.claim_reminders()
returns setof public.reservations
language sql security definer set search_path = public, pg_temp
as $$
  update public.reservations r set reminder_sent_at = now()
   where r.id in (
     select id from public.reservations
      where status = 'confirmed' and reminder_sent_at is null and email is not null
        and starts_at > now() and starts_at <= now() + interval '24 hours'
        and created_at <= starts_at - interval '24 hours'
      for update skip locked)
  returning r.*;
$$;

-- Yardımcı fonksiyonlara yalnızca service_role (Edge Function) erişir.
revoke all on function public.slot_status(timestamptz, int, text) from public, anon, authenticated;
revoke all on function public.get_availability(date, int, text) from public, anon, authenticated;
revoke all on function public.create_reservation(timestamptz, int, text, text, text, text, text, text, text, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.get_reservation_by_token(text) from public, anon, authenticated;
revoke all on function public.cancel_reservation_by_token(text) from public, anon, authenticated;
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke all on function public.claim_reminders() from public, anon, authenticated;
grant execute on function public.slot_status(timestamptz, int, text) to service_role;
grant execute on function public.get_availability(date, int, text) to service_role;
grant execute on function public.create_reservation(timestamptz, int, text, text, text, text, text, text, text, text, boolean, boolean) to service_role;
grant execute on function public.get_reservation_by_token(text) to service_role;
grant execute on function public.cancel_reservation_by_token(text) to service_role;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant execute on function public.claim_reminders() to service_role;

-- ---------- Zamanlanmış işler ----------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Rastgele cron sırrı Vault'a yazılır; AYNI değer Edge Function secret'ı CRON_SECRET olarak girilmelidir.
select vault.create_secret(
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'cron_secret', 'Edge Function /reminders çağrısı için paylaşılan sır')
where not exists (select 1 from vault.secrets where name = 'cron_secret');

select cron.schedule('kumo-send-reminders', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://qcvcvbugvbpxyimeonuf.supabase.co/functions/v1/booking/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$job$);

select cron.schedule('kumo-cleanup-rate-limits', '17 3 * * *',
  $job$ delete from public.rate_limits where window_start < now() - interval '1 day' $job$);

-- KVKK aydınlatma metniyle uyumlu: rezervasyon kayıtları tarihinden 12 ay sonra silinir.
select cron.schedule('kumo-retention-cleanup', '43 3 * * *',
  $job$ delete from public.reservations where starts_at < now() - interval '12 months' $job$);
