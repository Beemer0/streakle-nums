// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// UserMenu asks for pool memberships; nobody here belongs to a pool.
vi.mock('./supabase', () => ({
  supabase: { rpc: () => Promise.resolve({ data: false, error: null }) },
}))

const { default: PageShell } = await import('./PageShell.jsx')

let host, root
async function render(user, props = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, signOut: () => {} }}>
        <PageShell {...props}><p>The page</p></PageShell>
      </AuthContext.Provider>
    )
  })
}
function cleanup() {
  if (!root) return
  act(() => root.unmount()); host.remove(); root = null
}
afterEach(cleanup)

const member = { id: 'u-1', email: 'u-1@example.com', user_metadata: {} }

describe('PageShell', () => {
  it('frames a page like a game: back link, title, subtitle, date, content, footer', async () => {
    await render(null, { title: 'POOL HISTORY', subtitle: 'Your private pools', date: 'May 16, 2026' })
    expect(host.querySelector('header.gs-top a.gs-back').getAttribute('href')).toBe('/')
    expect(host.querySelector('h1.gs-title').textContent).toBe('POOL HISTORY')
    expect(host.querySelector('.gs-by').textContent).toBe('Your private pools')
    expect(host.querySelector('.gs-date').textContent).toBe('May 16, 2026')
    expect(host.querySelector('main').textContent).toContain('The page')
  })

  it('keeps the top bar and the footer out of <main>', async () => {
    await render(null, { title: 'PRIVACY POLICY' })
    const footer = host.querySelector('footer.gs-foot')
    expect(footer.querySelector('a').getAttribute('href')).toBe('/privacy')
    expect(host.querySelector('main').contains(footer)).toBe(false)
    expect(host.querySelector('main').contains(host.querySelector('header.gs-top'))).toBe(false)
  })

  it('names nothing without a title', async () => {
    await render(null)
    expect(host.querySelector('h1')).toBeNull()
    expect(host.querySelector('.gs-by')).toBeNull()
    expect(host.querySelector('.gs-date')).toBeNull()
  })

  it('offers guests a sign-in link and members their account menu', async () => {
    await render(null, { title: 'PRIVACY POLICY' })
    expect(host.querySelector('a.gs-signin').getAttribute('href')).toBe('/login')
    cleanup()

    await render(member, { title: 'PRIVACY POLICY' })
    expect(host.querySelector('a.gs-signin')).toBeNull()
    expect(host.querySelector('[aria-label="Account menu"]')).not.toBeNull()
  })

  it('leaves the account side empty when asked (the sign-in page)', async () => {
    await render(null, { title: 'STREAKLE', showAccount: false })
    expect(host.querySelector('a.gs-signin')).toBeNull()
    expect(host.querySelector('a.gs-back')).not.toBeNull()
  })
})
