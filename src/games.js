// Home's sections, in order; each game names its group.
export const GROUPS = [
  { key: 'word', label: 'Word games' },
  { key: 'logic', label: 'Logic' },
  { key: 'sports', label: 'Sports trivia' },
]

// The daily games, in Home's display order: grouped, newest first within a
// group. `color` is the game's deep accent (Home's row stripe, icon and badge
// tint); `accent` its light tone on dark.
export const GAMES = [
  {
    key: 'scramble',
    group: 'word',
    path: '/scramble',
    title: 'SCRAMBLE',
    emoji: '🔀',
    description: 'Find six crossing words hidden in seven letters — in any order you like.',
    color: '#9D174D',
    accent: '#F9A8D4',
    badge: 'Unscramble It',
  },
  {
    key: 'weave',
    group: 'word',
    path: '/weave',
    title: 'WEAVE',
    emoji: '🧶',
    description: 'Swap scrambled letters until three words read across and three down.',
    color: '#115E59',
    accent: '#5EEAD4',
    badge: 'Untangle It',
  },
  {
    key: 'words',
    group: 'word',
    path: '/words',
    title: 'WORDS',
    emoji: '🔤',
    description: 'Guess the 5-letter word in 6 tries. Learn something new every day.',
    color: '#5B21B6',
    accent: '#C4B5FD',
    badge: 'Guess It',
  },
  {
    key: 'link',
    group: 'word',
    path: '/link',
    title: 'LINK',
    emoji: '🔗',
    description: 'Find 4 groups of 4 words that share something in common.',
    color: '#166534',
    accent: '#86EFAC',
    badge: 'Group It',
  },
  {
    key: 'mines',
    group: 'logic',
    path: '/mines',
    title: 'MINES',
    emoji: '💣',
    description: 'Sweep three no-guess minefields — Easy, Medium, Hard. Logic only, never luck.',
    color: '#9A3412',
    accent: '#FDBA74',
    badge: 'Sweep It',
  },
  {
    key: 'nums',
    group: 'logic',
    path: '/nums',
    title: 'NUMS',
    emoji: '🔢',
    description: 'Swap numbers so every row and column contains 1–7.',
    color: '#1E40AF',
    accent: '#93C5FD',
    badge: 'Swap It',
  },
  {
    key: 'faceoff',
    group: 'sports',
    path: '/faceoff',
    title: 'FACEOFF',
    emoji: '🏒',
    description: 'Test your NHL knowledge. Match players to teams and awards in the grid.',
    color: '#0C4A6E',
    accent: '#7DD3FC',
    badge: 'Know It',
  },
  {
    key: 'gridiron',
    group: 'sports',
    path: '/gridiron',
    title: 'GRIDIRON',
    emoji: '🏈',
    description: 'Test your NFL knowledge. Match players to teams and awards in the grid.',
    color: '#991B1B',
    accent: '#FCA5A5',
    badge: 'Know It',
  },
  {
    key: 'knockout',
    group: 'sports',
    path: '/knockout',
    title: 'KNOCKOUT',
    emoji: '🥊',
    description: 'Name MMA fighters by promotion, weight class, and achievement.',
    color: '#7F1D1D',
    accent: '#FCA5A5',
    badge: 'Know It',
  },
]

export const GAME_BY_KEY = Object.fromEntries(GAMES.map(g => [g.key, g]))

/** The game after `key` in Home's order, wrapping round — a result card's "Next" link. */
export function nextGame(key) {
  const i = GAMES.findIndex(g => g.key === key)
  return GAMES[(i + 1) % GAMES.length]
}

/** True for a game page's path: '/weave', '/weave/', '/Weave' (routes match case-insensitively). */
export function isGamePath(pathname) {
  const lower = pathname.toLowerCase()
  const path = lower.length > 1 ? lower.replace(/\/+$/, '') : lower
  return GAMES.some(g => g.path === path)
}
