// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Octagon for keyboard and screen-reader members: the Rules and Lineage
// modals hold focus, a fight's "everyone's picks" is a real disclosure button
// over a list, graded picks say hit or miss in words and glyphs, every toggle
// reports its pressed state, flashes and the join error are alerts, and
// fields are named with a visible focus ring.

const PEOPLE = [
  { user_id: 'u-ana', display_name: 'Ana', avatar_url: null, is_admin: true },
  { user_id: 'u-bo', display_name: 'Bo', avatar_url: null, is_admin: false },
  { user_id: 'u-new', display_name: 'Neo', avatar_url: null, is_admin: false },
]
const ANA = { id: 'u-ana', user_metadata: {} }
const BO = { id: 'u-bo', user_metadata: {} }
const NEO = { id: 'u-new', user_metadata: {} }

// An open event (picks not locked yet) and a finished, graded one.
const UPCOMING = { id: 1, name: 'UFC 999', starts_at: '2099-01-01T03:00:00Z', wiki_slug: null }
const OPEN_FIGHT = { id: 10, event_id: 1, bout_order: 1, fighter_a: 'Topuria', fighter_b: 'Pimblett', weight_class: 'Lightweight', rounds: 5, favorite: 'a', scratched: false, winner: null }
const PAST = { id: 2, name: 'UFC 300', starts_at: '2024-04-14T02:00:00Z', wiki_slug: null }
const GRADED_FIGHT = { id: 20, event_id: 2, bout_order: 1, fighter_a: 'Pereira', fighter_b: 'Hill', weight_class: 'Light Heavyweight', rounds: 5, favorite: 'a', scratched: false, winner: 'a', method: 'ko', end_round: 1 }
// Ana: right winner and method, wrong round, locked → (10 + 5) × 2 = 30.
// Bo: wrong winner → 0.
const GRADED_PICKS = [
  { user_id: 'u-ana', fight_id: 20, event_id: 2, winner: 'a', method: 'ko', round: 2, is_lock: true, created_at: '2024-04-10T00:00:00Z' },
  { user_id: 'u-bo', fight_id: 20, event_id: 2, winner: 'b', method: 'dec', round: null, is_lock: false, created_at: '2024-04-11T00:00:00Z' },
]
const OPEN_DATA = { ufc_events: [UPCOMING], fights: [OPEN_FIGHT], fight_picks: [] }
const GRADED_DATA = { ufc_events: [PAST], fights: [GRADED_FIGHT], fight_picks: GRADED_PICKS }
const BOTH_DATA = { ufc_events: [PAST, UPCOMING], fights: [GRADED_FIGHT, OPEN_FIGHT], fight_picks: GRADED_PICKS }
const INVITE = 'right-code'

let viewer = null
let members = []
let data = OPEN_DATA
let writeError = null
const isMember = () => members.includes(viewer)
// A chainable stand-in for the supabase-js query builder: awaiting a read
// yields the table's rows (empty for non-members, as RLS does); awaiting a
// write (upsert/insert/update/delete) yields `writeError`.
function query(table) {
  let write = false
  const chain = {
    then: (resolve) => resolve(write
      ? { data: null, error: writeError }
      : { data: isMember() ? data[table] : [], error: null }),
  }
  for (const m of ['select', 'order', 'eq', 'single']) chain[m] = () => chain
  for (const m of ['upsert', 'insert', 'update', 'delete']) chain[m] = () => { write = true; return chain }
  return chain
}
vi.mock('./supabase', () => ({
  supabase: {
    from: (table) => query(table),
    rpc: (name, args) => {
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

const { refreshPoolMemberships } = vi.hoisted(() => ({ refreshPoolMemberships: vi.fn() }))
vi.mock('./usePoolMemberships', () => ({
  refreshPoolMemberships,
  usePoolMemberships: () => ({ poolIds: [], error: null }),
}))

const { default: Octagon } = await import('./Octagon.jsx')

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

let host, root
async function render(user, tables = OPEN_DATA) {
  data = tables
  viewer = user?.id ?? null
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user, signOut: () => {} }}><Octagon /></AuthContext.Provider>)
  })
  await flush()
}

// What a screen reader hears: aria-labelledby, else aria-label, else the
// text with aria-hidden parts removed (sr-only text stays).
function heard(el) {
  const ids = el.getAttribute('aria-labelledby')
  if (ids) return ids.split(' ').map(id => heard(document.getElementById(id))).join(' ')
  if (el.hasAttribute('aria-label')) return el.getAttribute('aria-label')
  const copy = el.cloneNode(true)
  copy.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove())
  return copy.textContent.replace(/\s+/g, ' ').trim()
}
// Each fight's disclosure is named for its bout, so a screen reader's list of
// buttons can tell them apart.
const PICKS = "Everyone's picks: Pereira vs Hill"
const button = (name, scope = host) => [...scope.querySelectorAll('button')].find(b => heard(b) === name)
const group = (name, scope = host) => [...scope.querySelectorAll('[role="group"]')].find(g => heard(g) === name)
const fighter = (card, name) => [...card.querySelectorAll('button.oc-fbtn')].find(b => b.firstElementChild.textContent === name)
const pressed = (el) => el.getAttribute('aria-pressed')
// The innermost element whose text starts with `start`.
const textEl = (start) => [...host.querySelectorAll('div, span')].filter(d => d.textContent.startsWith(start)).pop()
async function click(el) {
  await act(async () => { el.click() })
  await flush()
}
async function key(target, init) {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  await act(async () => { target.dispatchEvent(e) })
  return e
}
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

beforeEach(() => { members = ['u-ana', 'u-bo']; writeError = null; refreshPoolMemberships.mockClear() })
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('Octagon modals', () => {
  it('opens Rules as a focused, trapped dialog and Escape hands focus back to the trigger', async () => {
    await render(BO)
    const trigger = button('📖 Rules')
    trigger.focus()
    await click(trigger)

    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Pool rules')
    // The dialog is the panel, not the full-screen backdrop around it.
    expect(dialog.style.position).not.toBe('fixed')
    expect(dialog.parentElement.hasAttribute('role')).toBe(false)
    const close = button('Close', dialog)
    expect(document.activeElement).toBe(close)

    // Tab and Shift+Tab wrap inside the panel (✕ is its only control).
    expect((await key(close, { key: 'Tab' })).defaultPrevented).toBe(true)
    expect((await key(close, { key: 'Tab', shiftKey: true })).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    // A click inside the panel leaves it open; Escape closes it.
    await click(dialog)
    expect(host.querySelector('[role="dialog"]')).toBe(dialog)
    await key(window, { key: 'Escape' })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('opens Lineage as a focused dialog, its ✕ returns focus to Lineage, and event names are readable', async () => {
    await render(BO, GRADED_DATA)
    await click(button('Standings'))
    const trigger = button('Lineage')
    trigger.focus()
    await click(trigger)

    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Belt lineage')
    expect(dialog.style.position).not.toBe('fixed')
    expect(document.activeElement).toBe(button('Close', dialog))
    // F172: the lineage's event line is informational, so --muted, not --faint.
    const eventLine = [...dialog.querySelectorAll('div')].find(d => d.textContent === 'UFC 300')
    expect(eventLine.style.color).toBe('var(--muted)')

    await click(button('Close', dialog))
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})

describe('Octagon fight cards after the start', () => {
  const card = () => group('Main event: Pereira vs Hill')

  it('discloses everyone\'s picks from a real toggle button over a list region, never a role=button card', async () => {
    await render(BO, GRADED_DATA)
    const c = card()
    expect(c.hasAttribute('tabindex')).toBe(false)
    expect(c.closest('[role="button"]')).toBeNull()
    expect(c.querySelector('[role="button"]')).toBeNull()

    const toggle = button(PICKS, c)
    expect(toggle.tagName).toBe('BUTTON')
    expect(toggle.getAttribute('type')).toBe('button')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(c.querySelector('[role="region"]')).toBeNull()

    toggle.focus()
    await click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const region = document.getElementById(toggle.getAttribute('aria-controls'))
    expect(region.getAttribute('role')).toBe('region')
    expect(region.getAttribute('aria-label')).toBe(PICKS)
    expect(region.contains(toggle)).toBe(false)
    const rows = [...region.querySelectorAll('ul > li')]
    expect(rows.map(li => li.textContent)).toEqual([expect.stringContaining('Bo (you)'), expect.stringContaining('Ana')])
    expect(document.activeElement).toBe(toggle)

    await click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(c.querySelector('[role="region"]')).toBeNull()
    expect(document.activeElement).toBe(toggle)

    // Pointer users can still tap anywhere on the card.
    await click(textEl('Tap to see everyone'))
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('marks each graded layer with a ✓/✗ glyph and says correct or wrong', async () => {
    await render(BO, GRADED_DATA)
    await click(button(PICKS, card()))
    const [bo, ana] = card().querySelectorAll('[role="region"] li')

    expect(ana.textContent).toContain('✓ Pereira')
    expect(ana.textContent).toContain('KO/TKO ✓')
    expect(bo.textContent).toContain('✗ Hill')
    for (const glyph of [...ana.querySelectorAll('[aria-hidden="true"]'), ...bo.querySelectorAll('[aria-hidden="true"]')]) {
      expect(glyph.textContent).not.toMatch(/correct|wrong/)
    }

    expect(heard(ana)).toContain('Lock of the Night:')
    expect(heard(ana)).toContain('Pereira, correct')
    expect(heard(ana)).toContain('KO/TKO, correct')
    expect(heard(ana)).toContain('Round 2, wrong')
    expect(heard(ana)).toContain('+30 points')
    expect(heard(bo)).toContain('Hill, wrong')
    expect(heard(bo)).toContain('Decision, wrong')
    expect(heard(bo)).toContain('0 points')
    expect([...ana.querySelectorAll('.sr-only')].map(n => n.textContent)).toEqual(expect.arrayContaining([', correct', ', wrong']))
  })

  // The admin enters the winner, the method and the round one at a time, and
  // members poll in between: a bonus layer nothing has decided yet gets no
  // verdict (null) rather than a false "wrong"; a missed winner decides all.
  const verdict = (li, label) => heard(li).match(new RegExp(`${label}, (correct|wrong)`))?.[1] ?? null
  it.each([
    ['only the winner is in', { method: null, end_round: null }, { Pereira: 'correct', 'KO/TKO': null, 'Round 2': null }],
    ['the method is in but not the round', { method: 'ko', end_round: null }, { Pereira: 'correct', 'KO/TKO': 'correct', 'Round 2': null }],
    ['a round is left over after the method was cleared', { method: null, end_round: 2 }, { Pereira: 'correct', 'KO/TKO': null, 'Round 2': null }],
    ['it went to a decision', { method: 'dec', end_round: null }, { Pereira: 'correct', 'KO/TKO': 'wrong', 'Round 2': 'wrong' }],
    ['it was a draw', { winner: 'draw', method: null, end_round: null }, { Pereira: 'wrong', 'KO/TKO': 'wrong', 'Round 2': 'wrong' }],
  ])('says correct or wrong only for decided layers when %s', async (_, result, anaHears) => {
    await render(BO, { ...GRADED_DATA, fights: [{ ...GRADED_FIGHT, ...result }] })
    await click(button(PICKS, card()))
    const [bo, ana] = card().querySelectorAll('[role="region"] li')

    for (const [label, said] of Object.entries(anaHears)) expect([label, verdict(ana, label)]).toEqual([label, said])
    // Bo picked the loser, so his method is already a miss.
    expect(verdict(bo, 'Hill')).toBe('wrong')
    expect(verdict(bo, 'Decision')).toBe('wrong')
  })
})

describe('Octagon toggles report their state', () => {
  it('fighter, method, round and Lock buttons are pressed toggles, and the Lock keeps its name', async () => {
    await render(BO)
    const c = group('Main event: Topuria vs Pimblett')
    expect(pressed(fighter(c, 'Topuria'))).toBe('false')
    expect(pressed(fighter(c, 'Pimblett'))).toBe('false')

    await click(fighter(c, 'Topuria'))
    expect(pressed(fighter(c, 'Topuria'))).toBe('true')
    expect(pressed(fighter(c, 'Pimblett'))).toBe('false')

    const method = group('Method +5', c)
    expect(pressed(button('KO/TKO', method))).toBe('false')
    await click(button('KO/TKO', method))
    expect(pressed(button('KO/TKO', method))).toBe('true')
    expect(pressed(button('Decision', method))).toBe('false')

    const round = group('Round +5', c)
    await click(button('R2', round))
    expect(pressed(button('R2', round))).toBe('true')
    expect(pressed(button('R1', round))).toBe('false')

    const lock = button('Lock of the Night ×2', c)
    expect(pressed(lock)).toBe('false')
    await click(lock)
    expect(button('Lock of the Night ×2', c)).toBe(lock)
    expect(pressed(lock)).toBe('true')
  })

  it('view tabs and event chips mark the one that is showing', async () => {
    await render(BO, BOTH_DATA)
    const view = group('View')
    expect(pressed(button('Event', view))).toBe('true')
    expect(pressed(button('Standings', view))).toBe('false')

    const chip = (name) => [...group('Events').querySelectorAll('button')].find(b => b.textContent.startsWith(name))
    expect(pressed(chip('UFC 999'))).toBe('true')
    expect(pressed(chip('UFC 300'))).toBe('false')
    await click(chip('UFC 300'))
    expect(pressed(chip('UFC 300'))).toBe('true')
    expect(pressed(chip('UFC 999'))).toBe('false')

    await click(button('Standings', view))
    expect(pressed(button('Event', view))).toBe('false')
    expect(pressed(button('Standings', view))).toBe('true')
  })

  it('admin toggles are pressed buttons, plain actions are not, and ✕ buttons are named', async () => {
    await render(ANA)
    await click(button('Admin'))

    expect(pressed(button('3 rounds'))).toBe('true')
    expect(pressed(button('5 rounds'))).toBe('false')
    await click(button('5 rounds'))
    expect(pressed(button('5 rounds'))).toBe('true')
    expect(pressed(button('3 rounds'))).toBe('false')
    expect(pressed(button('Favorite: None'))).toBe('true')

    expect(button('Create event').hasAttribute('aria-pressed')).toBe(false)
    expect(button('Add fight').hasAttribute('aria-pressed')).toBe(false)
    expect(button('Delete UFC 999').textContent).toBe('✕')
    expect(button('Delete Topuria vs Pimblett').textContent).toBe('✕')

    expect(pressed(button('Scratch'))).toBe('false')
    expect(pressed(button('Winner: Topuria'))).toBe('false')
    await click(button('Winner: Topuria'))
    expect(pressed(button('Winner: Topuria'))).toBe('true')
    expect(pressed(button('Winner: Pimblett'))).toBe('false')
    expect(pressed(button('Method: KO/TKO'))).toBe('false')
  })
})

describe('Octagon messages and fields', () => {
  it('reads a failed save out through an always-mounted alert, and reads a repeat again', async () => {
    writeError = { message: 'event started' }
    await render(BO)
    const alert = host.querySelector('[role="alert"]')
    expect(alert.textContent).toBe('')

    const c = group('Main event: Topuria vs Pimblett')
    await click(fighter(c, 'Topuria'))
    expect(host.querySelector('[role="alert"]')).toBe(alert)
    expect(alert.textContent).toBe('Could not save — the event may have started')
    expect(pressed(fighter(c, 'Topuria'))).toBe('false')
    // The toast wraps instead of running off a phone screen.
    const toast = alert.firstElementChild
    expect(toast.style.whiteSpace).toBe('normal')
    expect(toast.style.maxWidth).toBe('calc(100vw - 32px)')

    // Same failure again: a fresh node, so screen readers announce it again.
    await click(fighter(c, 'Topuria'))
    expect(alert.textContent).toBe('Could not save — the event may have started')
    expect(alert.firstElementChild).not.toBe(toast)
    expect(toast.isConnected).toBe(false)
  })

  it('ties the wrong-code alert to a named invite-code field', async () => {
    await render(NEO)
    const input = host.querySelector('input')
    expect(input.getAttribute('aria-label')).toBe('Invite code')
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.hasAttribute('aria-describedby')).toBe(false)
    expect(input.classList.contains('oc-field')).toBe(true)
    expect(input.style.outline).toBe('')

    await typeCode('nope')
    await submitJoin()
    const err = host.querySelector('[role="alert"][id]')
    expect(err.textContent).toBe('Wrong code — try again')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(err.id)

    await typeCode('nope2')
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.hasAttribute('aria-describedby')).toBe(false)
  })

  it('names every admin field and gives them a gold focus ring instead of outline:none', async () => {
    await render(ANA, GRADED_DATA)
    await click(button('Admin'))
    await click(button('Paste the results table'))

    const fields = [...host.querySelectorAll('input, textarea')]
    expect(fields.map(f => f.getAttribute('aria-label'))).toEqual([
      'Event name', 'Event start time', 'Wikipedia slug', 'Fighter A', 'Fighter B', 'Weight class', 'Pasted results table',
    ])
    expect(host.querySelector('input[type="datetime-local"]').getAttribute('aria-label')).toBe('Event start time')
    for (const f of fields) {
      expect(f.classList.contains('oc-field')).toBe(true)
      expect(f.style.outline).toBe('')
    }
    const css = [...host.querySelectorAll('style')].map(s => s.textContent).join('')
    expect(css).toContain('.oc-field:focus-visible{outline:2px solid var(--gold)')
  })

  it('shows the pick hints in --muted, which reaches 4.5:1, not --faint', async () => {
    await render(BO)
    expect(textEl('Don\'t forget your ★ Lock').style.color).toBe('var(--muted)')
    expect(textEl('Tap a fighter to pick').style.color).toBe('var(--muted)')
  })
})
