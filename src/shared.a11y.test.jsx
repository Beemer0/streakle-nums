// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Window } from 'happy-dom'
import { AuthContext } from './AuthContext'

// Accessibility of the pieces every page shares: GameShell's and PageShell's
// landmarks, the Archive calendar, the account menu, the sign-in page and
// reduced motion.

const { saveResult } = vi.hoisted(() => ({ saveResult: vi.fn() }))
vi.mock('./saveResult', () => ({ saveResult }))

// The Archive reads the player's results for one game (`results`); pool
// lookups answer `isMember`; sign-in never leaves the page.
let results = []
let isMember = false
vi.mock('./supabase', () => {
  const query = () => {
    const q = { select: () => q, eq: () => q, then: (res, rej) => Promise.resolve({ data: results, error: null }).then(res, rej) }
    return q
  }
  return {
    supabase: {
      auth: { signInWithOAuth: async () => ({ error: null }) },
      rpc: async () => ({ data: isMember, error: null }),
      from: query,
    },
  }
})

const { default: GameShell } = await import('./GameShell.jsx')
const { default: PageShell } = await import('./PageShell.jsx')
const { default: Archive } = await import('./Archive.jsx')
const { default: UserMenu } = await import('./UserMenu.jsx')
const { default: LoginPage } = await import('./LoginPage.jsx')

const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')

let nextId = 0
const newUser = (meta = {}) => {
  const id = `u-a11y-${++nextId}`
  return { id, email: `${id}@example.com`, user_metadata: meta }
}

let host, root
async function render(user, ui) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user, signOut: () => {} }}>{ui}</AuthContext.Provider>)
  })
  await act(async () => {}) // let the Archive / pool reads settle
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 23, 12)) // Friday, October 23, 2026
  results = []
  isMember = false
})
afterEach(() => {
  if (root) { act(() => root.unmount()); host.remove(); root = null }
  vi.useRealTimers()
})

const click = (el) => act(async () => { el.click() })
const byLabel = (name) => host.querySelector(`[aria-label="${name}"]`)

// ─── F62: landmarks ──────────────────────────────────────────────────────────
describe('GameShell landmarks', () => {
  const shell = (props = {}) => (
    <GameShell game="words" date="October 23, 2026" howTo={<p>Guess the word.</p>} onArchive={() => {}} {...props}>
      <p>The board</p>
    </GameShell>
  )

  it('puts the top bar and the footer outside <main>, as banner and contentinfo', async () => {
    await render(null, shell())
    const main = host.querySelector('main')
    const header = host.querySelector('header.gs-top')
    const footer = host.querySelector('footer.gs-foot')
    expect(host.querySelectorAll('main')).toHaveLength(1)
    expect(main.contains(footer)).toBe(false)
    expect(main.contains(header)).toBe(false)
    // A <header>/<footer> only maps to banner/contentinfo outside <main>.
    expect(header.closest('main, article, aside, nav, section')).toBeNull()
    expect(footer.closest('main, article, aside, nav, section')).toBeNull()
    expect(main.querySelector('h1').textContent).toBe('WORDS')
    expect(main.textContent).toContain('The board')
  })

  it('keeps a game\'s extra class on the page wrapper, around all three', async () => {
    await render(null, shell({ className: 'mn-main' }))
    const wrapper = host.querySelector('.gs.mn-main')
    expect(wrapper.querySelector('header.gs-top')).not.toBeNull()
    expect(wrapper.querySelector('main')).not.toBeNull()
    expect(wrapper.querySelector('footer.gs-foot')).not.toBeNull()
  })

  it('ties How to play to the panel it opens, and says Archive opens a dialog', async () => {
    await render(null, shell())
    const how = byLabel('How to play')
    expect(how.getAttribute('aria-controls')).toBeNull()
    await click(how)
    const panel = host.querySelector('section.gs-how')
    expect(how.getAttribute('aria-expanded')).toBe('true')
    expect(how.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.id).not.toBe('')
    expect(byLabel('Archive').getAttribute('aria-haspopup')).toBe('dialog')
  })
})

// The non-game pages (sign-in, privacy, Pool History, Bracket, Octagon) share
// GameShell's TopBar and footer, so they get the same banner and contentinfo.
describe('PageShell landmarks', () => {
  it('puts the top bar and the footer outside <main>, as banner and contentinfo', async () => {
    await render(newUser(), <PageShell title="POOL HISTORY"><p>The page</p></PageShell>)
    const main = host.querySelector('main')
    const header = host.querySelector('header.gs-top')
    const footer = host.querySelector('footer.gs-foot')
    expect(host.querySelectorAll('main')).toHaveLength(1)
    expect(main.contains(header)).toBe(false)
    expect(main.contains(footer)).toBe(false)
    expect(header.closest('main, article, aside, nav, section')).toBeNull()
    expect(footer.closest('main, article, aside, nav, section')).toBeNull()
    expect(header.querySelector('a.gs-back').getAttribute('href')).toBe('/')
    expect(header.querySelector('[aria-label="Account menu"]')).not.toBeNull()
    expect(main.querySelector('h1').textContent).toBe('POOL HISTORY')
    expect(main.textContent).toContain('The page')
  })
})

// ─── F57: Archive day buttons ────────────────────────────────────────────────
describe('Archive calendar', () => {
  const openArchive = (user, game = 'words') =>
    render(user, <Archive game={game} onSelectDate={() => {}} onClose={() => {}} />)
  const day = (label) => host.querySelector(`.ar-day[aria-label^="${label}"]`)

  it('names each day with its date and whether it was completed, attempted or not played', async () => {
    results = [
      { puzzle_date: '2026-10-20', completed: true },
      { puzzle_date: '2026-10-21', completed: false },
    ]
    await openArchive(newUser())
    expect(day('Tuesday, October 20').getAttribute('aria-label')).toBe('Tuesday, October 20, completed')
    expect(day('Wednesday, October 21').getAttribute('aria-label')).toBe('Wednesday, October 21, attempted')
    expect(day('Thursday, October 22').getAttribute('aria-label')).toBe('Thursday, October 22, not played')
  })

  it('marks today as the current date, and only today', async () => {
    await openArchive(newUser())
    const today = day('Friday, October 23')
    expect(today.getAttribute('aria-label')).toBe('Friday, October 23, not played')
    expect(today.getAttribute('aria-current')).toBe('date')
    expect(host.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('tells guests which days need a sign-in', async () => {
    await openArchive(null)
    expect(day('Friday, October 16').getAttribute('aria-label')).toBe('Friday, October 16, sign in to unlock')
    expect(day('Friday, October 16').disabled).toBe(true)
    expect(day('Saturday, October 17').getAttribute('aria-label')).toBe('Saturday, October 17, not played')
  })

  it('reads the new month out, and keeps focus in the dialog when an arrow disables itself', async () => {
    await openArchive(newUser(), 'mines') // calendar starts 2026-09-04
    const prev = byLabel('Previous month')
    const next = byLabel('Next month')
    const month = host.querySelector('.ar-month')
    expect(month.getAttribute('aria-live')).toBe('polite')

    prev.focus()
    await click(prev)
    expect(month.textContent).toBe('September 2026')
    expect(prev.disabled).toBe(true)
    expect(document.activeElement).toBe(next)

    await click(next)
    expect(month.textContent).toBe('October 2026')
    expect(next.disabled).toBe(true)
    expect(document.activeElement).toBe(prev)
  })

  it('opens with focus on Close archive, the dialog\'s first control', async () => {
    await openArchive(newUser())
    expect(document.activeElement).toBe(byLabel('Close archive'))
  })

  it('leaves focus on the arrow that was pressed while it stays enabled', async () => {
    await openArchive(newUser()) // Words: May to October 2026
    const prev = byLabel('Previous month')
    const next = byLabel('Next month')
    const month = host.querySelector('.ar-month')

    prev.focus()
    await click(prev)
    expect(month.textContent).toBe('September 2026')
    expect(document.activeElement).toBe(prev)
    await click(prev)
    expect(month.textContent).toBe('August 2026')
    expect(document.activeElement).toBe(prev)

    next.focus()
    await click(next)
    expect(month.textContent).toBe('September 2026')
    expect(next.disabled).toBe(false)
    expect(document.activeElement).toBe(next)
  })

  it('leaves the weekday row to the day labels', async () => {
    await openArchive(newUser())
    expect(host.querySelector('.ar-dow').getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── F61: account menu ───────────────────────────────────────────────────────
describe('account menu', () => {
  const menu = (user) => render(user, (
    <div>
      <a href="/" id="before">← All games</a>
      <UserMenu isInline />
      <button type="button" id="after">Next on the page</button>
    </div>
  ))
  const trigger = () => byLabel('Account menu')
  const signOut = () => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign out')
  const poolLink = () => [...host.querySelectorAll('a')].find(a => a.textContent.includes('Pool History'))

  it('is a disclosure button, not a menu: expanded state and the panel it controls', async () => {
    await menu(newUser())
    expect(trigger().tagName).toBe('BUTTON')
    expect(trigger().getAttribute('type')).toBe('button')
    expect(trigger().hasAttribute('aria-haspopup')).toBe(false)
    expect(trigger().getAttribute('aria-expanded')).toBe('false')

    await click(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(trigger().getAttribute('aria-controls'))
    expect(panel).not.toBeNull()
    expect(panel.contains(signOut())).toBe(true)
  })

  it('is a native button (Enter and Space work), toggling the panel open and closed', async () => {
    await menu(newUser())
    trigger().focus()
    // A real <button> turns Enter/Space into a click; happy-dom doesn't, so
    // check the element is one and drive it the way the browser would.
    expect(trigger() instanceof HTMLButtonElement).toBe(true)
    expect(document.activeElement).toBe(trigger())
    await click(trigger())
    expect(signOut()).toBeDefined()
    await click(trigger())
    expect(signOut()).toBeUndefined()
  })

  it('stays open while focus moves through it, and closes when Tab leaves it', async () => {
    isMember = true
    await menu(newUser())
    await click(trigger())
    trigger().focus()
    await act(async () => { poolLink().focus() })
    await act(async () => { signOut().focus() })
    expect(trigger().getAttribute('aria-expanded')).toBe('true')

    await act(async () => { host.querySelector('#after').focus() })
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(signOut()).toBeUndefined()
  })

  // Focus can fall to <body> with no relatedTarget while the pointer is still
  // in the panel: a click on the name or e-mail text, or (Safari, which
  // doesn't focus clicked buttons and links) a mousedown on Pool History or
  // Sign out. Closing then would swallow the click.
  it('stays open when focus falls to the page with nowhere to go', async () => {
    isMember = true
    await menu(newUser())
    trigger().focus()
    await click(trigger())

    await act(async () => { trigger().blur() })
    expect(document.activeElement).toBe(document.body)
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(signOut()).toBeDefined()

    await act(async () => { signOut().focus() })
    await act(async () => { signOut().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null })) })
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(poolLink()).toBeDefined()
    expect(signOut()).toBeDefined()
  })

  it('closes when Shift+Tab leaves it before the avatar', async () => {
    await menu(newUser())
    trigger().focus()
    await click(trigger())
    await act(async () => { host.querySelector('#before').focus() })
    expect(signOut()).toBeUndefined()
  })

  it('falls back to the initial when the avatar image is refused', async () => {
    await menu(newUser({ avatar_url: 'https://lh3.googleusercontent.com/a/avatar', full_name: 'Robin Doe' }))
    const img = trigger().querySelector('img')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img.getAttribute('alt')).toBe('')

    await act(async () => { img.dispatchEvent(new Event('error')) })
    expect(trigger().querySelector('img')).toBeNull()
    expect(trigger().textContent).toBe('R')
    expect(trigger().getAttribute('aria-label')).toBe('Account menu')
  })
})

// ─── F172: sign-in consent line ──────────────────────────────────────────────
// WCAG relative luminance contrast between two #rrggbb colours.
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const css = source('./index.css')
const tokenHex = (value) => {
  const name = value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1]
  return css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]
}

describe('sign-in page', () => {
  it('sets the consent line in a colour that reaches 4.5:1 on its card', async () => {
    await render(null, <LoginPage />)
    const line = [...host.querySelectorAll('div')].find(d => d.textContent.startsWith('By signing in you agree'))
    const card = line.parentElement
    const ratio = contrast(tokenHex(line.style.color), tokenHex(card.style.background))
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('underlines the Privacy Policy link, so colour isn\'t its only cue', async () => {
    await render(null, <LoginPage />)
    const link = [...host.querySelectorAll('a')].find(a => a.textContent === 'Privacy Policy')
    expect(link.style.textDecoration).toContain('underline')
  })
})

// ─── F175: reduced motion ────────────────────────────────────────────────────
// A separate happy-dom window that can emulate the media feature, with the
// real stylesheets loaded.
function styledWindow(prefersReducedMotion) {
  const win = new Window({ settings: { device: { prefersReducedMotion } } })
  win.document.head.innerHTML = `<style>${css}\n${source('./GameShell.css')}</style>`
  // Confetti is written the way the games write it (the shorthand); the row
  // as a longhand delay, which happy-dom also reports without the media rule.
  win.document.body.innerHTML = `
    <div id="confetti" style="animation: confetti 1.3s 650ms ease forwards"></div>
    <div id="row" style="animation: rise 0.3s ease backwards; animation-delay: 0.2s"></div>
    <div id="wordmark" class="loading-wordmark"></div>
    <div id="skeleton" class="gs-skeleton"></div>`
  const delay = (id) => win.getComputedStyle(win.document.getElementById(id)).animationDelay
  return { win, delay }
}

describe('reduced motion', () => {
  it('drops animation delays, so confetti never sits still and rows never pop in one by one', () => {
    const { win, delay } = styledWindow('reduce')
    expect(delay('confetti')).toBe('0s')
    expect(delay('row')).toBe('0s')
    win.close()
  })

  it('keeps the deliberate fade-in delays of the loading wordmark and placeholder', () => {
    const { win, delay } = styledWindow('reduce')
    expect(delay('wordmark')).toBe('0.3s')
    expect(delay('skeleton')).toBe('0.15s')
    win.close()
  })

  it('leaves delays alone for everyone else', () => {
    const { win, delay } = styledWindow('no-preference')
    expect(delay('row')).toBe('0.2s')
    win.close()
  })
})
