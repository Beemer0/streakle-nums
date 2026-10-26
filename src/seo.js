import { useEffect } from 'react'

const SITE_URL = 'https://playstreakle.com'

function gameJsonLd(name, path, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name,
    url: SITE_URL + path,
    description,
    genre: 'Puzzle',
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Streakle' },
  }
}

// Per-route metadata. Entries are module constants so each `jsonLd` object
// keeps a stable reference for the useSeo dependency array.
export const PAGE_SEO = {
  home: {
    title: 'Streakle — Start your day with a puzzle',
    description:
      'Streakle is a daily set of nine puzzle games — NHL, NFL and MMA knowledge grids, a word guess, a word-grouping puzzle, a word-swap puzzle, an anagram puzzle, a number puzzle and a no-guess minesweeper. New puzzles daily.',
    path: '/',
  },
  scramble: {
    title: 'Scramble — Daily Anagram Puzzle | Streakle',
    description:
      'Find six words hidden in seven letters in Scramble, a daily anagram puzzle. Spell them in any order and watch them fill a Scrabble-style board. Beat the clock and build your streak.',
    path: '/scramble',
    jsonLd: gameJsonLd(
      'Scramble',
      '/scramble',
      'A daily anagram puzzle: find six crossing words, from 4 to 7 letters, hidden in one set of seven letters.',
    ),
  },
  weave: {
    title: 'Weave — Daily Word Swap Puzzle | Streakle',
    description:
      'Swap scrambled letter tiles until three words read across and three read down in Weave, a daily word puzzle. Solve it in 10 swaps for a perfect five stars.',
    path: '/weave',
    jsonLd: gameJsonLd(
      'Weave',
      '/weave',
      'A daily word-swap puzzle: unscramble six crossing five-letter words in as few swaps as you can.',
    ),
  },
  mines: {
    title: 'Mines — Daily No-Guess Minesweeper | Streakle',
    description:
      'Clear three no-guess minesweeper boards a day — Easy, Medium and Hard — in Mines, a daily logic puzzle. Every board is solvable without guessing. Beat the clock and build your streak.',
    path: '/mines',
    jsonLd: gameJsonLd(
      'Mines',
      '/mines',
      'A daily no-guess minesweeper ladder: clear Easy, Medium and Hard boards by logic alone.',
    ),
  },
  faceoff: {
    title: 'Faceoff — Daily NHL Grid Puzzle | Streakle',
    description:
      'Test your NHL knowledge with Faceoff, a daily grid puzzle. Match hockey players to the teams they played for and the awards they won. A new puzzle every day.',
    path: '/faceoff',
    jsonLd: gameJsonLd(
      'Faceoff',
      '/faceoff',
      'A daily NHL knowledge grid: match hockey players to their teams and awards.',
    ),
  },
  gridiron: {
    title: 'Gridiron — Daily NFL Grid Puzzle | Streakle',
    description:
      'Test your NFL knowledge with Gridiron, a daily grid puzzle. Match football players to the teams they played for and the awards they won. A new puzzle every day.',
    path: '/gridiron',
    jsonLd: gameJsonLd(
      'Gridiron',
      '/gridiron',
      'A daily NFL knowledge grid: match football players to their teams and awards.',
    ),
  },
  knockout: {
    title: 'Knockout — Daily MMA Trivia Puzzle | Streakle',
    description:
      'Name MMA fighters by promotion, weight class and achievement in Knockout, a daily trivia grid. A new puzzle every day — build your streak.',
    path: '/knockout',
    jsonLd: gameJsonLd(
      'Knockout',
      '/knockout',
      'A daily MMA trivia grid: name fighters by promotion, weight class and achievement.',
    ),
  },
  words: {
    title: 'Words — Daily Word Game | Streakle',
    description:
      'Guess the hidden five-letter word in six tries with Words, a daily word game. Learn a fascinating fact about every word. A new puzzle every day.',
    path: '/words',
    jsonLd: gameJsonLd(
      'Words',
      '/words',
      'A daily word game: guess the hidden five-letter word in six tries.',
    ),
  },
  link: {
    title: 'Link — Daily Word Connections Puzzle | Streakle',
    description:
      'Find the four hidden groups of four connected words in Link, a daily word puzzle. A new puzzle every day — build your streak.',
    path: '/link',
    jsonLd: gameJsonLd(
      'Link',
      '/link',
      'A daily word puzzle: find the four hidden groups of four connected words.',
    ),
  },
  nums: {
    title: 'Nums — Daily Number Puzzle | Streakle',
    description:
      'Swap numbers so every row and column contains 1 to 7 in Nums, a daily logic puzzle. Use the sum clues and solve it in as few swaps as you can.',
    path: '/nums',
    jsonLd: gameJsonLd(
      'Nums',
      '/nums',
      'A daily logic puzzle: swap numbers so every row and column contains 1 to 7.',
    ),
  },
  privacy: {
    title: 'Privacy Policy | Streakle',
    description:
      'How Streakle collects, uses and protects your information — the full privacy policy, in English and French.',
    path: '/privacy',
  },
  login: {
    title: 'Sign in | Streakle',
    description:
      'Sign in to Streakle to save your progress, track your daily streaks and unlock the puzzle archive.',
    path: '/login',
  },
  bracket: {
    title: 'World Cup 2026 Pool | Streakle',
    description:
      'The final standings of a private World Cup 2026 prediction pool — every pick, every result.',
    path: '/bracket',
    noindex: true, // private pool — keep it out of search results
  },
  octagon: {
    title: 'UFC Pick\'em Pool | Streakle',
    description:
      'A private UFC pick\'em pool — call every PPV main-card fight and take the belt off your friends.',
    path: '/octagon',
    noindex: true, // private pool — keep it out of search results
  },
  pools: {
    title: 'Pool History | Streakle',
    description: 'The private Streakle pools you belong to — live pools and final results.',
    path: '/pools',
    noindex: true, // members-only — keep it out of search results
  },
  // Any URL no route matches. No path: it has no canonical address.
  notFound: {
    title: 'Page not found | Streakle',
    description: "This page doesn't exist. Today's Streakle puzzles are one click away.",
    noindex: true,
  },
}

// The public pages scripts/prerender.mjs writes a static index.html for. The
// private pools stay out so a scraper never finds them; vercel.json rewrites
// those to the SPA instead, and any other URL gets dist/404.html with a 404
// status (App.routing.test.jsx keeps the three in step).
export const PRERENDERED = [
  'home', 'scramble', 'weave', 'mines', 'faceoff', 'gridiron', 'knockout',
  'words', 'link', 'nums', 'privacy', 'login',
]

// Streakle is a client-rendered SPA, so every route otherwise inherits the
// homepage metadata baked into index.html. This applies the per-route
// <title>, meta description, canonical link, social tags and JSON-LD.
export function useSeo({ title, description, path, jsonLd, noindex }) {
  useEffect(() => {
    document.title = title
    const url = path ? SITE_URL + path : null

    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url ?? SITE_URL)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setCanonical(url)
    setJsonLd(jsonLd)
    setRobots(noindex)
  }, [title, description, path, jsonLd, noindex])
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// A page without an address of its own (the not-found page) drops the link.
function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setRobots(noindex) {
  let el = document.head.querySelector('meta[name="robots"]')
  if (!noindex) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', 'robots')
    document.head.appendChild(el)
  }
  el.setAttribute('content', 'noindex')
}

function setJsonLd(data) {
  const id = 'route-jsonld'
  const existing = document.getElementById(id)
  if (!data) {
    if (existing) existing.remove()
    return
  }
  const el = existing || document.createElement('script')
  if (!existing) {
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}
