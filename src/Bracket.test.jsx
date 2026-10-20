// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// The archived pool, as the four reads in Bracket.loadAll return it. ANA wins
// the pool on the snapshot; the live picks below would score differently,
// which proves the Standings tab shows the frozen snapshot.
const DATA = {
  rpc: [
    { user_id: 'u-ana', display_name: 'Ana', avatar_url: null, is_admin: true, joined_at: '2026-06-10T00:00:00Z' },
    { user_id: 'u-bo', display_name: 'Bo', avatar_url: null, is_admin: false, joined_at: '2026-06-10T00:00:00Z' },
  ],
  matches: [
    { id: 1, stage: 'group', group_code: 'A', kickoff_at: '2026-06-12T19:00:00Z', team_a: 'MEX', team_b: 'RSA', team_a_locked: true, team_b_locked: true, result: 'a', score_a: 2, score_b: 0, status: 'FINISHED', excluded: false, city: 'Mexico City', venue: 'Estadio Azteca' },
    { id: 2, stage: 'final', group_code: null, kickoff_at: '2026-07-19T19:00:00Z', team_a: 'ESP', team_b: 'ARG', team_a_locked: true, team_b_locked: true, result: 'a', score_a: 1, score_b: 0, status: 'FINISHED', excluded: false, city: 'New York', venue: 'MetLife Stadium' },
  ],
  predictions: [
    { user_id: 'u-ana', match_id: 1, pick: 'b', locked_at: null },
    { user_id: 'u-bo', match_id: 1, pick: 'a', locked_at: null },
    { user_id: 'u-bo', match_id: 2, pick: 'a', locked_at: null },
  ],
  pool_archive: {
    archived_at: '2026-10-20T18:36:49Z',
    tournament: { champion: 'ESP', runner_up: 'ARG', final_score: '1-0', final_date: '2026-07-19' },
    standings: [
      { rank: 1, user_id: 'u-ana', name: 'Ana', points: 113, correct: 69, picks: 102, by_stage: { group: 45 } },
      { rank: 2, user_id: 'u-bo', name: 'Bo', points: 111, correct: 64, picks: 102, by_stage: { group: 41 } },
    ],
  },
}

let member = true
const writes = []
// A chainable stand-in for the supabase-js query builder: every builder
// method returns the chain, and awaiting it yields { data }.
function query(table) {
  const chain = {
    then: (resolve) => resolve({ data: member || table === 'matches' ? DATA[table] : (table === 'pool_archive' ? null : []), error: null }),
  }
  for (const m of ['select', 'order', 'eq', 'in', 'is']) chain[m] = () => chain
  chain.maybeSingle = () => chain
  for (const m of ['insert', 'update', 'upsert', 'delete']) chain[m] = (...args) => { writes.push([table, m, args]); return chain }
  return chain
}
vi.mock('./supabase', () => ({
  supabase: {
    from: (table) => query(table),
    rpc: (name, args) => {
      writes.push(['rpc', name, args])
      return Promise.resolve({ data: name === 'get_pool_members' ? (member ? DATA.rpc : []) : null, error: null })
    },
  },
}))

const { default: Bracket } = await import('./Bracket.jsx')

let host, root
async function render(user) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user, signOut: () => {} }}><Bracket /></AuthContext.Provider>)
  })
  await act(async () => { await Promise.resolve() })
  return host
}
const text = () => host.textContent
const buttons = () => [...host.querySelectorAll('button')].map(b => b.textContent.trim())
const click = async (label) => {
  const b = [...host.querySelectorAll('button')].find(x => x.textContent.trim() === label)
  await act(async () => { b.click() })
}

beforeEach(() => { member = true; writes.length = 0 })
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('archived World Cup pool', () => {
  it('shows members the champion, the frozen standings and read-only tabs', async () => {
    await render({ id: 'u-bo', user_metadata: {} })
    expect(text()).toContain('World Cup 2026 · Final results')
    expect(text()).toContain('Pool champion')
    expect(text()).toContain('113 points · 69 correct picks')
    expect(text()).toContain('World Cup won by')
    expect(text()).toContain('ESP')
    // Snapshot standings, not a live recount (live, Bo would lead 13 to 0).
    expect(text()).toMatch(/👑\s*AAna.*69 correct\s*113/s)
    expect(text()).toContain('Final standings, frozen')
    expect(buttons()).toEqual(expect.arrayContaining(['Standings', 'My picks', 'Tournament']))
    expect(buttons()).not.toContain('Admin')
    expect(host.querySelector('input')).toBeNull()
  })

  it('lists my picks read-only, with no lock-in and no writes', async () => {
    await render({ id: 'u-bo', user_metadata: {} })
    await click('My picks')
    expect(text()).toContain('You got 2 of 2 scored picks right')
    expect(text()).not.toMatch(/Lock in/)
    // Every day is in the past, so days start collapsed; open the first one.
    const day = [...host.querySelectorAll('[role="button"][aria-expanded="false"]')].find(el => /\d+ match/.test(el.textContent))
    await act(async () => { day.click() })
    const pickButtons = [...host.querySelectorAll('button.bk-btn')]
    expect(pickButtons.length).toBeGreaterThan(0)
    expect(pickButtons.every(b => b.disabled)).toBe(true)
    // The read-only RPCs: the roster, and the account menu's membership lookup.
    expect(writes.filter(([, op]) => !['get_pool_members', 'is_member_of'].includes(op))).toEqual([])
  })

  it('tells signed-in non-members the pool has ended, with no join form', async () => {
    member = false
    await render({ id: 'u-new', user_metadata: {} })
    expect(text()).toContain('This pool has ended')
    expect(host.querySelector('input')).toBeNull()
    expect(writes.some(([, name]) => name === 'join_pool')).toBe(false)
  })

  it('tells signed-out visitors the pool has ended', async () => {
    await render(null)
    expect(text()).toContain('The World Cup 2026 pool has ended')
    expect(text()).toContain('Sign in')
  })
})
