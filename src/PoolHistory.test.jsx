// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import { POOLS } from './pools'

// The World Cup archive as pool_archive returns it to its members.
const ARCHIVES = [{
  pool_id: 'wc2026',
  archived_at: '2026-10-20T18:36:49.190439+00:00',
  standings: [
    { rank: 1, user_id: 'u-mehdi', name: 'Mehdi', points: 113 },
    { rank: 2, user_id: 'u-ana', name: 'Ana', points: 101 },
    { rank: 3, user_id: 'u-me', name: 'Me', points: 90 },
    { rank: 4, user_id: 'u-bo', name: 'Bo', points: 72 },
  ],
}]

// Which pools the signed-in user belongs to, as is_member_of answers; the
// archive read mirrors its members-only RLS. rpcGate, when set, holds every
// is_member_of answer back until it resolves.
let memberOf = {}
let rpcError = null
let archiveError = null
let rpcGate = null
let rpcCalls = 0
vi.mock('./supabase', () => ({
  supabase: {
    rpc: (name, args) => {
      rpcCalls += 1
      const answer = () => (rpcError
        ? { data: null, error: rpcError }
        : { data: name === 'is_member_of' && !!memberOf[args.pool], error: null })
      return rpcGate ? rpcGate.then(answer) : Promise.resolve(answer())
    },
    from: (table) => {
      const rows = table === 'pool_archive' ? ARCHIVES.filter(a => memberOf[a.pool_id]) : []
      const result = archiveError && table === 'pool_archive'
        ? { data: null, error: archiveError }
        : { data: rows, error: null }
      const chain = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }
      for (const m of ['select', 'eq']) chain[m] = () => chain
      return chain
    },
  },
}))

const { default: PoolHistory } = await import('./PoolHistory.jsx')
const { default: UserMenu } = await import('./UserMenu.jsx')
const { default: Home } = await import('./Home.jsx')
const { refreshPoolMemberships } = await import('./usePoolMemberships.js')

let nextId = 0
const newUser = (id = `u-${++nextId}`) => ({ id, email: `${id}@example.com`, user_metadata: {} })

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

let host, root
function tree(user, page) {
  return (
    <AuthContext.Provider value={{ user, signOut: () => {} }}>
      <MemoryRouter initialEntries={['/pools']}>
        <Routes>
          <Route path="/pools" element={page} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}
async function render(user, page = <PoolHistory />) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => { root.render(tree(user, page)) })
  await flush()
}
// Same root, new props: components stay mounted (a sign-in switch, say).
async function rerender(user, page = <PoolHistory />) {
  await act(async () => { root.render(tree(user, page)) })
  await flush()
}
const text = () => host.textContent
// The page's own links: "← All games" sits in the banner, outside <main>.
const links = () => [...host.querySelectorAll('main a')].map(a => [a.getAttribute('href'), a.textContent])
const headings = () => [...host.querySelectorAll('h2')].map(h => h.textContent)
const POOL_NAMES = /Octagon|World Cup|Mehdi/

// Each test starts from a fresh page load: no cached memberships.
beforeEach(() => {
  memberOf = {}; rpcError = null; archiveError = null; rpcGate = null; rpcCalls = 0
  refreshPoolMemberships()
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('Pool History page', () => {
  it('lists a member\'s live pool, then their finished one, each linking through', async () => {
    memberOf = { octagon: true, wc2026: true }
    await render(newUser('u-me'))
    expect(host.querySelector('h1').textContent).toBe('POOL HISTORY')
    expect(headings()).toEqual(['Active', 'Past'])
    const [octagon, worldCup] = links()
    expect(octagon[0]).toBe('/octagon')
    expect(octagon[1]).toMatch(/Octagon.*Live.*Open pool/)
    expect(worldCup[0]).toBe('/bracket')
    expect(worldCup[1]).toMatch(/World Cup 2026.*Final results/)
    expect(text()).toContain('🏆 Won by Mehdi · 113 pts')
    expect(text()).toContain('You finished 3rd of 4 · 90 pts')
    expect(document.head.querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex')
  })

  it('shows a World Cup-only member just the finished pool', async () => {
    memberOf = { wc2026: true }
    await render(newUser())
    expect(headings()).toEqual(['Past'])
    expect(links().map(([href]) => href)).toEqual(['/bracket'])
    expect(text()).not.toContain('Octagon')
  })

  it('shows an Octagon-only member their live pool', async () => {
    memberOf = { octagon: true }
    await render(newUser())
    expect(headings()).toEqual(['Active'])
    expect(links().map(([href]) => href)).toEqual(['/octagon'])
    expect(text()).not.toContain('World Cup')
  })

  it('sends signed-in non-members home without naming a pool', async () => {
    await render(newUser())
    expect(text()).toBe('Home page')
  })

  it('sends guests home', async () => {
    await render(null)
    expect(text()).toBe('Home page')
  })

  it('says so when the lookup fails, without naming a pool', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpcError = { message: 'network down' }
    await render(newUser())
    expect(host.querySelector('[role="alert"]').textContent).toContain('Couldn\'t load this page')
    expect([...host.querySelectorAll('button')].map(b => b.textContent)).toContain('Try again')
    expect(text()).not.toMatch(POOL_NAMES)
    expect(text()).not.toMatch(/Pool History/i)
    quiet.mockRestore()
  })

  it('reports a failed archive read to members', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    memberOf = { wc2026: true }
    archiveError = { message: 'network down' }
    await render(newUser())
    expect(host.querySelector('[role="alert"]').textContent).toContain('Couldn\'t load this page')
    expect(text()).not.toMatch(/World Cup/)
    quiet.mockRestore()
  })

  it('still sends non-members home when the archive read fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    archiveError = { message: 'network down' }
    await render(newUser())
    expect(text()).toBe('Home page')
    quiet.mockRestore()
  })
})

describe('account menu', () => {
  const openMenu = async () => {
    await act(async () => { host.querySelector('[aria-label="Account menu"]').click() })
  }
  const poolLink = () => [...host.querySelectorAll('a')].find(a => a.textContent.includes('Pool History'))

  it('offers Pool History to pool members', async () => {
    memberOf = { wc2026: true }
    await render(newUser(), <UserMenu />)
    await openMenu()
    expect(poolLink().getAttribute('href')).toBe('/pools')
  })

  it('leaves it out for signed-in non-members', async () => {
    await render(newUser(), <UserMenu />)
    await openMenu()
    expect(poolLink()).toBeUndefined()
    expect(text()).toContain('Sign out')
  })

  it('renders nothing for guests', async () => {
    await render(null, <UserMenu />)
    expect(host.innerHTML).toBe('')
  })

  it('hands focus back to the avatar when Escape closes it', async () => {
    memberOf = { wc2026: true }
    await render(newUser(), <UserMenu />)
    await openMenu()
    poolLink().focus()
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(poolLink()).toBeUndefined()
    expect(document.activeElement).toBe(host.querySelector('[aria-label="Account menu"]'))
  })

  it('adds the item after an in-page join, once memberships refresh', async () => {
    await render(newUser(), <UserMenu />)
    await openMenu()
    expect(poolLink()).toBeUndefined()
    memberOf = { octagon: true }
    await act(async () => { refreshPoolMemberships() })
    await flush()
    expect(poolLink().getAttribute('href')).toBe('/pools')
  })

  it('never shows one user\'s pools to the next', async () => {
    memberOf = { wc2026: true }
    await render(newUser(), <UserMenu />)
    await openMenu()
    expect(poolLink()).toBeDefined()
    memberOf = {}
    let release
    rpcGate = new Promise(r => { release = r })
    await rerender(newUser(), <UserMenu />)
    expect(poolLink()).toBeUndefined() // while the new user's lookup is pending
    await act(async () => { release() })
    await flush()
    expect(poolLink()).toBeUndefined()
  })
})

describe('membership lookup', () => {
  it('names no pool until membership is known, even if the archive arrives first', async () => {
    memberOf = { octagon: true, wc2026: true }
    let release
    rpcGate = new Promise(r => { release = r })
    await render(newUser())
    expect(host.querySelector('[role="status"]').textContent).toBe('Loading…')
    expect(text()).not.toMatch(POOL_NAMES)
    await act(async () => { release() })
    await flush()
    expect(headings()).toEqual(['Active', 'Past'])
  })

  it('asks once per page load, shared by the menu and the page', async () => {
    memberOf = { wc2026: true }
    const user = newUser()
    await render(user) // PoolHistory plus its UserMenu
    expect(rpcCalls).toBe(POOLS.length)
    act(() => root.unmount()); host.remove()
    await render(user)
    expect(rpcCalls).toBe(POOLS.length)
  })

  it('asks again after a failed lookup', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = newUser()
    rpcError = { message: 'network down' }
    await render(user)
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    act(() => root.unmount()); host.remove()
    rpcError = null
    memberOf = { wc2026: true }
    await render(user)
    expect(headings()).toEqual(['Past'])
    quiet.mockRestore()
  })
})

describe('Home', () => {
  // Pools live in the account menu's Pool History; Home links to none of them.
  const poolLink = () => [...host.querySelectorAll('a')].find(a => ['/bracket', '/octagon', '/pools'].includes(a.getAttribute('href')))

  it('shows no pool link to members or guests', async () => {
    memberOf = { wc2026: true, octagon: true }
    await render(newUser(), <Home />)
    expect(poolLink()).toBeUndefined()
    act(() => root.unmount()); host.remove()
    await render(null, <Home />)
    expect(poolLink()).toBeUndefined()
  })
})
