# Streakle — project guide for Claude

Streakle is a daily-puzzle game site (playstreakle.com) with seven games. New
puzzles every day; signed-in players build streaks.

## Stack & commands
- React 19 + Vite 8, React Router 7, plain inline styles (no CSS framework).
- Supabase — Google OAuth + a `game_results` table (RLS is configured & verified).
- Deployed on Vercel; **pushing to `master` auto-deploys**.
- `npm run dev` (the dev preview can be flaky — prefer `npm run build` to verify),
  `npm run build`, `npm test` (Vitest), `npm run lint`.

## Layout (src/)
- Seven game routes: `Faceoff` (NHL), `Gridiron` (NFL), `Knockout` (MMA) — these
  three share a grid-game pattern; `Words` (Wordle), `Link` (Connections),
  `Nums` (number-swap), `Mines` (no-guess minesweeper ladder — see below).
- `Home.jsx` (landing), `main.jsx` (router + lazy-loaded routes + ErrorBoundary
  + inline LoginPage), `Archive.jsx` (past-puzzle modal), `UserMenu.jsx`.
- Shared: `AuthContext.jsx`, `supabase.js`, `saveResult.js`, `useStreak.js`,
  `streak.js`, `evaluate.js` (Wordle logic, tested), `a11y.js` (`clickableProps`),
  `AwardIcon.jsx`, `ErrorBoundary.jsx`, `validWords.txt` (~14.8k words).
- Tests live next to the code as `*.test.js` (`evaluate.test.js`, `streak.test.js`,
  `mines/engine.test.js`, the pool scoring suites).
- Content banks never repeat for months: `Words` has 144 words, `Link` 71 puzzles;
  the grids, `Nums` and `Mines` generate fresh daily. Validate edits with
  `node scripts/check-words.mjs`, `node scripts/check-link.mjs` and
  `node scripts/check-mines.mjs`.

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

## World Cup 2026 bracket pool (`/bracket`)
A private prediction pool for the owner's friends — the site's first multi-user
feature. Members join with an invite code, pick winners for every WC 2026 match
(a/b/draw in groups, a/b in knockouts), and are ranked on a leaderboard
(points: group 1, R32 2, R16 3, QF 5, SF 8, 3rd-place 5, final 12 —
`src/bracket/scoring.js`, tested).

- UI: `src/Bracket.jsx` (signed-out / join-with-code / picks / standings /
  tournament / admin-override views). Members-only banner on Home. `noindex` via
  `PAGE_SEO`. Picks auto-collapses finished days; Standings expands per-player
  pick history; Tournament has live Groups tables (ranked pts/GD/GF, top-2 +
  best-8 thirds) and a stacked-rounds Bracket — all computed client-side from
  the loaded matches. `matches.score_a/score_b` (running/final score) +
  `matches.status` (TIMED/IN_PLAY/PAUSED/FINISHED) from the sync feed goal
  difference, scorelines, and a LIVE badge on in-progress matches. The client
  polls matches every 60s; the sync cron runs every 2 min for fresh live scores.
- DB: `supabase/schema.sql` — `pool_members`, `matches`, `predictions`,
  `pool_config` + RLS. Joining goes ONLY through the `join_pool(code)`
  SECURITY DEFINER RPC (no INSERT policy on `pool_members` — that's deliberate;
  don't add one). `get_pool_members()` RPC returns the roster with names.
  Picks lock at kickoff server-side (RLS checks `kickoff_at > now()`).
  Players can also "lock in" a matchday's picks early (`predictions.locked_at`;
  the RLS update policy makes locked rows immutable).
  `matches.excluded = true` takes a match out of the pool entirely (unpickable,
  never scored) — used for the June 11 2026 openers, which kicked off before
  the friends joined; the pool starts June 12. The sync never writes this column.
- Results sync automatically: `supabase/functions/sync-matches/index.ts` (Edge
  Function) pulls football-data.org every 5 min via pg_cron (setup commented at
  the bottom of schema.sql; needs the `FOOTBALL_DATA_TOKEN` secret). Admin
  grading in the UI sets `result_source='admin'`, which the sync never
  overwrites. First admin is flipped manually:
  `update pool_members set is_admin = true where user_id = '<uid>'`.

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
