-- ════════════════════════════════════════════════════════════════════════════
-- "Octagon" — UFC PPV pick'em pool (pool_id 'octagon'), riding on the same
-- pool_members / pool_config machinery as the World Cup pool.
-- Paste-once (or run via `npx supabase db query --linked`). wc2026 untouched,
-- except the two helper functions below get explicitly scoped to their pool.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────

create table ufc_events (
  id          int generated always as identity primary key,
  name        text not null,                 -- 'UFC 323: Dvalishvili vs Yan 2'
  starts_at   timestamptz not null,          -- main-card start = global pick lock
  wiki_slug   text,                          -- 'UFC_323' → assisted grading
  created_at  timestamptz not null default now()
);

create table fights (
  id           int generated always as identity primary key,
  event_id     int not null references ufc_events on delete cascade,
  bout_order   int not null default 1,       -- 1 = main event, counting down the card
  fighter_a    text not null,
  fighter_b    text not null,
  weight_class text,
  rounds       int not null default 3 check (rounds in (3, 5)),
  favorite     text check (favorite in ('a','b')),  -- picking the other side pays +5
  scratched    boolean not null default false,      -- pulled from the card: picks void
  winner       text check (winner in ('a','b','draw','nc')),
  method       text check (method in ('ko','sub','dec')),
  end_round    int check (end_round between 1 and 5),
  updated_at   timestamptz not null default now()
);
create index fights_event on fights (event_id);

create table fight_picks (
  user_id    uuid not null references auth.users on delete cascade,
  fight_id   int not null references fights on delete cascade,
  event_id   int not null references ufc_events on delete cascade, -- trigger-filled
  winner     text not null check (winner in ('a','b')),
  method     text check (method in ('ko','sub','dec')),
  round      int check (round between 1 and 5),
  is_lock    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, fight_id)
);
-- One Lock of the Night per event, enforced by the DB. Swapping = clear old,
-- set new (two updates).
create unique index one_lock_per_event on fight_picks (user_id, event_id)
  where is_lock;

-- event_id is denormalized so RLS/index checks don't need a join per row.
-- DEFINER so the lookup works regardless of the caller's RLS view of fights.
create or replace function set_pick_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select event_id into new.event_id from fights where id = new.fight_id;
  if new.event_id is null then
    raise exception 'unknown fight %', new.fight_id;
  end if;
  return new;
end $$;
create trigger fight_picks_event
  before insert or update of fight_id on fight_picks
  for each row execute function set_pick_event();

-- ── Pool machinery ──────────────────────────────────────────────────────────

insert into pool_config (pool_id, invite_code) values ('octagon', 'octagon')
  on conflict (pool_id) do nothing;

-- Scope the ORIGINAL wc2026 helpers to their pool. Before this, any pool's
-- member passed them — an octagon-only member could read wc matches/predictions.
create or replace function is_pool_member() returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from pool_members
                where user_id = auth.uid() and pool_id = 'wc2026');
$$;
create or replace function is_pool_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from pool_members
                where user_id = auth.uid() and pool_id = 'wc2026' and is_admin);
$$;

-- Pool-scoped helpers for octagon (and any future pool).
create or replace function is_member_of(pool text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from pool_members
                where user_id = auth.uid() and pool_id = pool);
$$;
revoke all on function is_member_of(text) from public;
grant execute on function is_member_of(text) to authenticated;

create or replace function is_admin_of(pool text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from pool_members
                where user_id = auth.uid() and pool_id = pool and is_admin);
$$;
revoke all on function is_admin_of(text) from public;
grant execute on function is_admin_of(text) to authenticated;

-- Overloads of the wc RPCs, dispatched by named args ({pool,code} vs {code}),
-- so the zero/one-arg wc2026 functions and every wc policy stay byte-identical.
create or replace function join_pool(pool text, code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select invite_code = code into ok from pool_config where pool_id = pool;
  if not coalesce(ok, false) then return false; end if;
  insert into pool_members (pool_id, user_id) values (pool, auth.uid())
    on conflict do nothing;
  return true;
end $$;
revoke all on function join_pool(text, text) from public;
grant execute on function join_pool(text, text) to authenticated;

create or replace function get_pool_members(pool text)
returns table (user_id uuid, display_name text, avatar_url text,
               is_admin boolean, joined_at timestamptz)
language sql security definer set search_path = public stable as $$
  select m.user_id, p.display_name, p.avatar_url, m.is_admin, m.joined_at
  from pool_members m
  left join profiles p on p.id = m.user_id
  where m.pool_id = pool
    and exists (select 1 from pool_members me
                where me.user_id = auth.uid() and me.pool_id = pool)
  order by m.joined_at;
$$;
revoke all on function get_pool_members(text) from public;
grant execute on function get_pool_members(text) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table ufc_events  enable row level security;
alter table fights      enable row level security;
alter table fight_picks enable row level security;

create policy ev_select on ufc_events for select using (is_member_of('octagon'));
create policy ev_admin  on ufc_events for all
  using (is_admin_of('octagon')) with check (is_admin_of('octagon'));

create policy f_select on fights for select using (is_member_of('octagon'));
create policy f_admin  on fights for all
  using (is_admin_of('octagon')) with check (is_admin_of('octagon'));

-- Picks: own always; everyone's once the event has started (reveal-after-start).
create policy fp_select on fight_picks for select
  using (
    user_id = auth.uid()
    or (is_member_of('octagon')
        and exists (select 1 from ufc_events e
                    where e.id = event_id and e.starts_at <= now()))
  );
create policy fp_insert_own on fight_picks for insert
  with check (
    user_id = auth.uid()
    and is_member_of('octagon')
    and exists (select 1 from fights f
                join ufc_events e on e.id = f.event_id
                where f.id = fight_id
                  and e.starts_at > now()
                  and not f.scratched)
  );
create policy fp_update_own on fight_picks for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from fights f
                join ufc_events e on e.id = f.event_id
                where f.id = fight_id
                  and e.starts_at > now()
                  and not f.scratched)
  );
-- Pre-start delete of your own pick. Needed so a Lock stranded on a scratched
-- fight (updates there are blocked by the with-check above) can be freed and
-- placed elsewhere before the event starts. Post-start rows are immutable.
create policy fp_delete_own on fight_picks for delete
  using (
    user_id = auth.uid()
    and exists (select 1 from ufc_events e
                where e.id = event_id and e.starts_at > now())
  );

-- ── One-time setup ──────────────────────────────────────────────────────────

-- Auto-onboard the site owner as the octagon admin.
insert into pool_members (pool_id, user_id, is_admin)
select 'octagon', id, true from auth.users where email = 'lucaboemio@gmail.com'
on conflict (pool_id, user_id) do update set is_admin = true;

-- To change the invite code later:
--   update pool_config set invite_code = 'NEW-CODE' where pool_id = 'octagon';
