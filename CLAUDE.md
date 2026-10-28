# Streakle — project guide for Claude

Streakle is a daily-puzzle game site (playstreakle.com) with nine games. New
puzzles every day; signed-in players build streaks.

## Stack & commands
- React 19 + Vite 8, React Router 7, plain inline styles (no CSS framework).
- Supabase — Google OAuth + a `game_results` table (RLS is configured & verified).
- Deployed on Vercel; **pushing to `master` auto-deploys, through a gate**:
  `vercel.json`'s `buildCommand` is `npm run verify` = `npm run lint` →
  `npm run test:coverage` (Vitest + the v8 coverage thresholds in
  `vite.config.js`) → `node scripts/check-all.mjs --no-timing` (all eight
  puzzle checkers, in parallel, correctness only: their time limits were set
  on a desktop, not Vercel's builders) → `npm run build`. Any failure fails
  the deploy and the previous one stays live, which is easy to miss: run
  `npm run verify` (~35 s) before pushing, and check the deploy went READY.
  Never lower a coverage threshold to get a deploy through.
- `npm run dev` (the dev preview can be flaky — prefer `npm run build` to verify),
  `npm run build`, `npm test` (Vitest), `npm run lint`, `npm run check` (every
  puzzle checker with its time limits, one at a time), `npm run test:coverage`
  (`-- --coverage.reporter=html` writes a per-file report to `coverage/`).
  Vitest loads `src/test-setup.js` (sets `IS_REACT_ACT_ENVIRONMENT`, so React
  reports state updates outside `act()` — keep stderr clean) and skips
  `.claude/**` and `dist/**`. The checkers' flags are strict
  (`scripts/cli.mjs`): an unknown flag or a bad `--from`/`--to`/`--days`/
  `--dump` exits 2 before checking anything.
- After a deploy, `bash scripts/check-deploy.sh` checks every route's status
  and title, the pools' rewrites, the 404 page and the static files on
  playstreakle.com (or a base URL given; exit 1 on any FAIL). Routing only
  exists on Vercel, so nothing in the gate can catch a rewrite that 404s.

## Layout (src/)
- Nine game routes: `Faceoff` (NHL), `Gridiron` (NFL), `Knockout` (MMA) — these
  three share a grid-game pattern; `Words` (Wordle), `Link` (Connections),
  `Nums` (number-swap), `Mines` (no-guess minesweeper ladder), `Weave`
  (Waffle-style word swap), `Scramble` (anagram crossword) — the last
  three are described below.
- `Home.jsx` (landing), `main.jsx` (entry: providers + render only), `App.jsx`
  (router + lazy-loaded routes + ErrorBoundary), `LoginPage.jsx`, `Archive.jsx`
  (past-puzzle modal), `UserMenu.jsx`, `PoolHistory.jsx` (`/pools`, below).
- `GameShell.jsx` (+ `.css`) frames every game page: top bar (← All games,
  Sign in / account menu), title, How to play / Archive, date, how-to panel
  (optional high-contrast switch), footer. A game passes `game` (its key in
  `games.js`), `date`, `howTo`, `onArchive` and renders only its board.
  `GameLoading` (same file) is each game route's Suspense fallback in
  `App.jsx`: the real header plus a placeholder board while the chunk loads.
  `games.js` is the registry (key, group, path, title, emoji, colours, badge;
  `GROUPS` = Home's sections, `nextGame`) that Home, GameShell, ResultCard and
  App's sign-in banner read. `GameIcon.jsx` draws each game's line icon.
- `PageShell.jsx` gives the non-game pages (Login, Privacy, Pool History,
  Bracket, Octagon) the same frame: GameShell's exported `TopBar` and
  `ShellFooter` around a `title` / `subtitle` / `date` head and a `width`-capped
  column (no `title` = the page names nothing yet). Every page but Home has a
  top bar, so the floating `SignInBanner` shows only on `/`. `NotFound.jsx`
  (the `path="*"` route) is a PageShell page too.
- `ResultCard.jsx` (+ `.css`) is every game's end-of-game card: outcome
  title, the game's own stats as children (`.rc-headline` / `.rc-detail`),
  then Share and "Next: GAME →". Its `ShareButton` owns the share-sheet →
  clipboard → "Copied!" logic — games only pass a `shareText()` builder.
- Shared: `AuthContext.js` (`useAuth`), `AuthProvider.jsx` (`signOut()` resolves
  to whether the player is signed out: a failed logout request leaves the
  session stored, so they stay signed in and the account menu says so),
  `supabase.js` (PKCE
  OAuth, so no tokens ever sit in the URL — keep it that way), `supabaseLoader.js`
  (`getSupabase()`: the client loads on first use, outside the entry chunk — code
  on Home's first paint must use it, never import `./supabase` statically;
  `mayHaveSession()` lets a guest's page render without waiting for the
  session read), `analytics.js` (strips
  the hash and OAuth params from Vercel Analytics URLs), `saveResult.js`, `useStreak.js`,
  `streak.js`, `evaluate.js` (Wordle logic, tested), `a11y.js` (`clickableProps`),
  `AwardIcon.jsx`, `ErrorBoundary.jsx`, `validWords.txt` (~14.8k words).
- Accessibility helpers (every game and pool page targets WCAG 2.2 AA; the
  `*.a11y.test.jsx` suites pin names, states, announcements and focus):
  `useAnnouncer.jsx` (`const [announce, liveRegion] = useAnnouncer()` — one
  always-mounted polite live region per page), `useDialogFocus.js` (modal
  focus: move in, trap Tab, restore), and the global `.sr-only` class in
  `index.css`. Game boards announce each move's result and what's left, move
  focus to the next sensible control after a move and to the ResultCard when a
  game ends (never out of an open dialog), and name every cell/tile/key with
  its position and state. The site-wide `body::before` texture blocks axe's
  contrast rule; check contrast from the tokens (4.5:1 text, 3:1 large/UI).
  A page-wide key handler (Words' and Scramble's typing) must return early
  for `e.target.closest(NO_PAGE_SHORTCUTS)` (exported by `UserMenu.jsx`): the
  open account menu carries `data-no-page-shortcuts`, and so should any
  future popup that keeps its own keys.
- Saving a day: every game page takes `{ seedDate, isToday, boardKey, selectDate }`
  from `useBoardDate.js`. Today's board keeps the date it was dealt, so a page
  open past midnight finishes (and saves) that day's puzzle; picking today in
  the Archive moves it on; any other Archive pick is a replay that never saves.
  Games call `saveResult({ game, puzzleDate: seedDate, … })` only when `isToday`;
  it records today or yesterday only and keeps the day's FIRST result
  (insert-if-absent), so a replay elsewhere can't flip a win or a loss
  (`saveResult.test.js`, `archiveReplay.test.jsx`). It writes the row to a
  localStorage outbox (`streakle-pending-results`) synchronously, before its
  first await, and drops it once written; guest results, failed writes and
  writes cut short by a closed page are sent by `sendPendingResults`, which
  `AuthProvider` runs on every sign-in/load (after `createProfile`, since
  results reference the profile). All nine games keep the live day's board in
  localStorage (`streakle-<game>`, never replaced by an older day's), so a
  reload never refunds a move or wipes a finished board; because the outbox
  write comes first, "saveResult, then checkpoint the finish" can't lose a day.
- Tests live next to the code as `*.test.js` (`evaluate.test.js`, `streak.test.js`,
  `mines/engine.test.js`, `weave/engine.test.js`, `scramble/engine.test.js`,
  `scramble/schedule.test.js`, `words/schedule.test.js`, `rotationSchedule.test.js`,
  the pool scoring suites).
- Content banks: `Link` 71 puzzles in `src/link/puzzles.js` and `Words` 144
  words in `src/words/bank.js`, both scheduled by the shared
  `src/rotationSchedule.js` (`src/link/schedule.js`, `src/words/schedule.js`):
  before the cutover (`LINK_CUTOVER` 2026-10-25, `WORDS_CUTOVER` 2026-10-30)
  the shipped `YYYYMMDD % count` (frozen at the shipped count, so history never
  changes), from it a fixed rotation — each entry returns only every cycle (71
  / 144 days). Link's rotation is least-recently-served first; Words' is a
  seeded shuffle (the strict order kept the bank's alphabetical runs) whose
  first returns come at least `MIN_GAP` (120) days after the old formula's
  last use, then every 144 days — never change its seed, `MIN_GAP`, the fill
  or the PRNG (`words/schedule.test.js` pins the rotation). To add entries,
  append them and add an `ERAS` entry starting on a cycle boundary no time
  zone has reached: the new era serves them first, so served dates never
  change and no gap shrinks. Never reorder or remove a shipped entry or
  change a Words answer (the schedule tests fingerprint them; `check-words.mjs`
  keeps its own frozen hash of the shipped words). The one exception is a
  content correction, approved by the owner on 2026-10-27: a Link filler word,
  wrong label or second valid split, or a wrong Words def/fact. Make it before
  the entry's next day starts in any time zone, never while it is anyone's
  today (a Link checkpoint is bound to the puzzle's words, so a mid-day edit
  resets boards in progress), log it next to the pin in
  `link/schedule.test.js` / `words/schedule.test.js` and update the pin
  deliberately. Archive replays of the entry's earlier days show the
  corrected text. The grids, `Nums`, `Mines`, `Weave` and `Scramble`
  generate fresh daily.
  Validate edits with `node scripts/check-words.mjs`, `node scripts/check-link.mjs`
  (also fails on a puzzle outside the schedule or any repeat within 71 days),
  `node scripts/check-mines.mjs`, `node scripts/check-weave.mjs` and
  `node scripts/check-scramble.mjs`.

## Conventions
- Warm "Ink & Gold" palette, defined once as CSS custom properties in the
  `:root` block of `src/index.css` (`--bg`, `--surface`, `--border`, `--gold`,
  `--ink`, `--muted`, …, plus `*-rgb` channels for translucency). Use
  `var(--gold)` / `rgba(var(--gold-rgb),0.2)` — never a palette hex literal, never a
  hex alpha suffix on a token (`tokens.test.js` enforces both directions).
  `src/theme.js` exports `GOLD`, `CARD`, … as `var()` strings for JS.
  Game feedback shares one set: `--correct` (green, light letters),
  `--present` (amber, kept clear of the brand gold — dark letters),
  `--absent` (warm grey), `--correct-deep`/`--correct-wash` for solved
  surfaces, `--hc-correct`/`--hc-present` for high-contrast mode, and
  `--link-1..4` for Link's groups — coloured by position (easiest →
  trickiest), so Link's puzzles carry no colours.
  Two fonts only: `var(--font-display)` Barlow Condensed (titles),
  `var(--font-body)` DM Sans — self-hosted woff2 in `src/fonts/`, declared in
  `src/fonts.css` (no Google Fonts request); `index.html` preloads only the
  Barlow 800 latin face the h1s use.
- Push directly to `master` — no PRs unless asked.
- Verify every change with `npm run build` (and `npm test` for logic).
- Daily puzzles are date-seeded and must be identical for every user/browser.
- All three grid games (Faceoff, Gridiron, Knockout) generate their daily grid
  procedurally from the date seed, through one pure engine, `src/grid/engine.js`,
  and per-game modules `src/<game>/data.js` (answers as first shipped — NEVER
  edit), `corrections.js` (`BATCHES` of verified fixes, each with a `from`
  date) and `puzzle.js` (header pool, accept rules, `getDailyPuzzle`, `fitsOn`,
  and `PLAYERS`/`FIGHTERS` = the answers with every batch applied, which the
  page searches). Each day shuffles the criteria pool, enforces variety,
  and validates every cell has answers AND the board has a 9-distinct-answer
  solution (impossible criteria pairs self-reject via empty cells).
  Dates before `GRID_CUTOVER` (2026-10-25) keep the shipped seeding
  (`seed + attempt*997 + pass*31337`, which collided across dates) and the
  shipped data, so every board players were dealt stays byte-identical
  (`grid/schedule.test.js` fingerprints all 662). From the cutover each attempt's
  seed is `mixSeed(date, pass, attempt)`, and all three games skip any grid
  served in the previous 365 days (`scheduleWithoutRepeats`: a memoised
  day-by-day schedule replayed from 365 days before the cutover).
  A date's grid generates from the answer data in effect that day (shipped,
  then each batch from its `from`). Pages check answers with
  `fitsOn(boardDate)`: the current data, or whatever the data the board was
  dealt from accepted — so a correction never makes a dealt board harder.
  A team header means the franchise: relocated predecessors count for it
  (`FRANCHISES` in each `puzzle.js`, e.g. STL Rams → LAR, QUE → COL; stints for
  code-less predecessors like the North Stars are corrections adding the
  successor). To fix answer data, add a NEW batch to `corrections.js` (never
  edit `data.js` or a shipped batch), each fix with a source, `from` a day no
  time zone has reached (2+ days after the push). Then run
  `node scripts/check-faceoff.mjs [Faceoff|Gridiron|Knockout]` — it imports the
  real modules (nothing to keep in sync) and fails on any fallback grid,
  unsolvable board, repeat within 365 days from the cutover (2025–2030), or a
  cold first board slower than 300 ms; then update the post-cutover pins.
  Any cutover/era date must be one no time zone has reached when it deploys.
- Phone layout: every game's controls must be on screen on load at 375x548
  (iPhone SE in Safari) and nothing may clip or scroll sideways at 320px;
  desktop and tablet stay as they are. Check in a real browser (happy-dom has
  no layout). How each game does it:
  - Grids: centred by their own `margin-inline:auto`, never the scroller's
    `justify-content:center` (that hid the row labels past the left edge);
    phone columns are `minmax(64px,88px)`. A pick closes the match list in
    all three games, so the submit button sits right under the search box.
  - Link: `repeat(4, minmax(0, 1fr))` columns; each word is sized to its
    tile by `GLYPH_EM` (DM Sans 700 widths) in `cqi`, between 9px and its old
    size, and a run wider than 6.5em gets a CSS soft hyphen (`.lk-shy`, an
    empty aria-hidden marker, so the tile's text stays exactly the word).
    `check-link.mjs` warns about words over 10 letters in new puzzles.
  - Scramble: on phones (≤480px) `--sc-cell` is also capped by the visible
    height (`dvh`, `vh` fallback) minus fixed reserves (`ABOVE_BOARD` etc. in
    `Scramble.jsx`, which copy GameShell's 147px header — re-measure them if
    the header changes; the slack is ~5px). Short phones (≤760px tall) put
    the streak, chips and timer on one row. Cells stop at 22px.
  - Words: the board and keyboard are sized to fit under the header with no
    room to spare, so nothing may sit between them; the streak shares the
    date line (`DateLine`, live day only).

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
- The roster comes from `get_pool_members('wc2026')`. The zero-arg
  `get_pool_members()` is dropped (2026-10-21): it returned every pool's
  members to a member of any pool.
- `pool_archive` (members-only RLS via `is_member_of`) holds the final
  standings and tournament result, computed once with `scoring.js`. The
  Standings tab reads it rather than recomputing, so the record survives a
  member deleting their account (their predictions cascade away).
- `src/Bracket.jsx`: champion banner; Standings (per-player pick history),
  My picks (read-only, collapsed by day, tap a match for everyone's picks)
  and Tournament (group tables + bracket). No polling, no join form, no admin
  view. Non-members see "This pool has ended". Members reach it from the
  account menu's Pool History (Home has no pool link). Still `noindex`.
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
  `join_pool(pool, code)`/`get_pool_members(pool)` RPCs replaced the wc
  originals (both since dropped); the wc helpers `is_pool_member/admin()`
  are now explicitly scoped to `'wc2026'`. Members may delete their own
  picks pre-start (frees a Lock
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
  (alongside its page, its route and a `vercel.json` rewrite — pools are never
  prerendered); its members then see it automatically, and it
  moves from Active to Past once it gets a `pool_archive` row — no code change.
- `src/usePoolMemberships.js` asks `is_member_of(pool)` for each registered
  pool, cached per user per page load and shared by UserMenu and PoolHistory. A pool's in-page join form must call
  `refreshPoolMemberships()` after a successful join (Octagon's does), or the
  menu item waits for the next page load.
- `pool_members` RLS is pool-scoped (since 2026-10-21; last section of
  `supabase/schema.sql`): `pm_select` lets a signed-in user read their own rows
  plus the rosters of pools they belong to (`user_id = auth.uid() or
  is_member_of(pool_id)`); guests read nothing. It used to be
  `is_pool_member()` — `wc2026`-only, so World Cup members saw every pool's
  rows and Octagon-only members saw none. Still no write policy.

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
  persisted ladder (`useBoardDate`'s live board).
  The board is a delegated-handler WAI-ARIA grid (roving tabindex, arrows,
  Enter digs, F flags; tap/hold/right-click on pointers) — it deliberately
  does NOT use `clickableProps`. Undug and flagged tiles are told apart from
  dug cells by a 2px `--mines-tile-edge` (3:1+ against dug cells and the page,
  WCAG 1.4.11); the tile colours are `--mines-*` tokens in `index.css`, and the
  focus ring is drawn inside that edge (`outline-offset: -6px`). At ≤520px
  the bar is fixed to the bottom; its height (`--mn-bar-h`) is reserved as the
  root's scroll padding and below the page, so focus never sits under it.
  Focus moves after a clear (to Next), Next (to the new board's opening cell)
  and the day's end (to the result) go through the `afterMove` ref, which
  names the render it waits for — keep that, or a clock tick's effects can
  take the move against the old DOM.
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
  high-contrast setting. A touch/pen press starts out captured by its tile,
  so the grid taking the capture fires a bubbling `lostpointercapture`: only
  the grid's own capture loss of the pressing pointer may end a drag
  (`Weave.drag.test.jsx`), or touch drags never swap.

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
  cross. Before `SCRAMBLE_CUTOVER` (2026-10-30, frozen): no root repeats
  within a 64-day block, shorter words not within each 16-day stretch (a
  root could return across a block edge). From it: the 290 roots that can
  build a board are dealt into 5 fixed groups and 32-day blocks take the
  groups in turn, so a root returns no sooner than 129 days (across the
  cutover too, via the frozen `ROOTS_BEFORE_CUTOVER`); a root's shorter
  words' colours must sum to its cycle number mod 10, so no board repeats
  within a 1600-day epoch (after that one may return, never sooner than 1569
  days — by design, no upkeep); no day repeats one of the 12 boards served
  before the cutover (`SERVED_BOARDS`). Shorter words don't repeat within 16
  days inside a block. A cold load builds at most one block (~45–55 ms
  desktop worst case; the checker gates it at 120 ms, best of 3 fresh
  engine instances).
- **Any change to the constants, layout search, pool shuffle, `mixSeed`,
  block or group scheme, the colouring or `words.js` rewrites boards.**
  Every served board before the cutover is pinned (`schedule.test.js`
  `SERVED`, and the 2026-10-18 board as `FALLBACK` — print it with
  `node scripts/check-scramble.mjs --dump 2026-10-18`), and so are the boards
  from the cutover (its first block, two far days, a digest of every block
  through 2030): never update a pin for a day any time zone has reached. The
  checker replays 2025-01-01..2030-12-31 (`--days 4017` reaches the second
  epoch; exit 1 on any fallback, stray letter run, unspellable word,
  disconnected board, a root back within 129 days, a board repeat the scheme
  doesn't allow or slow generation).
- `Scramble.jsx` keeps today's found words, hinted cells, hints and clock in
  localStorage (`streakle-scramble`, v2 — the old ladder's v1 is ignored — and bound to
  the board by a pool+words signature, so a same-day engine change resets it);
  archive replays never touch it or call `saveResult`; a board finished just
  past midnight saves under the day it was dealt. Keyed by date like Weave;
  the clock pauses when hidden and on unmount; honours `streakle-hc`.
- Keyboard: the page's Enter shortcut submits the word, except on a focused
  control (button, link, switch), which Enter activates; typing a letter
  moves focus off such a control first, so "type, then Enter" always
  submits. The visual `.sc-board` is `aria-hidden`; screen readers get the
  `.sc-sr-only` "Board" list instead (each word's length, the letters showing,
  its crossings), and hint announcements name the word they filled.

## SEO
`<title>`, meta description, Open Graph + Twitter tags, OG image
(`public/og-image.png`), `theme-color`, font-loading perf, `public/robots.txt`,
`public/sitemap.xml`, and — via the `useSeo` hook in `src/seo.js`, wired into
every route — per-route `<title>`, meta description, `<link rel="canonical">`,
social tags and JSON-LD. Semantic HTML too: one `<h1>` per page and
`<main>`/`<nav>`/`<footer>` landmarks. `index.html` carries a `WebSite` JSON-LD
block.
- `scripts/prerender.mjs` runs after `vite build` (via `npm run build`) and
  writes a static per-route `index.html` into `dist/<route>/` for every public
  page, templating in that route's title, description, OG/Twitter tags,
  canonical and Game JSON-LD from `PAGE_SEO`. Non-JS scrapers (Slack, iMessage,
  Discord) now get the right head on `/words`, `/scramble` etc. instead of the
  homepage fallback. `vercel.json` sets `cleanUrls: true` so the files are
  served without redirects. The private pools (`/bracket`, `/octagon`,
  `/pools`) stay off the prerender list (`PRERENDERED` in `src/seo.js`) so no
  scraper ever finds them; `vercel.json` rewrites just those three (with and
  without a trailing slash) to `/`. Every other URL gets `dist/404.html`
  (written by prerender: noindex, no canonical) with a real 404 status, and
  the SPA boots there and shows `NotFound.jsx`. **A new route must be
  prerendered or get a rewrite** (`App.routing.test.jsx` fails otherwise),
  and rewrite destinations stay `/`: with `cleanUrls` on, `/index.html` no
  longer resolves (that 404'd the pools on 2026-10-21). Known side effects:
  a wrong-case URL (`/Words`) renders the right page under a 404 status, and
  `/404` itself is a noindex 200. `public/ads.txt` declares the AdSense
  publisher ID (the same one as `index.html`'s ad script).
- Lighthouse SEO scores 100/100 on `/` and `/words` on the deployed site
  (2026-10-21); accessibility is 100 too.
- Performance (deployed, mobile, 2026-10-23): `/` 89–90 (was 72; FCP
  3.8 → 1.7 s, LCP 5.2 → 3.6 s), `/words` 93–97 (was 76); TBT and CLS ~0.
  What did it: self-hosted fonts (no render-blocking third-party CSS);
  Supabase out of the entry chunk (469.8 KB / 137 KB gzip → 269.6 KB /
  86 KB gzip; React DOM is most of what's left); a guest's page renders
  without waiting for `getSession()`; and Home's logo rises instead of fading.
  Never fade the page's largest element from opacity 0: Chrome then records
  LCP only when the fade ends, and Lighthouse counts everything fetched
  meanwhile (AdSense) against it.
- Still open: AdSense (`adsbygoogle.js` + ~170 KB `show_ads_impl`) is the
  biggest remaining load cost and sets the `test_cookie` third-party cookie
  that keeps best-practices at 77. Injecting it ~3 s after `load` measured `/`
  at 96–97 and best-practices at 96 locally, but that's the owner's call
  (ad timing, and AdSense may look for the static tag). `/words` LCP waits
  on its chunk, mostly `validWords.txt` (89 KB raw), which could load lazily.
