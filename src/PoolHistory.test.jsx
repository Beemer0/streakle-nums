// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from './AuthContext'

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
// archive read mirrors its members-only RLS.
let memberOf = {}
let rpcError = null
let archiveError = null
vi.mock('./supabase', () => ({
  supabase: {
    rpc: (name, args) => Promise.resolve(rpcError
      ? { data: null, error: rpcError }
      : { data: name === 'is_member_of' && !!memberOf[args.pool], error: null }),
    from: (table) => {
      const rows = table === 'pool_archive' ? ARCHIVES.filter(a => memberOf[a.pool_id]) : []
      const result = archiveError ? { data: null, error: archiveError } : { data: rows, error: null }
      const chain = { then: (resolve) => resolve(result) }
      chain.select = () => chain
      return chain
    },
  },
}))

const { default: PoolHistory } = await import('./PoolHistory.jsx')
const { default: UserMenu } = await import('./UserMenu.jsx')

// Memberships are cached per user for the page load, so every test signs in
// as someone new unless it needs a specific standings row.
let nextId = 0
const newUser = (id = `u-${++nextId}`) => ({ id, email: `${id}@example.com`, user_metadata: {} })

let host, root
async function render(user, page = <PoolHistory />) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, signOut: () => {} }}>
        <MemoryRouter initialEntries={['/pools']}>
          <Routes>
            <Route path="/pools" element={page} />
            <Route path="/" element={<p>Home page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  })
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}
const text = () => host.textContent
const links = () => [...host.querySelectorAll('main a')].map(a => [a.getAttribute('href'), a.textContent])
const headings = () => [...host.querySelectorAll('h2')].map(h => h.textContent)

beforeEach(() => { memberOf = {}; rpcError = null; archiveError = null })
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('Pool History page', () => {
  it('lists a member\'s live pool, then their finished one, each linking through', async () => {
    memberOf = { octagon: true, wc2026: true }
    await render(newUser('u-me'))
    expect(host.querySelector('h1').textContent).toBe('POOL HISTORY')
    expect(headings()).toEqual(['Active', 'Past'])
    const [, octagon, worldCup] = links()
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
    expect(links().map(([href]) => href)).toEqual(['/', '/bracket'])
    expect(text()).not.toContain('Octagon')
  })

  it('shows an Octagon-only member their live pool', async () => {
    memberOf = { octagon: true }
    await render(newUser())
    expect(headings()).toEqual(['Active'])
    expect(links().map(([href]) => href)).toEqual(['/', '/octagon'])
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
    expect(text()).not.toMatch(/Octagon|World Cup|Pool History/i)
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
})
