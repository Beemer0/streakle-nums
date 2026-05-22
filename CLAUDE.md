# Streakle — project guide for Claude

Streakle is a daily-puzzle game site (playstreakle.com) with six games. New
puzzles every day; signed-in players build streaks.

## Stack & commands
- React 19 + Vite 8, React Router 7, plain inline styles (no CSS framework).
- Supabase — Google OAuth + a `game_results` table (RLS is configured & verified).
- Deployed on Vercel; **pushing to `master` auto-deploys**.
- `npm run dev` (the dev preview can be flaky — prefer `npm run build` to verify),
  `npm run build`, `npm test` (Vitest), `npm run lint`.

## Layout (src/)
- Six game routes: `Faceoff` (NHL), `Gridiron` (NFL), `Knockout` (MMA) — these
  three share a grid-game pattern; `Words` (Wordle), `Link` (Connections),
  `Nums` (number-swap).
- `Home.jsx` (landing), `main.jsx` (router + lazy-loaded routes + ErrorBoundary
  + inline LoginPage), `Archive.jsx` (past-puzzle modal), `UserMenu.jsx`.
- Shared: `AuthContext.jsx`, `supabase.js`, `saveResult.js`, `useStreak.js`,
  `streak.js`, `evaluate.js` (Wordle logic, tested), `a11y.js` (`clickableProps`),
  `AwardIcon.jsx`, `ErrorBoundary.jsx`, `validWords.txt` (~14.8k words).
- Tests live next to the code as `*.test.js` (`evaluate.test.js`, `streak.test.js`).

## Conventions
- Warm "Ink & Gold" palette: `#0F0E0C` bg, `#1C1A16` cards, `#2C2820` borders,
  `#C9A84C` amber, `#F5F0E8` warm white. Barlow Condensed (headings), DM Sans (body).
- Push directly to `master` — no PRs unless asked.
- Verify every change with `npm run build` (and `npm test` for logic).
- Daily puzzles are date-seeded and must be identical for every user/browser.

## Recent work (last session)
A full code audit + fix pass: bug fixes, route code-splitting, accessibility
(keyboard nav, focus rings, reduced-motion, high-contrast mode in Words),
security headers, a generated OG image, and a Vitest test foundation. All
verified working on the live site.

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
