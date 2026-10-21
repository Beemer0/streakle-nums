// The daily games, in Home's display order. `color` is the game's deep accent
// (Home's row stripe, badge tint); `accent` its light text tone on dark.
export const GAMES = [
  {
    key: 'scramble',
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
    path: '/weave',
    title: 'WEAVE',
    emoji: '🧶',
    description: 'Swap scrambled letters until three words read across and three down.',
    color: '#115E59',
    accent: '#5EEAD4',
    badge: 'Untangle It',
  },
  {
    key: 'mines',
    path: '/mines',
    title: 'MINES',
    emoji: '💣',
    description: 'Sweep three no-guess minefields — Easy, Medium, Hard. Logic only, never luck.',
    color: '#9A3412',
    accent: '#FDBA74',
    badge: 'Sweep It',
  },
  {
    key: 'faceoff',
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
    path: '/knockout',
    title: 'KNOCKOUT',
    emoji: '🥊',
    description: 'Name MMA fighters by promotion, weight class, and achievement.',
    color: '#7F1D1D',
    accent: '#FCA5A5',
    badge: 'Know It',
  },
  {
    key: 'words',
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
    path: '/link',
    title: 'LINK',
    emoji: '🔗',
    description: 'Find 4 groups of 4 words that share something in common.',
    color: '#166534',
    accent: '#86EFAC',
    badge: 'Group It',
  },
  {
    key: 'nums',
    path: '/nums',
    title: 'NUMS',
    emoji: '🔢',
    description: 'Swap numbers so every row and column contains 1–7.',
    color: '#1E40AF',
    accent: '#93C5FD',
    badge: 'Swap It',
  },
]

export const GAME_BY_KEY = Object.fromEntries(GAMES.map(g => [g.key, g]))

/** True for a game page's path: '/weave', '/weave/', '/Weave' (routes match case-insensitively). */
export function isGamePath(pathname) {
  const lower = pathname.toLowerCase()
  const path = lower.length > 1 ? lower.replace(/\/+$/, '') : lower
  return GAMES.some(g => g.path === path)
}
