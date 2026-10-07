-- ============================================================================
-- Kumo Izakaya — üyelik: profil, üye rezervasyonu, sadakat damgası, üyelere
-- özel akşamlar. 20260930000000_reservations.sql'in üstüne uygulanır.
-- Üyeler tablolara doğrudan erişmez: tüm üye işlemleri Edge Function "booking"
-- (service role) üzerinden yapılır. Yönetici RLS ile okur (is_admin()).
-- ============================================================================

-- ---------- Profil ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 100),
  phone text check (char_length(phone) <= 30),
  birth_month smallint check (birth_month between 1 and 12),
  birth_day smallint check (birth_day between 1 and 31),
  lang text not null default 'tr' check (lang in ('tr','en')),
  marketing_consent_at timestamptz,
  marketing_revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  check ((birth_month is null) = (birth_day is null))
);

-- auth.users'a eklenen her hesap için profil açılır (Google adı varsa doldurulur).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          nullif(left(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), 100), ''))
  on conflict (id) do nothing;
  return new;
end $$;
create or replace function public.handle_user_email()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
create trigger on_auth_user_email after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.handle_user_email();

insert into public.profiles (id, email) select id, email from auth.users on conflict (id) do nothing;

-- ---------- Rezervasyon ↔ üye ----------
alter table public.reservations add column user_id uuid references public.profiles(id) on delete set null;
create index reservations_user_idx on public.reservations (user_id, starts_at) where user_id is not null;

-- ---------- Ayarlar ----------
alter table public.settings
  add column member_horizon_days int not null default 90 check (member_horizon_days > 0),
  add column stamps_per_reward int not null default 5 check (stamps_per_reward between 1 and 50),
  add column reward_text_tr text not null default 'Şefin ikramı: kanmi (tatlı) ve bir kadeh sake' check (char_length(reward_text_tr) <= 200),
  add column reward_text_en text not null default 'On the chef: kanmi (dessert) and a glass of sake' check (char_length(reward_text_en) <= 200);

-- ---------- Sadakat ----------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  status text not null default 'issued' check (status in ('issued','redeemed')),
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_reservation_id uuid references public.reservations(id) on delete set null
);
create index rewards_user_idx on public.rewards (user_id);

-- Rezervasyonlar 12 ayda silinse de damga kalır (reservation_id null olur).
create table public.loyalty_stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reservation_id uuid unique references public.reservations(id) on delete set null,
  reward_id uuid references public.rewards(id) on delete set null,
  created_at timestamptz not null default now()
);
create index loyalty_stamps_user_idx on public.loyalty_stamps (user_id) where reward_id is null;

-- "Tamamlandı" = 1 damga. Yeterli damga birikince ödül kuponu üretilir.
-- "Tamamlandı"dan geri alınırsa, henüz ödüle dönüşmemiş damga silinir.
create or replace function public.loyalty_on_status()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  need int; n int; v_reward uuid; v_code text; i int;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if new.user_id is null or new.status is not distinct from old.status then return new; end if;
  perform pg_advisory_xact_lock(hashtext('kumo-loyalty-' || new.user_id));
  if new.status = 'completed' then
    insert into public.loyalty_stamps (user_id, reservation_id) values (new.user_id, new.id)
      on conflict (reservation_id) do nothing;
    select stamps_per_reward into need from public.settings where id = 1;
    select count(*) into n from public.loyalty_stamps where user_id = new.user_id and reward_id is null;
    if n >= need then
      loop
        v_code := 'KR-';
        for i in 1..4 loop
          v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
        end loop;
        exit when not exists (select 1 from public.rewards where code = v_code);
      end loop;
      insert into public.rewards (user_id, code) values (new.user_id, v_code) returning id into v_reward;
      update public.loyalty_stamps set reward_id = v_reward
       where id in (select id from public.loyalty_stamps
                     where user_id = new.user_id and reward_id is null
                     order by created_at limit need);
    end if;
  elsif old.status = 'completed' then
    delete from public.loyalty_stamps where reservation_id = new.id and reward_id is null;
  end if;
  return new;
end $$;
revoke all on function public.loyalty_on_status() from public, anon, authenticated;
create trigger reservations_loyalty after update of status on public.reservations
  for each row execute function public.loyalty_on_status();

-- ---------- Üyelere özel akşamlar ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title_tr text not null check (char_length(title_tr) between 1 and 120),
  title_en text check (char_length(title_en) <= 120),
  body_tr text check (char_length(body_tr) <= 1500),
  body_en text check (char_length(body_en) <= 1500),
  price_note_tr text check (char_length(price_note_tr) <= 120),
  price_note_en text check (char_length(price_note_en) <= 120),
  starts_at timestamptz not null,
  capacity int not null check (capacity between 1 and 500),
  max_party int not null default 4 check (max_party between 1 and 50),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now()
);
create index events_start_idx on public.events (starts_at);

create table public.event_bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  party_size int not null check (party_size >= 1),
  note text check (char_length(note) <= 300),
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index event_bookings_one_per_user on public.event_bookings (event_id, user_id) where status = 'confirmed';
create index event_bookings_event_idx on public.event_bookings (event_id) where status = 'confirmed';

-- Etkinlik başına seri hâle getirilir (son koltuğa iki kişi aynı anda basamaz).
create or replace function public.book_event(p_event uuid, p_user uuid, p_party int, p_note text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare e public.events%rowtype; taken int; v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('kumo-evt-' || p_event));
  select * into e from public.events where id = p_event;
  if not found or e.status <> 'published' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if e.starts_at <= now() then return jsonb_build_object('ok', false, 'reason', 'past'); end if;
  if p_party < 1 or p_party > e.max_party then return jsonb_build_object('ok', false, 'reason', 'party'); end if;
  if exists (select 1 from public.event_bookings where event_id = p_event and user_id = p_user and status = 'confirmed') then
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
  end if;
  select coalesce(sum(party_size), 0) into taken from public.event_bookings where event_id = p_event and status = 'confirmed';
  if taken + p_party > e.capacity then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
  insert into public.event_bookings (event_id, user_id, party_size, note)
    values (p_event, p_user, p_party, nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Üyenin gördüğü etkinlik listesi: yayındaki gelecek akşamlar + kalan yer + kendi kaydı.
create or replace function public.member_events(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x order by x->>'starts_at'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', e.id, 'title_tr', e.title_tr, 'title_en', e.title_en, 'body_tr', e.body_tr, 'body_en', e.body_en,
      'price_note_tr', e.price_note_tr, 'price_note_en', e.price_note_en, 'starts_at', e.starts_at,
      'max_party', e.max_party,
      'seats_left', greatest(e.capacity - coalesce((select sum(b.party_size) from public.event_bookings b
                     where b.event_id = e.id and b.status = 'confirmed'), 0), 0),
      'mine', (select jsonb_build_object('id', b.id, 'party_size', b.party_size) from public.event_bookings b
                where b.event_id = e.id and b.user_id = p_user and b.status = 'confirmed')) x
    from public.events e
    where e.status = 'published' and e.starts_at > now()
  ) s;
$$;

-- ---------- Kapasite fonksiyonları: üyeye daha uzun ileri tarih ----------
drop function public.get_availability(date, int, text);
drop function public.create_reservation(timestamptz, int, text, text, text, text, text, text, text, text, boolean, boolean);
drop function public.slot_status(timestamptz, int, text);

-- döner: ok | invalid | closed | lead | horizon | party | full
create or replace function public.slot_status(p_start timestamptz, p_party int, p_area text, p_member boolean default false)
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
  if p_start > now() + make_interval(days => case when p_member then greatest(s.member_horizon_days, s.horizon_days)
                                                   else s.horizon_days end) then
    return 'horizon';
  end if;

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

create or replace function public.get_availability(p_date date, p_party int, p_area text, p_member boolean default false)
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
    r := public.slot_status(st, p_party, p_area, p_member);
    out := out || jsonb_build_object('time', to_char(t, 'HH24:MI'), 'starts_at', st, 'available', r = 'ok', 'reason', r);
    t := t + make_interval(mins => s.slot_minutes);
    exit when t < oh.first_seating; -- gece yarısını aştı
  end loop;
  return jsonb_build_object('closed', false, 'slots', out);
end $$;

-- p_user_id doluysa üye rezervasyonu: üye ileri tarih sınırı uygulanır ve hesaba bağlanır.
create or replace function public.create_reservation(
  p_start timestamptz, p_party int, p_area text,
  p_name text, p_phone text, p_email text, p_note text, p_lang text,
  p_token_hash text, p_source text default 'web', p_force boolean default false,
  p_consent boolean default false, p_user_id uuid default null)
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
    st := public.slot_status(p_start, p_party, p_area, p_user_id is not null);
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
    (code, area, starts_at, ends_at, party_size, name, phone, email, note, lang, source, cancel_token_hash, consent_at, user_id)
  values
    (v_code, p_area, p_start, v_end, p_party, trim(p_name), trim(p_phone),
     nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_note, '')), ''),
     coalesce(p_lang, 'tr'), coalesce(p_source, 'web'), p_token_hash, case when p_consent then now() end, p_user_id)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'code', v_code, 'starts_at', p_start,
                            'ends_at', v_end, 'area', p_area, 'party_size', p_party);
end $$;

-- ---------- Yetkiler ----------
alter table public.profiles enable row level security;
alter table public.rewards enable row level security;
alter table public.loyalty_stamps enable row level security;
alter table public.events enable row level security;
alter table public.event_bookings enable row level security;

revoke all on public.profiles, public.rewards, public.loyalty_stamps, public.events, public.event_bookings
  from anon, authenticated;
grant select on public.profiles, public.rewards, public.loyalty_stamps, public.event_bookings to authenticated;
grant select, insert, update on public.events to authenticated;
grant update (status) on public.event_bookings to authenticated;

create policy profiles_admin_select on public.profiles for select to authenticated using (public.is_admin());
create policy rewards_admin_select on public.rewards for select to authenticated using (public.is_admin());
create policy stamps_admin_select on public.loyalty_stamps for select to authenticated using (public.is_admin());
create policy events_admin_select on public.events for select to authenticated using (public.is_admin());
create policy events_admin_insert on public.events for insert to authenticated with check (public.is_admin());
create policy events_admin_update on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy event_bookings_admin_select on public.event_bookings for select to authenticated using (public.is_admin());
create policy event_bookings_admin_update on public.event_bookings for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.slot_status(timestamptz, int, text, boolean) from public, anon, authenticated;
revoke all on function public.get_availability(date, int, text, boolean) from public, anon, authenticated;
revoke all on function public.create_reservation(timestamptz, int, text, text, text, text, text, text, text, text, boolean, boolean, uuid) from public, anon, authenticated;
revoke all on function public.book_event(uuid, uuid, int, text) from public, anon, authenticated;
revoke all on function public.member_events(uuid) from public, anon, authenticated;
grant execute on function public.slot_status(timestamptz, int, text, boolean) to service_role;
grant execute on function public.get_availability(date, int, text, boolean) to service_role;
grant execute on function public.create_reservation(timestamptz, int, text, text, text, text, text, text, text, text, boolean, boolean, uuid) to service_role;
grant execute on function public.book_event(uuid, uuid, int, text) to service_role;
grant execute on function public.member_events(uuid) to service_role;

-- ---------- Saklama (KVKK metniyle uyumlu) ----------
select cron.schedule('kumo-events-retention', '51 3 * * *',
  $job$ delete from public.events where starts_at < now() - interval '12 months' $job$);
-- 24 ay boyunca hiç giriş yapmamış üye hesapları silinir (yöneticiler hariç).
select cron.schedule('kumo-inactive-members', '13 4 * * *', $job$
  delete from auth.users u
   using public.profiles p
   where p.id = u.id
     and coalesce(p.last_seen_at, p.created_at) < now() - interval '24 months'
     and not exists (select 1 from public.admin_users a where a.user_id = u.id)
$job$);
