# Streakle — project guide for Claude

Streakle is a daily-puzzle game site (playstreakle.com) with nine games. New
puzzles every day; signed-in players build streaks.

## Stack & commands
- React 19 + Vite 8, React Router 7, plain inline styles (no CSS framework).
- Supabase — Google OAuth + a `game_results` table (RLS is configured & verified).
- Deployed on Vercel; **pushing to `master` auto-deploys**.
- `npm run dev` (the dev preview can be flaky — prefer `npm run build` to verify),
  `npm run build`, `npm test` (Vitest), `npm run lint`.

## Layout (src/)
- Nine game routes: `Faceoff` (NHL), `Gridiron` (NFL), `Knockout` (MMA) — these
  three share a grid-game pattern; `Words` (Wordle), `Link` (Connections),
  `Nums` (number-swap), `Mines` (no-guess minesweeper ladder), `Weave`
  (Waffle-style word swap), `Scramble` (anagram crossword) — the last
  three are described below.
- `Home.jsx` (landing), `main.jsx` (entry: providers + render only), `App.jsx`
  (router + lazy-loaded routes + ErrorBoundary), `LoginPage.jsx`, `Archive.jsx`
  (past-puzzle modal), `UserMenu.jsx`, `PoolHistory.jsx` (`/pools`, below).
- Shared: `AuthContext.js` (`useAuth`), `AuthProvider.jsx`, `supabase.js`, `saveResult.js`, `useStreak.js`,
  `streak.js`, `evaluate.js` (Wordle logic, tested), `a11y.js` (`clickableProps`),
  `AwardIcon.jsx`, `ErrorBoundary.jsx`, `validWords.txt` (~14.8k words).
- Tests live next to the code as `*.test.js` (`evaluate.test.js`, `streak.test.js`,
  `mines/engine.test.js`, `weave/engine.test.js`, `scramble/engine.test.js`,
  the pool scoring suites).
- Content banks never repeat for months: `Words` has 144 words, `Link` 71 puzzles;
  the grids, `Nums`, `Mines`, `Weave` and `Scramble` generate fresh daily.
  Validate edits with `node scripts/check-words.mjs`, `node scripts/check-link.mjs`,
  `node scripts/check-mines.mjs`, `node scripts/check-weave.mjs` and
  `node scripts/check-scramble.mjs`.

## Conventions
- Warm "Ink & Gold" palette: `#0F0E0C` bg, `#1C1A16` cards, `#2C2820` borders,
  `#C9A84C` amber, `#F5F0E8` warm white. Barlow Condensed (headings), DM Sans (body).
- Push directly to `master` — no PRs unless asked.
- Verify every change with `npm run build` (and `npm test` for logic).
- Daily puzzles are date-seeded and must be identical for every user/browser.
- All three grid games (Faceoff, Gridiron, Knockout) generate their daily grid
  procedurally from the date seed — no fixed puzzle lists, so they never repeat.
  Each `getDailyPuzzle` shuffles a criteria pool, enforces variety, and validates
  every cell has answers AND the board has a full 9-distinct-player solution
  (impossible criteria pairs self-reject via empty cells). After editing any
  grid's player/fighter data, run
  `node scripts/check-faceoff.mjs [Faceoff|Gridiron|Knockout]` — it replays each
  generator over 2025–2027 and fails if any day falls back to the hardcoded grid
  (= pool too thin). Keep the in-app generator and the checker's copy in sync.

## Recent work (last session)
A full code audit + fix pass: bug fixes, route code-splitting, accessibility
(keyboard nav, focus rings, reduced-motion, high-contrast mode in Words),
security headers, a generated OG image, and a Vitest test foundation. All
verified working on the live site.

## World Cup 2026 bracket pool (`/bracket`) — ARCHIVED 2026-10-20
A private prediction pool for the owner's friends — the site's first multi-user
feature. 8 members picked winners for every WC 2026 match (a/b/draw in
groups, a/b in knockouts); points: group 1, R32 2, R16 3, QF 5, SF 8,
3rd-place 5, final 12 (`src/bracket/scoring.js`, tested). The pool ended with
the 2026-07-19 final (ESP 1–0 ARG); Mehdi Saeed won it with 113 points.

**It is now a read-only results page.** Nothing writes to it any more:
- The results sync is off: the pg_cron job was unscheduled and the
  `sync-matches` Edge Function + `FOOTBALL_DATA_TOKEN` secret deleted (the
  source stays in `supabase/functions/sync-matches` for a future pool).
- Registration is closed: the `wc2026` invite-code row in `pool_config` is
  deleted, so both `join_pool` overloads refuse it, and the World Cup-only
  `join_pool(code)` function is dropped. Don't re-add an INSERT policy on
  `pool_members` — Octagon's `join_pool(pool, code)` is still the only way in.
- Results are frozen: the admin-override policy on `matches` is dropped;
  picks were already immutable (every match has kicked off).
- `pool_archive` (members-only RLS via `is_member_of`) holds the final
  standings and tournament result, computed once with `scoring.js`. The
  Standings tab reads it rather than recomputing, so the record survives a
  member deleting their account (their predictions cascade away).
- `src/Bracket.jsx`: champion banner; Standings (per-player pick history),
  My picks (read-only, collapsed by day, tap a match for everyone's picks)
  and Tournament (group tables + bracket). No polling, no join form, no admin
  view. Non-members see "This pool has ended". Home shows members a
  "World Cup 2026 Pool · Final results" link. Still `noindex`.
- Tables kept as-is: `pool_members` (wc2026 rows), `matches`, `predictions`.
  `supabase/schema.sql` documents the original schema plus an "Archive"
  section with everything above. An off-site CSV export (standings, matches,
  picks) went to the owner's machine — not the repo, which is public.

## Octagon — UFC PPV pick'em (`/octagon`)
A second private pool (pool_id `'octagon'`) on the same
`pool_members`/`pool_config` machinery. Members call every PPV main-card
fight: winner 10 · method +5 (pays only if the winner is right) · round +5
(finishes only, independent of the method pick) · underdog +5 (beating the
admin-flagged favorite) · one ★ Lock of the Night per event doubling that
fight's subtotal. Draw/NC score nobody; scratched fights are void. Picks lock
at event start and reveal after start (both RLS-enforced). No seasons —
instead a lineal pool belt (first winner claims; champ retains on ties = a
defense; a strictly higher score dethrones; an absent champ forfeits), plus
all-time and last-6-events form tables. All standings are client-side pure
functions in `src/octagon/scoring.js` (tested).

- UI: `src/Octagon.jsx` (join / Event / Standings / Admin, `oc-*` classes,
  `noindex`). Fight cards: fighter buttons, method/round chips, lock toggle;
  post-start they expand to everyone's picks with per-layer grading colors.
- Results are admin-entered (there's no free UFC API). Assisted grading:
  `src/octagon/wiki.js` fetches Wikipedia's CORS-open REST HTML
  (`en.wikipedia.org/api/rest_v1/page/html/<slug>`), DOM-parses the Results
  table and proposes winner/method/round per fight (fuzzy name matches
  flagged); paste-the-table fallback; the admin confirms each. Tested against
  a saved UFC 323 fixture in `src/octagon/fixtures/` (the wiki test runs in
  happy-dom via a vitest env pragma).
- DB: `supabase/octagon.sql` (already applied) — `ufc_events` (`starts_at` =
  the pick lock), `fights`, `fight_picks` (`event_id` trigger-filled; one lock
  per event via a partial unique index) + RLS. Pool-scoped helpers
  `is_member_of(pool)`/`is_admin_of(pool)` and arity-overloaded
  `join_pool(pool, code)`/`get_pool_members(pool)` RPCs sit beside the wc
  originals; the wc helpers `is_pool_member/admin()` are now explicitly scoped
  to `'wc2026'`. Members may delete their own picks pre-start (frees a Lock
  stranded on a scratched fight — updates there are RLS-blocked). Invite code
  seeded as `octagon`:
  `update pool_config set invite_code = '…' where pool_id = 'octagon'`.

## Pool History (`/pools`)
The account menu (`UserMenu.jsx`) shows pool members a "🏆 Pool History"
item; `src/PoolHistory.jsx` lists their pools — live ones under Active, then
archived ones under Past with a winner / your-finish recap from
`pool_archive.standings` — each row linking to the pool page. Guests and
non-members are redirected to `/`; nothing names a pool until membership is
known. `noindex`.
- `src/pools.js` is the registry (`POOLS`: id, name, kind, path, emoji) plus
  pure grouping/recap helpers (tested). **A new pool needs an entry there**
  (alongside its page and route); its members then see it automatically, and it
  moves from Active to Past once it gets a `pool_archive` row — no code change.
- `src/usePoolMemberships.js` asks `is_member_of(pool)` for each registered
  pool, cached per user per page load and shared by UserMenu, Home (the World
  Cup banner) and PoolHistory. A pool's in-page join form must call
  `refreshPoolMemberships()` after a successful join (Octagon's does), or the
  menu item waits for the next page load. Not a `pool_members` select: that table's RLS
  is `is_pool_member()`, hard-scoped to `wc2026`, so World Cup members can read
  every pool's rows while an Octagon-only member reads none.

## Mines — daily no-guess minesweeper ladder (`/mines`)
Three date-seeded boards a day (Easy 9×9/10, Medium 10×14/22, Hard 10×24/48)
in a progressive ladder: clear one to unlock the next. Every board is
solvable by logic alone from a fixed opening. A mine ends the attempt and
resets the board to its opening; 3 attempts per rung, a third mine ends the
day. Result = active-dig time + mistakes; only a Hard clear writes
`completed: true` (so only that counts for ✓ Done and the streak); a third
mine writes `completed: false`. `game_results.score` = seconds,
`swaps_used` = mines hit.
- `src/mines/engine.js` is a pure ESM module (generator, no-guess solver,
  play primitives) imported unchanged by `Mines.jsx`, `engine.test.js` and
  `scripts/check-mines.mjs` — nothing to keep in sync. The solver uses
  trivial, pairwise-difference and ≤8-cell endgame mine-count rules, never
  backtracking. Generation = seeded layout + solver-guided repair; accepted
  only when a fresh solve from the opening clears the board.
- **Any change to `RUNGS`, layout, perturbation, rule order or `mixSeed`
  rewrites every historical board.** The 2026-09-04 boards are pinned as
  `FALLBACKS` by a snapshot test — update them deliberately with
  `node scripts/check-mines.mjs --dump 2026-09-04`. The checker replays
  2025-01-01..2030-12-31 × 3 rungs (exit 1 on any fallback/unsound/duplicate
  or Hard > 60 ms); extend `--days` before 2031.
- `Mines.jsx` keeps a per-day ladder checkpoint in localStorage
  (`streakle-mines`: rung, attempts, times, phase — never cell state) so a
  third mine ends the day across reloads. Archive replays never touch it and
  never call `saveResult`; picking today in the Archive maps back to the
  persisted ladder (`puzzleDate = null`).
  The board is a delegated-handler WAI-ARIA grid (roving tabindex, arrows,
  Enter digs, F flags; tap/hold/right-click on pointers) — it deliberately
  does NOT use `clickableProps`.
- `Archive.jsx` `GAME_META.start` lets a game's calendar begin after the
  site's `LAUNCH_DATE`; the six older games keep the default.

## Weave — daily Waffle-style word swap (`/weave`)
A 5×5 lattice of six crossing five-letter words (rows and columns 0/2/4),
scrambled; swap any two tiles. Green = right spot (locked), yellow = still
missing from the tile's row or column word, grey = neither. Every scramble is
exactly 10 swaps from solved (PAR); you get 15, the leftovers are stars, and
the puzzle ENDS at 0 swaps (`completed: false`). `game_results.score` = stars,
`swaps_used` = swaps spent.
- `src/weave/engine.js` is a pure ESM module (fill search, scramble,
  duplicate-aware min-swap solver, colouring) imported unchanged by
  `Weave.jsx`, `engine.test.js` and `scripts/check-weave.mjs`. Answers come
  from `src/weave/answers.js` (2,105 hand-picked common words, all in
  `validWords.txt`; no plain plurals, no US/UK spelling variants).
- No word repeats within a 128-day block (`BLOCK_DAYS` from
  `BLOCK_EPOCH`): each day bans the words used earlier in its block, so a
  block is generated in order and cached (~20 ms cold). Candidates are also
  kept with letter-position odds so Y-/E-heavy crossings don't force the
  same few words. Repeats only happen across block edges (~15 within a week
  over 2025–2030).
- Yellows: each yellow accounts for one missing letter; a word's missing
  letters go first to tiles in only that word, then to crossing tiles in
  reading order, across word first (tested in `engine.test.js`).
- **Any change to the search, scramble, `mixSeed`, the block constants or
  `answers.js` rewrites every historical grid.** The 2026-10-17 puzzle is
  pinned as `FALLBACK` by a snapshot test — update it deliberately with
  `node scripts/check-weave.mjs --dump 2026-10-17`. The checker replays
  2025-01-01..2030-12-31 (exit 1 on any fallback, non-PAR scramble,
  in-block repeat, duplicate grid or > 50 ms); extend `--days` before 2031.
- `Weave.jsx` keeps today's board + swaps left in localStorage
  (`streakle-weave`) so a reload never refunds a swap; archive replays never
  touch it and never call `saveResult`. The board is keyed by date, tiles are
  real buttons (tap-tap or pointer drag, Escape clears), swaps FLIP-animate
  unless reduced motion is on, and it honours Words' `streakle-hc`
  high-contrast setting.

## Scramble — daily anagram crossword (`/scramble`)
One set of 7 letters a day (a shuffled 7-letter root word) and a
Scrabble-style board of 6 words built from them: the root plus five 4–6
letter words that fit inside it (aiming for one 6, two 5s, two 4s; at least
two 5+). Players spell words from the letters in ANY order (tap or type,
Enter); a found word fills its cells, and its letters show in crossing words.
Guesses not on the board cost nothing — no fail state. A hint reveals one
random hidden cell anywhere on the board (+30 s; the page passes
Math.random into `nextHint`, so the engine stays deterministic); a word
whose cells all fill in counts as found. Score = active time + hint penalty;
`game_results.score` = seconds, `swaps_used` = hints, always `completed: true`.
- `src/scramble/engine.js` is a pure ESM module (root/sub-word selection,
  layout search, play helpers) imported unchanged by `Scramble.jsx`,
  `engine.test.js` and `scripts/check-scramble.mjs`. Bank:
  `src/scramble/words.js` (3,868 common words, 4–7 letters, spell-checked
  against ENABLE). Because every arrangement of a board word's letters is
  always available, a word is banked only if no other word in the
  hand-picked common list is its anagram (TEAM/MEAT/MATE are out).
- Layout: the root goes first; each later word takes the spot with the most
  crossings, then the tightest board (≤ 9×9); words only touch where they
  cross. No root repeats within a 64-day block; shorter words (shared by
  many roots) don't repeat within each 16-day stretch. A cold load late in
  a block replays the block first (~30 ms desktop worst case; the checker
  gates it at 120 ms in fresh engine instances).
- **Any change to the constants, layout search, pool shuffle, `mixSeed`,
  block scheme or `words.js` rewrites every historical board.** The
  2026-10-18 board is pinned as `FALLBACK` — update it with
  `node scripts/check-scramble.mjs --dump 2026-10-18`. The checker replays
  2025-01-01..2030-12-31 (exit 1 on any fallback, stray letter run,
  unspellable word, disconnected board, repeat or slow generation).
- `Scramble.jsx` keeps today's found words, hinted cells, hints and clock in
  localStorage (`streakle-scramble`, v2 — the old ladder's v1 is ignored — and bound to
  the board by a pool+words signature, so a same-day engine change resets it);
  archive replays never touch it or call `saveResult`, and a result is only
  saved while the board's date is still today. Keyed by date like Weave;
  the clock pauses when hidden and on unmount; honours `streakle-hc`.

## Current focus — SEO optimization
Done: `<title>`, meta description, Open Graph + Twitter tags, the OG image
(`public/og-image.png`), `theme-color`, font-loading perf, `public/robots.txt`,
`public/sitemap.xml`, and — via the `useSeo` hook in `src/seo.js`, wired into
every route — per-route `<title>`, meta description, `<link rel="canonical">`,
social tags and JSON-LD. Semantic HTML is in place too: one `<h1>` per page and
`<main>`/`<nav>`/`<footer>` landmarks. `index.html` carries a `WebSite` JSON-LD
block.

Remaining SEO work:
1. Optional/bigger: pre-render the routes so content is crawlable without JS.
   Per-route metadata currently updates client-side only — Googlebot runs JS so
   it sees it, but non-JS social scrapers still read the homepage OG tags from
   `index.html`. Pre-rendering (or SSG) would give each route static tags.
2. Run a Lighthouse SEO audit on the deployed site.
