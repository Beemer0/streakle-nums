// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// One upcoming event with one fight, as Octagon.loadAll reads them.
const PEOPLE = [
  { user_id: 'u-ana', display_name: 'Ana', avatar_url: null, is_admin: true },
  { user_id: 'u-bo', display_name: 'Bo', avatar_url: null, is_admin: false },
  { user_id: 'u-new', display_name: 'Neo', avatar_url: null, is_admin: false },
]
const DATA = {
  ufc_events: [{ id: 1, name: 'UFC 999', starts_at: '2099-01-01T03:00:00Z', wiki_slug: null }],
  fights: [{ id: 10, event_id: 1, bout_order: 1, fighter_a: 'Topuria', fighter_b: 'Pimblett', weight_class: 'Lightweight', rounds: 5, favorite: 'a', scratched: false, winner: null }],
  fight_picks: [],
}
const INVITE = 'right-code'

let viewer = null
let members = []
const calls = []
const isMember = () => members.includes(viewer)
// A chainable stand-in for the supabase-js query builder: awaiting it yields
// the table's rows, which RLS leaves empty for non-members.
function query(table) {
  const chain = { then: (resolve) => resolve({ data: isMember() ? DATA[table] : [], error: null }) }
  for (const m of ['select', 'order', 'eq']) chain[m] = () => chain
  return chain
}
vi.mock('./supabase', () => ({
  supabase: {
    from: (table) => query(table),
    rpc: (name, args) => {
      calls.push([name, args])
      if (name === 'join_pool') {
        const ok = args.pool === 'octagon' && args.code === INVITE
        if (ok) members = [...members, viewer]
        return Promise.resolve({ data: ok, error: null })
      }
      if (name === 'get_pool_members') {
        const roster = isMember() && args.pool === 'octagon' ? PEOPLE.filter(p => members.includes(p.user_id)) : []
        return Promise.resolve({ data: roster, error: null })
      }
      return Promise.resolve({ data: false, error: null })
    },
  },
}))

// The account menu's Pool History item learns of an in-page join through
// refreshPoolMemberships.
const { refreshPoolMemberships } = vi.hoisted(() => ({ refreshPoolMemberships: vi.fn() }))
vi.mock('./usePoolMemberships', () => ({
  refreshPoolMemberships,
  usePoolMemberships: () => ({ poolIds: [], error: null }),
}))

const { default: Octagon } = await import('./Octagon.jsx')

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

let host, root
async function render(user) {
  viewer = user?.id ?? null
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user, signOut: () => {} }}><Octagon /></AuthContext.Provider>)
  })
  await flush()
}
const text = () => host.textContent
const buttons = () => [...host.querySelectorAll('button')].map(b => b.textContent.trim())
async function typeCode(value) {
  const input = host.querySelector('input')
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setValue.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submitJoin() {
  await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  await flush()
}

beforeEach(() => { members = ['u-ana', 'u-bo']; calls.length = 0; refreshPoolMemberships.mockClear() })
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('Octagon pick\'em', () => {
  it('sits in the site frame: top bar, title and footer', async () => {
    await render({ id: 'u-bo', user_metadata: {} })
    expect(host.querySelector('main header.gs-top a.gs-back').getAttribute('href')).toBe('/')
    expect(host.querySelector('header.gs-top [aria-label="Account menu"]')).not.toBeNull()
    expect([...host.querySelectorAll('h1')].map(h => [h.className, h.textContent])).toEqual([['gs-title', 'OCTAGON']])
    expect(host.querySelector('.gs-by').textContent).toBe('UFC Pick\'em · by Streakle')
    const footer = host.querySelector('footer.gs-foot')
    expect(footer.querySelector('a').getAttribute('href')).toBe('/privacy')
    expect(host.querySelector('main').contains(footer)).toBe(false)
  })

  it('shows members the event card with their tabs', async () => {
    await render({ id: 'u-bo', user_metadata: {} })
    expect(buttons()).toEqual(expect.arrayContaining(['📖 Rules', 'Event', 'Standings']))
    expect(buttons()).not.toContain('Admin')
    expect(text()).toContain('UFC 999')
    expect(text()).toContain('Topuria')
    expect(text()).toContain('Pimblett')
    expect(calls).toContainEqual(['get_pool_members', { pool: 'octagon' }])
  })

  it('gives the admin an Admin tab', async () => {
    await render({ id: 'u-ana', user_metadata: {} })
    expect(buttons()).toEqual(expect.arrayContaining(['Event', 'Standings', 'Admin']))
  })

  it('lets a signed-in non-member join with the invite code', async () => {
    await render({ id: 'u-new', user_metadata: {} })
    expect(text()).toContain('Join the pool')
    expect(buttons()).not.toContain('Event')

    await typeCode('nope')
    await submitJoin()
    expect(text()).toContain('Wrong code — try again')
    expect(refreshPoolMemberships).not.toHaveBeenCalled()

    await typeCode(INVITE)
    await submitJoin()
    expect(calls).toContainEqual(['join_pool', { pool: 'octagon', code: INVITE }])
    expect(refreshPoolMemberships).toHaveBeenCalledTimes(1)
    expect(buttons()).toEqual(expect.arrayContaining(['Event', 'Standings']))
    expect(host.querySelector('input')).toBeNull()
  })

  it('asks signed-out visitors to sign in, from the card and the top bar', async () => {
    await render(null)
    expect(text()).toContain('Private UFC pick\'em')
    expect(host.querySelector('header.gs-top a.gs-signin').getAttribute('href')).toBe('/login')
    expect(host.querySelector('input')).toBeNull()
  })
})
