// Every private pool the site has run, in display order. Who sees which pool,
// and whether it is live, comes from the database: Pool History (/pools, in
// the account menu) lists the pools the viewer belongs to (is_member_of), and a
// pool counts as past once it has a pool_archive row — archiving one moves it
// from Active to Past with no code change. A new pool needs its page, its route
// and one entry here.
export const POOLS = [
  { id: 'octagon', name: 'Octagon', kind: "UFC pick'em", path: '/octagon', emoji: '🥊' },
  { id: 'wc2026', name: 'World Cup 2026', kind: 'Prediction pool', path: '/bracket', emoji: '⚽' },
]

// The viewer's pools, split into active and past. memberIds: the pool ids they
// belong to; archives: the pool_archive rows they can read. Past pools carry
// their archive row, most recently archived first.
export function groupPools(memberIds, archives, pools = POOLS) {
  const archiveById = new Map(archives.map(a => [a.pool_id, a]))
  const mine = pools.filter(p => memberIds.includes(p.id))
  return {
    active: mine.filter(p => !archiveById.has(p.id)),
    past: mine
      .filter(p => archiveById.has(p.id))
      .map(p => ({ ...p, archive: archiveById.get(p.id) }))
      .sort((a, b) => Date.parse(b.archive.archived_at) - Date.parse(a.archive.archived_at)),
  }
}

export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th')
  return `${n}${suffix}`
}

const pts = (n) => `${n} ${n === 1 ? 'pt' : 'pts'}`

// A finished pool's recap from its frozen standings
// ([{ rank, user_id, name, points }], as stored in pool_archive): who won, then
// where the viewer finished. Shared ranks are ties.
export function finishLines(standings, userId) {
  if (!Array.isArray(standings) || standings.length === 0) return []
  const winners = standings.filter(s => s.rank === 1)
  const me = standings.find(s => s.user_id === userId)
  const tiedWith = (rank) => standings.filter(s => s.rank === rank).length > 1

  if (me?.rank === 1) {
    return [`🏆 ${tiedWith(1) ? 'You tied for 1st' : 'You won'} · ${pts(me.points)}`]
  }
  const lines = winners.length
    ? [`🏆 Won by ${winners.map(s => s.name).join(' & ')} · ${pts(winners[0].points)}`]
    : []
  if (!me) return lines
  const place = `${tiedWith(me.rank) ? 'tied ' : ''}${ordinal(me.rank)}`
  return [...lines, `You finished ${place} of ${standings.length} · ${pts(me.points)}`]
}
