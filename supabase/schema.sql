-- ════════════════════════════════════════════════════════════════════════════
-- World Cup 2026 bracket pool — schema, helpers, RLS
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- ARCHIVED 2026-10-20: the pool is closed and read-only. See the "Archive"
-- section at the bottom for what was switched off and the pool_archive table,
-- and the section after it for the pool-scoped pool_members read policy.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────

create table pool_members (
  pool_id     text not null default 'wc2026',
  user_id     uuid not null references auth.users on delete cascade,
  is_admin    boolean not null default false,
  joined_at   timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create table matches (
  id              int primary key,            -- football-data.org match id
  stage           text not null,              -- 'group','r32','r16','qf','sf','3p','final'
  group_code      text,                       -- 'A'..'L' for group stage
  kickoff_at      timestamptz not null,
  team_a          text,                       -- 3-letter code, null while unresolved
  team_b          text,
  team_a_locked   boolean not null default true,   -- false for KO slots until resolved
  team_b_locked   boolean not null default true,
  result          text check (result in ('a','b','draw')),       -- null until finished
  result_source   text check (result_source in ('api','admin')), -- audit trail
  score_a         int,                             -- running score (live) / final; null pre-match
  score_b         int,
  status          text,                            -- football-data status: TIMED/IN_PLAY/PAUSED/FINISHED…
  city            text,                            -- host city (seeded once from the official schedule;
  venue           text,                            --  the sync never writes these — see seed-venues.sql)
  excluded        boolean not null default false,  -- out of the pool: unpickable, never scored
  updated_at      timestamptz not null default now()
);

create table predictions (
  user_id    uuid not null references auth.users on delete cascade,
  match_id   int  not null references matches on delete cascade,
  pick       text not null check (pick in ('a','b','draw')),
  locked_at  timestamptz,  -- set when the player "locks in"; row becomes immutable
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create table pool_config (
  pool_id     text primary key default 'wc2026',
  invite_code text not null
);
insert into pool_config(pool_id, invite_code) values ('wc2026','REPLACE_ME');

-- ── Helpers (SECURITY DEFINER → bypass RLS, avoid recursion on pool_members) ─

create or replace function is_pool_member() returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from pool_members
                where user_id = auth.uid() and pool_id = 'wc2026');
$$;
revoke all on function is_pool_member() from public;
grant execute on function is_pool_member() to authenticated;

create or replace function is_pool_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from pool_members
                where user_id = auth.uid() and pool_id = 'wc2026' and is_admin);
$$;
revoke all on function is_pool_admin() from public;
grant execute on function is_pool_admin() to authenticated;

-- ── Join RPC: validates the invite code and inserts membership ───────────────

create or replace function join_pool(code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select invite_code = code into ok from pool_config where pool_id = 'wc2026';
  if not coalesce(ok, false) then return false; end if;
  insert into pool_members(pool_id, user_id) values ('wc2026', auth.uid())
    on conflict do nothing;
  return true;
end $$;
revoke all on function join_pool(text) from public;
grant execute on function join_pool(text) to authenticated;

-- ── Roster RPC: member list with display names for the leaderboard ───────────
-- (profiles RLS may not allow cross-user reads; DEFINER sidesteps that.)

create or replace function get_pool_members()
returns table (user_id uuid, display_name text, avatar_url text, is_admin boolean, joined_at timestamptz)
language sql security definer set search_path = public stable as $$
  select m.user_id, p.display_name, p.avatar_url, m.is_admin, m.joined_at
  from pool_members m
  left join profiles p on p.id = m.user_id
  where exists (select 1 from pool_members me where me.user_id = auth.uid())
  order by m.joined_at;
$$;
revoke all on function get_pool_members() from public;
grant execute on function get_pool_members() to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table pool_members enable row level security;
alter table matches      enable row level security;
alter table predictions  enable row level security;
alter table pool_config  enable row level security;

-- pool_members: members read all members. NO insert/update/delete policies →
-- the join_pool RPC (DEFINER) is the only write path. Critical: a direct
-- INSERT policy would let any signed-in user join without the invite code.
create policy pm_select on pool_members for select using (is_pool_member());

-- matches: members read; only admins update via the UI. The Edge Function
-- writes with the service-role key, which bypasses RLS entirely.
create policy m_select       on matches for select using (is_pool_member());
create policy m_update_admin on matches for update
  using (is_pool_admin()) with check (true);

-- predictions: own always; other members' only AFTER kickoff (leaderboard).
create policy p_select on predictions for select
  using (
    user_id = auth.uid()
    or (
      is_pool_member()
      and exists (select 1 from matches m where m.id = match_id and m.kickoff_at <= now())
    )
  );
create policy p_insert_own on predictions for insert
  with check (
    user_id = auth.uid()
    and is_pool_member()
    and exists (select 1 from matches m
                where m.id = match_id
                  and m.kickoff_at > now()
                  and not m.excluded
                  and m.team_a_locked and m.team_b_locked)
  );
-- locked_at is null in USING → once a pick is locked in, the row is immutable
-- (the lock itself is the last permitted update).
create policy p_update_own on predictions for update
  using (user_id = auth.uid() and locked_at is null)
  with check (
    user_id = auth.uid()
    and exists (select 1 from matches m
                where m.id = match_id
                  and m.kickoff_at > now()
                  and not m.excluded)
  );

-- pool_config: invisible from the client. The join_pool RPC is the only reader.
create policy pc_none on pool_config for select using (false);

-- ════════════════════════════════════════════════════════════════════════════
-- One-time setup after running the above
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Set the real invite code:
--      update pool_config set invite_code = 'YOUR-CODE-HERE' where pool_id = 'wc2026';

-- 2. After YOU join the pool from the /bracket UI, make yourself admin
--    (find your uid in Authentication → Users):
--      update pool_members set is_admin = true where user_id = '<your-uid>';

-- 3. Deploy the sync-matches Edge Function (see supabase/functions/sync-matches),
--    set the FOOTBALL_DATA_TOKEN secret, invoke it once to seed the matches,
--    then schedule it. Enable the pg_cron and pg_net extensions
--    (Dashboard → Database → Extensions) and run — fill in project ref + anon key:
--
--      select cron.schedule('sync-matches', '*/2 * * * *', $$  -- every 2 min for live scores
--        select net.http_post(
--          url     := 'https://<project-ref>.supabase.co/functions/v1/sync-matches',
--          headers := jsonb_build_object('Authorization', 'Bearer <anon-key>')
--        );
--      $$);
--
--    To stop after the final: select cron.unschedule('sync-matches');

-- ════════════════════════════════════════════════════════════════════════════
-- Archive (applied 2026-10-20, after the 2026-07-19 final)
-- ════════════════════════════════════════════════════════════════════════════
-- The pool is over. Every statement below is scoped to wc2026 — the Octagon
-- pool shares pool_members / pool_config and is untouched.
--
-- 1. Results sync switched off: the cron job was unscheduled, and the
--    sync-matches Edge Function and its FOOTBALL_DATA_TOKEN secret deleted
--    (the source stays in supabase/functions/sync-matches for reuse).
--      select cron.unschedule('sync-matches');
--      npx supabase functions delete sync-matches
--      npx supabase secrets unset FOOTBALL_DATA_TOKEN
--
-- 2. Registration ended: the invite code row is gone, so join_pool(code) and
--    join_pool('wc2026', code) both find no code and return false; the
--    World Cup-only join_pool(code) function is then dropped.
delete from pool_config where pool_id = 'wc2026';
drop function if exists join_pool(text);  -- run once the read-only /bracket is live
--
-- 3. Results frozen: no more admin overrides. (Picks were already immutable —
--    every match has kicked off.)
drop policy if exists m_update_admin on matches;

-- 4. A frozen record of the final standings, computed once with
--    src/bracket/scoring.js. /bracket shows it instead of recomputing, so the
--    result survives a member deleting their account (their predictions would
--    cascade away) or a later scoring change.
--    tournament: { champion, runner_up, final_score, final_date, third_place,
--                  fourth_place, matches, scored_matches }
--    standings:  [{ rank, user_id, name, points, correct, picks, by_stage }]
create table if not exists pool_archive (
  pool_id      text primary key,
  title        text not null,
  archived_at  timestamptz not null default now(),
  tournament   jsonb not null,
  standings    jsonb not null
);
alter table pool_archive enable row level security;
drop policy if exists pa_select on pool_archive;
create policy pa_select on pool_archive for select using (is_member_of(pool_id));
-- (The wc2026 row itself was inserted from a production dump; no client can
-- write to this table.)

-- ════════════════════════════════════════════════════════════════════════════
-- pool_members read policy, pool-scoped (applied 2026-10-21)
-- ════════════════════════════════════════════════════════════════════════════
-- pm_select above used is_pool_member(), which octagon.sql scoped to wc2026.
-- On a table every pool shares, that was wrong both ways: a World Cup member
-- could read every pool's rows (the Octagon roster's user ids included), and
-- an Octagon-only member could read none, not even their own. Now a signed-in
-- user sees their own rows plus the rosters of the pools they belong to;
-- guests see nothing. is_member_of is SECURITY DEFINER, so it reads
-- pool_members without recursing into this policy. Still no insert/update/
-- delete policy: join_pool(pool, code) stays the only way in.
drop policy if exists pm_select on pool_members;
create policy pm_select on pool_members for select to authenticated
  using (user_id = auth.uid() or is_member_of(pool_id));
