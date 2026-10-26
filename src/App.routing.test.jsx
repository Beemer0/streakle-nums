// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { PAGE_SEO, PRERENDERED } from './seo'
import { GAMES } from './games'

// Home reads the player's results; nothing here is signed in.
vi.mock('./saveResult', () => ({ saveResult: vi.fn(), sendPendingResults: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: {} }))

const { default: AppRoutes } = await import('./App.jsx')

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ROUTE_PATHS = [...read('./App.jsx').matchAll(/<Route path="([^"]+)"/g)].map(m => m[1])
const REWRITES = JSON.parse(read('../vercel.json')).rewrites
// Vercel's sources here are plain regex groups ("/(a|b)"), anchored like Vercel does.
const rewritten = (path) => REWRITES.some(r => new RegExp(`^${r.source}$`).test(path))
const prerendered = new Set(PRERENDERED.map(key => PAGE_SEO[key].path))

describe('what Vercel serves', () => {
  it('serves every route as a prerendered page or through a rewrite', () => {
    const routes = ROUTE_PATHS.filter(p => p !== '*')
    expect(routes.length).toBeGreaterThan(10)
    // A route that is neither would get a 404 status before the SPA boots
    // (that took /pools, /bracket and /octagon down once).
    expect(routes.filter(p => !prerendered.has(p) && !rewritten(p))).toEqual([])
    // A trailing slash reaches the private pages too.
    expect(routes.filter(p => !prerendered.has(p)).every(p => rewritten(`${p}/`))).toBe(true)
  })

  it('rewrites only those routes, so any other URL gets 404.html with a 404', () => {
    expect(REWRITES.every(r => r.destination === '/')).toBe(true)
    for (const path of ['/no-such-page', '/words/extra', '/index.php', '/ads.txt', '/pools/x']) {
      expect(rewritten(path)).toBe(false)
    }
  })

  it('has a prerendered page for every PRERENDERED key, and a not-found page with no address', () => {
    expect(PRERENDERED.every(key => PAGE_SEO[key]?.path)).toBe(true)
    expect(PAGE_SEO.notFound.path).toBeUndefined()
    expect(PAGE_SEO.notFound.noindex).toBe(true)
  })
})

describe('an unknown URL', () => {
  let host, root
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    window.history.replaceState(null, '', '/')
  })

  async function renderAt(path) {
    window.history.replaceState(null, '', path)
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: null, loading: false, signOut: async () => true }}>
          <AppRoutes />
        </AuthContext.Provider>,
      )
    })
  }

  it('shows the not-found page, marked noindex with no canonical link, and links every game', async () => {
    await renderAt('/no-such-page')
    await vi.waitFor(() => expect(host.querySelector('h1')?.textContent).toBe('PAGE NOT FOUND'))
    // useSeo writes the head in an effect, which can run after the h1 shows.
    await vi.waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex'))
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.title).toBe(PAGE_SEO.notFound.title)
    const links = [...host.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(links).toEqual(expect.arrayContaining(['/', ...GAMES.map(g => g.path)]))
    // It has PageShell's top bar (with Sign in), so no floating banner.
    expect(host.querySelector('.sign-in-banner')).toBeNull()
    expect(host.querySelector('header .gs-signin')).not.toBeNull()
  })

  it('leaves the floating Sign in link to Home', async () => {
    await renderAt('/')
    await vi.waitFor(() => expect(host.querySelector('.sign-in-banner')).not.toBeNull())
  })
})
