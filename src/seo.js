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
      'Streakle is a daily set of seven puzzle games — NHL, NFL and MMA knowledge grids, a word guess, a word-grouping puzzle, a number puzzle and a no-guess minesweeper. New puzzles daily.',
    path: '/',
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
      'A private World Cup 2026 prediction pool — pick winners for every match and climb the leaderboard.',
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
}

// Streakle is a client-rendered SPA, so every route otherwise inherits the
// homepage metadata baked into index.html. This applies the per-route
// <title>, meta description, canonical link, social tags and JSON-LD.
export function useSeo({ title, description, path, jsonLd, noindex }) {
  useEffect(() => {
    document.title = title
    const url = SITE_URL + path

    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
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

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
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
