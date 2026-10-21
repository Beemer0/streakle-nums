// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// UserMenu asks for pool memberships; nobody here belongs to a pool.
vi.mock('./supabase', () => ({
  supabase: { rpc: () => Promise.resolve({ data: false, error: null }) },
}))

const { default: GameShell } = await import('./GameShell.jsx')

let host, root
async function render(user, props = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, signOut: () => {} }}>
        <GameShell game="weave" date="October 21, 2026" howTo={<p>Swap tiles.</p>} onArchive={() => {}} {...props}>
          <p>The board</p>
        </GameShell>
      </AuthContext.Provider>
    )
  })
}
function cleanup() {
  if (!root) return
  act(() => root.unmount()); host.remove(); root = null
}
afterEach(cleanup)

const button = (name) => host.querySelector(`button[aria-label="${name}"]`)
const click = (el) => act(async () => { el.click() })
const text = () => host.textContent

describe('GameShell', () => {
  it('frames the game with its title, the date, the game and the footer', async () => {
    await render(null)
    expect(host.querySelector('h1').textContent).toBe('WEAVE')
    expect(text()).toContain('by Streakle')
    expect(text()).toContain('October 21, 2026')
    expect(text()).toContain('The board')
    expect(host.querySelector('footer a').getAttribute('href')).toBe('/privacy')
    expect(host.querySelector('a.gs-back').getAttribute('href')).toBe('/')
  })

  it('opens and closes the how-to panel', async () => {
    await render(null)
    expect(text()).not.toContain('Swap tiles.')
    expect(button('How to play').getAttribute('aria-expanded')).toBe('false')

    await click(button('How to play'))
    expect(button('How to play').getAttribute('aria-expanded')).toBe('true')
    expect(host.querySelector('section[aria-label="How to play"]').textContent).toContain('Swap tiles.')

    await click(button('How to play'))
    expect(text()).not.toContain('Swap tiles.')
  })

  it('opens the archive', async () => {
    const onArchive = vi.fn()
    await render(null, { onArchive })
    await click(button('Archive'))
    expect(onArchive).toHaveBeenCalledOnce()
  })

  it('offers guests a sign-in link and members their account menu', async () => {
    await render(null)
    expect(host.querySelector('a.gs-signin').getAttribute('href')).toBe('/login')
    expect(host.querySelector('[aria-label="Account menu"]')).toBeNull()
    cleanup()

    await render({ id: 'u-1', email: 'u-1@example.com', user_metadata: {} })
    expect(host.querySelector('a.gs-signin')).toBeNull()
    expect(host.querySelector('[aria-label="Account menu"]')).not.toBeNull()
  })

  it('adds the high-contrast switch only for games that support it', async () => {
    await render(null)
    await click(button('How to play'))
    expect(host.querySelector('[role="switch"]')).toBeNull()
    cleanup()

    const onToggleHc = vi.fn()
    await render(null, { hc: true, onToggleHc })
    await click(button('How to play'))
    const toggle = host.querySelector('[role="switch"]')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    await click(toggle)
    expect(onToggleHc).toHaveBeenCalledOnce()
  })
})

describe('GameLoading', () => {
  it('shows the game\'s header with today\'s date and its actions off while the game loads', async () => {
    const { GameLoading } = await import('./GameShell.jsx')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: null, signOut: () => {} }}>
          <GameLoading game="mines" />
        </AuthContext.Provider>
      )
    })
    expect(host.querySelector('h1').textContent).toBe('MINES')
    expect(host.querySelector('.gs-date').textContent).toBe(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
    expect(button('How to play').disabled).toBe(true)
    expect(button('Archive').disabled).toBe(true)
    expect(host.querySelector('[role="status"]').getAttribute('aria-label')).toBe('Loading the puzzle')
  })
})
