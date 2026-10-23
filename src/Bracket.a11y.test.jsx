// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// The archived pool, shaped like Bracket.test.jsx's: Bo is the viewer. Match 1
// (group): Bo picked MEX (right), Ana picked RSA (wrong). Match 2 (final): Bo
// picked ESP (right), Ana didn't pick.
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

// A chainable stand-in for the supabase-js query builder, as in
// Bracket.test.jsx, except eq() filters list reads (the per-match refetch).
function query(table) {
  const filters = []
  const chain = {
    then: (resolve) => {
      const rows = DATA[table]
      const data = Array.isArray(rows) ? rows.filter(r => filters.every(([c, v]) => r[c] === v)) : rows
      return resolve({ data, error: null })
    },
  }
  for (const m of ['select', 'order', 'in', 'is']) chain[m] = () => chain
  chain.eq = (col, val) => { filters.push([col, val]); return chain }
  chain.maybeSingle = () => chain
  return chain
}
vi.mock('./supabase', () => ({
  supabase: {
    from: (table) => query(table),
    rpc: (name, args) => Promise.resolve({ data: name === 'get_pool_members' && args?.pool === 'wc2026' ? DATA.rpc : null, error: null }),
  },
}))

const { default: Bracket } = await import('./Bracket.jsx')

let host, root
async function render(userId = 'u-bo') {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: { id: userId, user_metadata: {} }, signOut: () => {} }}><Bracket /></AuthContext.Provider>)
  })
  await act(async () => { await Promise.resolve() })
}

// The accessible name the way a screen reader builds it from content:
// aria-label wins; otherwise the text, minus aria-hidden parts.
function accName(el) {
  const label = el.getAttribute('aria-label')
  if (label) return label
  const walk = (n) => {
    if (n.nodeType === 3) return n.textContent
    if (n.nodeType !== 1 || n.getAttribute('aria-hidden') === 'true') return ''
    if (n.tagName === 'IMG') return n.getAttribute('alt') ?? ''
    return [...n.childNodes].map(walk).join('')
  }
  return walk(el).replace(/\s+/g, ' ').trim()
}
const buttonNamed = (re) => [...host.querySelectorAll('button')].find(b => re.test(accName(b)))
const regionNamed = (name) => [...host.querySelectorAll('[role="region"]')].find(r => r.getAttribute('aria-label') === name)
const press = async (el) => { el.focus(); await act(async () => { el.click() }) }
const key = async (el, k, opts = {}) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts })
  await act(async () => { el.dispatchEvent(ev) })
  return ev
}
const INTERACTIVE = 'button, [role="button"], a[href], input, select, textarea'

async function openFirstDay() {
  await press(buttonNamed(/^My picks$/))
  await press(buttonNamed(/^Friday, June 12/))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'))
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('Bracket: My picks days (F82)', () => {
  it('toggles a finished day with one real button that keeps focus and reports its state', async () => {
    await render()
    await press(buttonNamed(/^My picks$/))
    const day = buttonNamed(/^Friday, June 12/)
    expect(day.tagName).toBe('BUTTON')
    expect(day.closest('h2')).not.toBeNull()
    expect(accName(day)).toBe('Friday, June 12 1 match · 1/1 correct')
    expect(day.getAttribute('aria-expanded')).toBe('false')

    await press(day)
    expect(day.isConnected).toBe(true)
    expect(document.activeElement).toBe(day)
    expect(day.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(day.getAttribute('aria-controls'))
    expect(panel.querySelectorAll('button.bk-btn').length).toBe(3)

    await press(day)
    expect(document.activeElement).toBe(day)
    expect(day.getAttribute('aria-expanded')).toBe('false')
    expect(host.querySelector('button.bk-btn')).toBeNull()
  })
})

describe('Bracket: expandable rows (F168)', () => {
  it('has no role=button wrappers and no interactive element inside another', async () => {
    await render()
    await press(buttonNamed(/^Rank 2: Bo/))
    await openFirstDay()
    await press(buttonNamed(/^Everyone's picks for MEX v RSA$/))
    await press(buttonNamed(/^Standings$/))
    await press(buttonNamed(/^Rank 2: Bo/))
    expect(host.querySelectorAll('[role="button"][aria-expanded]').length).toBe(0)
    for (const el of host.querySelectorAll(INTERACTIVE)) {
      expect(el.querySelector(`${INTERACTIVE}, [role="region"], ul`)).toBeNull()
    }
  })

  it('opens a standings row from a named toggle into a separate history region', async () => {
    await render()
    const row = buttonNamed(/^Rank 2: Bo/)
    expect(accName(row)).toBe('Rank 2: Bo (you), 64 correct 111 points')
    expect(row.getAttribute('aria-expanded')).toBe('false')

    await press(row)
    expect(document.activeElement).toBe(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    const region = regionNamed("Bo's pick history")
    expect(region.id).toBe(row.getAttribute('aria-controls'))
    expect(row.contains(region)).toBe(false)
    const items = [...region.querySelectorAll('ul > li')].map(accName)
    expect(items).toEqual([
      'ESP v ARG picked ESP, correct, 12 points',
      'MEX v RSA picked MEX, correct, 1 point',
    ])
  })

  it('opens a match from an "Everyone\'s picks" button into a list of members', async () => {
    await render()
    await openFirstDay()
    const toggle = buttonNamed(/^Everyone's picks for MEX v RSA$/)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // The card around it is no longer a button: no role, no tab stop.
    const card = toggle.closest('.bk-row').parentElement
    expect(card.getAttribute('role')).toBeNull()
    expect(card.hasAttribute('tabindex')).toBe(false)

    await press(toggle)
    expect(document.activeElement).toBe(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const region = regionNamed("Everyone's picks: MEX v RSA")
    expect(region.id).toBe(toggle.getAttribute('aria-controls'))
    expect([...region.querySelectorAll('ul > li')].map(accName)).toEqual([
      'Bo (you) picked MEX, correct',
      'Ana picked RSA, wrong',
    ])

    // The score line's team names are real buttons that open a dialog.
    const teams = [...card.querySelectorAll('button[aria-haspopup="dialog"]')].map(accName)
    expect(teams).toEqual(['MEX', 'RSA'])
  })
})

describe('Bracket: hit/miss beyond colour (F169)', () => {
  it('marks each graded pick with a glyph and says correct/wrong', async () => {
    await render()
    await openFirstDay()
    await press(buttonNamed(/^Everyone's picks for MEX v RSA$/))
    const region = regionNamed("Everyone's picks: MEX v RSA")
    const [bo, ana] = region.querySelectorAll('li')
    const glyph = (li) => [...li.querySelectorAll('[aria-hidden="true"]')].map(s => s.textContent).join('')
    expect(glyph(bo)).toContain('✓')
    expect(glyph(ana)).toContain('✗')
    // My own row's status reads as words, not a bare tick.
    const status = region.parentElement.querySelector('.bk-status')
    expect(accName(status.firstElementChild)).toBe('+1 point, correct')
  })

  it('reads my own miss as "Wrong" and a match I skipped as "No pick"', async () => {
    // Ana is the viewer here: she picked RSA (wrong) and skipped the final.
    await render('u-ana')
    await press(buttonNamed(/^My picks$/))
    await press(buttonNamed(/^Friday, June 12/))
    await press(buttonNamed(/^Sunday, July 19/))
    const statusOf = (teams) => buttonNamed(new RegExp(`^Everyone's picks for ${teams}$`)).closest('.bk-status').firstElementChild
    const glyph = (el) => [...el.querySelectorAll('[aria-hidden="true"]')].map(s => s.textContent).join('')
    expect(accName(statusOf('MEX v RSA'))).toBe('Wrong')
    expect(glyph(statusOf('MEX v RSA'))).toBe('✗')
    expect(accName(statusOf('ESP v ARG'))).toBe('No pick')
    expect(glyph(statusOf('ESP v ARG'))).toBe('—')
  })

  it('says "wrong" on a missed pick in the pick history', async () => {
    await render()
    await press(buttonNamed(/^Rank 1: Ana/))
    const region = regionNamed("Ana's pick history")
    expect([...region.querySelectorAll('ul > li')].map(accName)).toEqual(['MEX v RSA picked RSA, wrong'])
  })

  it('hides the colour-only form strip from screen readers', async () => {
    await render()
    await press(buttonNamed(/^Rank 2: Bo/))
    const region = regionNamed("Bo's pick history")
    const squares = [...region.querySelectorAll('span[title]')]
    expect(squares.length).toBe(2)
    for (const sq of squares) expect(sq.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(squares.map(s => s.title)).toEqual(['MEX v RSA: correct', 'ESP v ARG: correct'])
  })
})

describe('Bracket: pressed state on toggles (F170)', () => {
  it('reports the open view and tournament sub-tab with aria-pressed', async () => {
    await render()
    const pressed = (...names) => names.map(n => buttonNamed(new RegExp(`^${n}$`)).getAttribute('aria-pressed'))
    expect(pressed('Standings', 'My picks', 'Tournament')).toEqual(['true', 'false', 'false'])
    await press(buttonNamed(/^Tournament$/))
    expect(pressed('Standings', 'My picks', 'Tournament')).toEqual(['false', 'false', 'true'])
    expect(pressed('Groups', 'Bracket')).toEqual(['true', 'false'])
    await press(buttonNamed(/^Bracket$/))
    expect(pressed('Groups', 'Bracket')).toEqual(['false', 'true'])
  })

  it('marks my saved pick on each match', async () => {
    await render()
    await openFirstDay()
    const picks = [...host.querySelectorAll('button.bk-btn')].map(b => [accName(b), b.getAttribute('aria-pressed')])
    expect(picks).toEqual([['MEX', 'true'], ['Draw', 'false'], ['RSA', 'false']])
  })
})

describe('Bracket: modal focus (F167)', () => {
  it('moves focus into the rules dialog, keeps Tab there and returns it on Escape', async () => {
    await render()
    const rules = buttonNamed(/Rules$/)
    await press(rules)
    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog.getAttribute('aria-label')).toBe('Pool rules')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    // The dialog is the panel, not the full-screen backdrop around it.
    expect(dialog.style.position).not.toBe('fixed')
    expect(dialog.parentElement.style.position).toBe('fixed')
    const close = dialog.querySelector('button[aria-label="Close"]')
    expect(document.activeElement).toBe(close)

    expect((await key(close, 'Tab')).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)
    expect((await key(close, 'Tab', { shiftKey: true })).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    await key(close, 'Escape')
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(rules)
  })

  it('does the same for a team history opened from a match, closing on ✕', async () => {
    await render()
    await openFirstDay()
    const mex = [...host.querySelectorAll('button[aria-haspopup="dialog"]')].find(b => accName(b) === 'MEX')
    await press(mex)
    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog.getAttribute('aria-label')).toBe('MEX match history')
    const close = dialog.querySelector('button[aria-label="Close"]')
    expect(document.activeElement).toBe(close)
    await act(async () => { close.click() })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(mex)
  })
})

describe('Bracket: readable secondary text (F172)', () => {
  it('uses --faint only on disabled pick buttons', async () => {
    await render()
    const faintOutsideDisabled = () => [...host.querySelectorAll('[style*="--faint"]')]
      .filter(el => !(el.tagName === 'BUTTON' && el.disabled))
      .map(el => el.textContent)
    await press(buttonNamed(/^Rank 2: Bo/))
    expect(faintOutsideDisabled()).toEqual([])
    await openFirstDay()
    expect(faintOutsideDisabled()).toEqual([])
    await press(buttonNamed(/^Tournament$/))
    expect(faintOutsideDisabled()).toEqual([])
    await press(buttonNamed(/^Bracket$/))
    expect(host.textContent).toContain('MetLife Stadium')
    expect(faintOutsideDisabled()).toEqual([])
    await press([...host.querySelectorAll('[role="button"][aria-haspopup="dialog"]')].find(el => el.textContent === 'ESP'))
    expect(host.querySelector('[role="dialog"]').textContent).toContain('MetLife Stadium')
    expect(faintOutsideDisabled()).toEqual([])
  })
})
