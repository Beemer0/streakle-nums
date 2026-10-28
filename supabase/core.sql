-- ════════════════════════════════════════════════════════════════════════════
-- Core tables — profiles and game_results, which sign-in, saving a result,
-- streaks, Home and the Archive all depend on. Run this first on a fresh
-- project: schema.sql and octagon.sql join profiles.
--
-- Until 2026-10-27 these lived only in the live DB. This file was rebuilt
-- that day from the live catalog (columns, defaults, constraints, indexes,
-- policies, grants; `supabase db dump` needs Docker) and includes what was
-- applied the same day: user_id NOT NULL, the CHECKs, the profile trigger,
-- the UPDATE policy on game_results dropped, and policies made TO
-- authenticated with auth.uid() wrapped in (select …). Before that the
-- policies were TO public and called auth.uid() directly.
-- ════════════════════════════════════════════════════════════════════════════

-- ── profiles: one row per account ───────────────────────────────────────────
-- The client inserts it on first sign-in (AuthProvider.jsx createProfile),
-- from the Google user metadata. Pool members see each other's display_name
-- and avatar_url through get_pool_members (octagon.sql), and the avatar goes
-- straight into an <img src>.
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,           -- Google's full name, else the email
  avatar_url   text,
  created_at   timestamptz default timezone('utc', now()),
  constraint profiles_display_name_check check (char_length(display_name) <= 100),
  constraint profiles_email_check check (char_length(email) <= 320),
  -- Google's avatar host only: any other URL would let a member log the IP
  -- and timing of everyone who opens the standings.
  constraint profiles_avatar_url_check check (char_length(avatar_url) <= 1000
    and avatar_url ~ '^https://lh[0-9]+\.googleusercontent\.com/')
);

-- Cleans a row before the checks see it: an over-long name is cut, and an
-- avatar off Google's host is dropped (the UI shows the initial instead).
-- Rejecting the row would fail the sign-in insert, and since game_results
-- references profiles, that player could then never save a result.
create or replace function sanitize_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  new.display_name := left(new.display_name, 100);
  if new.avatar_url !~ '^https://lh[0-9]+\.googleusercontent\.com/'
     or char_length(new.avatar_url) > 1000 then
    new.avatar_url := null;
  end if;
  return new;
end $$;
-- Triggers fire without EXECUTE, so nobody needs to call it.
revoke execute on function sanitize_profile() from public, anon, authenticated, service_role;
create or replace trigger profiles_sanitize
  before insert or update on profiles
  for each row execute function sanitize_profile();

-- ── game_results: one row per player, game and day ──────────────────────────
-- saveResult.js inserts a row only if it's absent (ON CONFLICT DO NOTHING),
-- so the day's first result stands; with no update policy below, nothing can
-- turn a win into a loss later. What score and swaps_used mean differs per
-- game (CLAUDE.md); the bounds only reject garbage. Mines and Scramble
-- scores are seconds, and Nums lets a player go over budget, so swaps_used
-- has no tight cap.
create table game_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  game        text not null,
  puzzle_date date not null,
  completed   boolean default false,
  score       integer default 0,
  swaps_used  integer default 0,
  created_at  timestamptz default timezone('utc', now()),
  unique (user_id, game, puzzle_date),
  -- A new game's key goes here too (games.test.js checks this copy).
  constraint game_results_game_check check (game in
    ('scramble', 'weave', 'words', 'link', 'mines', 'nums', 'faceoff', 'gridiron', 'knockout')),
  constraint game_results_score_check check (score between 0 and 1000000),
  constraint game_results_swaps_used_check check (swaps_used between 0 and 100000),
  -- Launch day to tomorrow (UTC+14 is a day ahead of the server's UTC). A row
  -- that passes once always passes, so a restore re-validates cleanly.
  constraint game_results_puzzle_date_check check
    (puzzle_date between date '2026-05-16' and current_date + 1)
);

-- ── RLS: own rows only ──────────────────────────────────────────────────────
-- auth.uid() is wrapped in (select …) so Postgres evaluates it once per
-- statement instead of once per row.
alter table profiles     enable row level security;
alter table game_results enable row level security;

create policy "Users can view own profile" on profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Users can insert own profile" on profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users can update own profile" on profiles for update to authenticated
  using ((select auth.uid()) = id);

create policy "Users can view own results" on game_results for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own results" on game_results for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- No update or delete policy: a saved result is final. Deleting an account
-- still removes its rows, through the foreign-key cascades.

-- Supabase's default table grants; the policies above are what limit them.
grant all on table profiles, game_results to anon, authenticated, service_role;
