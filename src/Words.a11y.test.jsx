// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { evaluate } from './evaluate'

// Words for screen-reader and keyboard users: a spoken board, announced
// results, named keys, focus on the result, readable key labels, and an
// Archive dialog that keeps its keys to itself.
const { saveResult } = vi.hoisted(() => ({ saveResult: vi.fn() }))
vi.mock('./saveResult', () => ({ saveResult }))

// The Archive and streak reads find no history; nobody belongs to a pool.
vi.mock('./supabase', () => {
  const query = () => {
    const q = { select: () => q, eq: () => q, then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej) }
    return q
  }
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      rpc: async () => ({ data: false, error: null }),
      from: query,
    },
  }
})

// Node 25's own (method-less, without --localstorage-file) localStorage
// shadows happy-dom's, so give the page a working in-memory one.
function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
    clear: () => { data.clear() },
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size },
  }
}
vi.stubGlobal('localStorage', memoryStorage())

const { default: WordsGame } = await import('./Words.jsx')

// The game picks WORDS[YYYYMMDD % length]; read the bank the way the checkers do.
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const WORDS = [...source('./Words.jsx').matchAll(/\{ word: "([A-Z]{5})"/g)].map(m => m[1])
const VALID = source('./validWords.txt').trim().toUpperCase().split(/\s+/)

const KEY = 'streakle-words'
const TODAY = '2026-10-21'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const ANSWER = WORDS[parseInt(TODAY.replace(/-/g, '')) % WORDS.length]
const MISSES = ['CRANE', 'SLOTH', 'PIVOT', 'MUDDY', 'WHELK', 'JAZZY', 'FROWN', 'GLYPH'].filter(w => w !== ANSWER)
// A valid guess with distinct letters that scores all three colours today.
const MIXED = VALID.find(w => {
  if (w === ANSWER || new Set(w).size !== 5) return false
  const res = evaluate(w, ANSWER)
  return ['correct', 'present', 'absent'].every(st => res.includes(st))
})
// The last tile's flip ends 4 × 150 + 800 ms after Enter.
const REVEAL = 4 * 150 + 800

const SPOKEN = { correct: 'right spot', present: 'wrong spot', absent: 'not in word' }
const spell = (w) => w.split('').join(' ')
const rowResult = (r, w) => {
  const res = evaluate(w, ANSWER)
  if (res.every(st => st === 'correct')) return `Guess ${r + 1}: ${spell(w)}, all in the right spot`
  return `Guess ${r + 1}: ` + res.map((st, i) => `${w[i]} ${SPOKEN[st]}`).join(', ')
}

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockClear()
  localStorage.clear()
})
afterEach(() => {
  unmount()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function unmount() {
  if (!root) return
  act(() => root.unmount())
  host.remove()
  root = null
}
async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><WordsGame /></AuthContext.Provider>)
  })
}
async function reload() {
  unmount()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const press = (key, target = window) => act(async () => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
})
async function type(letters) { for (const key of letters) await press(key) }
async function submit(word) { await type(word); await press('Enter') }
async function guess(word) { await submit(word); await tick(2000) }

// The text a screen reader can reach: everything outside aria-hidden subtrees.
function readable(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE || node.getAttribute('aria-hidden') === 'true') return ''
  return [...node.childNodes].map(readable).join('')
}
const boardEl = () => host.querySelector('.wd-board')
const spokenRows = () => [...boardEl().querySelectorAll('ul[aria-label="Guesses"] > li')].map(li => li.textContent)
// useAnnouncer appends a zero-width space on every other message.
const ZWSP = String.fromCharCode(0x200b)
const liveRegion = () => boardEl().previousElementSibling
const live = () => liveRegion().textContent.split(ZWSP).join('')
const key = (name) => [...host.querySelectorAll('.wd-kb button')].find(b => b.textContent === name)
const result = () => host.querySelector('section.rc')
const archiveButton = () => host.querySelector('button[aria-label="Archive"]')
const howToButton = () => host.querySelector('button[aria-label="How to play"]')
const dialog = () => document.querySelector('[role="dialog"]')

// Enter on a focused button, as a browser handles it: the page's keydown
// listeners first, then (unless one prevented it) the button activates.
async function enterOn(el) {
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  await act(async () => { el.dispatchEvent(enter) })
  if (!enter.defaultPrevented) await click(el)
  return enter
}
// A mouse press: pointerdown, then (Chrome, Firefox) the button takes focus, then the click.
async function pointerPress(el) {
  await act(async () => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.focus() })
  await click(el)
}

// Contrast from the real tokens in index.css's :root block.
const TOKENS = Object.fromEntries(
  [...source('./index.css').match(/:root\s*\{([\s\S]*?)\n\}/)[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)]
    .map(m => [m[1], m[2]]),
)
const hexOf = (value) => TOKENS[value.match(/^var\(--([\w-]+)\)$/)[1]]
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(hexOf(a)), luminance(hexOf(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// Each tile of a board row: wrapper > flipper > [front face, coloured back face].
const backFaces = (r) => {
  const row = boardEl().querySelectorAll(':scope > div[aria-hidden="true"]')[r]
  return [...row.children].map(tile => tile.firstElementChild.children[1])
}

describe('Words board for screen readers (F157)', () => {
  it('reads one line per guess, and never the tile letters (which sit on both faces)', async () => {
    await mount()
    expect(spokenRows()).toEqual(Array.from({ length: 6 }, (_, r) => `Guess ${r + 1}: empty`))

    await type(MISSES[0].slice(0, 3))
    expect(spokenRows()[0]).toBe(`Guess 1: ${spell(MISSES[0].slice(0, 3))}`)
    // Only the spoken lines are readable: no doubled "C C R R A A".
    expect(readable(boardEl())).toBe(spokenRows().join(''))
  })

  it("fills in a row's result only once its flip has finished", async () => {
    await mount()
    await submit(MISSES[0])
    expect(spokenRows()[0]).toBe(`Guess 1: ${spell(MISSES[0])}`)
    await tick(REVEAL - 1)
    expect(spokenRows()[0]).toBe(`Guess 1: ${spell(MISSES[0])}`)
    await tick(1)
    expect(spokenRows()[0]).toBe(rowResult(0, MISSES[0]))
    expect(readable(boardEl())).toBe(spokenRows().join(''))
  })

  it('has an always-mounted polite, atomic live region', async () => {
    await mount()
    expect(liveRegion().getAttribute('aria-live')).toBe('polite')
    expect(liveRegion().getAttribute('aria-atomic')).toBe('true')
    expect(live()).toBe('')
  })

  it('announces a short guess and an unknown word', async () => {
    await mount()
    await submit('CR')
    expect(live()).toBe('Not enough letters')
    await press('Backspace'); await press('Backspace')
    await submit('QZXJV')
    expect(live()).toBe('Not a valid word!')
  })

  it("announces each guess's result and the guesses left once it is revealed", async () => {
    await mount()
    await submit(MISSES[0])
    await tick(REVEAL - 1)
    expect(live()).toBe('')
    await tick(1)
    expect(live()).toBe(`${rowResult(0, MISSES[0])}. 5 guesses left.`)

    await guess(MISSES[1])
    expect(live()).toBe(`${rowResult(1, MISSES[1])}. 4 guesses left.`)
  })

  it('announces a win and moves focus to the result card', async () => {
    await mount()
    await submit(ANSWER)
    await tick(REVEAL)
    expect(live()).toBe(`Guess 1: ${spell(ANSWER)}, all in the right spot. Solved!`)

    await tick(400)
    expect(result()).not.toBeNull()
    expect(document.activeElement).toBe(result())
    // The card is named by its title, without the emoji.
    const title = document.getElementById(result().getAttribute('aria-labelledby'))
    expect(readable(title).trim()).toBe('Got it in 1!')
  })

  it('announces the answer on the sixth miss and moves focus to the result card', async () => {
    await mount()
    for (const w of MISSES.slice(0, 5)) await guess(w)
    await submit(MISSES[5])
    await tick(REVEAL + 200)
    expect(live()).toBe(`${rowResult(5, MISSES[5])}. Out of guesses. The word was ${ANSWER}.`)
    expect(document.activeElement).toBe(result())
  })

  it('leaves focus alone when a finished game is reloaded', async () => {
    await mount()
    await guess(ANSWER)
    expect(document.activeElement).toBe(result())

    await reload()
    expect(result()).not.toBeNull()
    expect(document.activeElement).not.toBe(result())
    expect(live()).toBe('')
  })

  it('names Backspace and Enter, and gives used letter keys their state', async () => {
    await mount()
    expect(key('⌫').getAttribute('aria-label')).toBe('Backspace')
    expect(key('ENTER').getAttribute('aria-label')).toBe('Enter')
    expect(key('Q').getAttribute('aria-label')).toBe('Q')

    await guess(MIXED)
    const res = evaluate(MIXED, ANSWER)
    MIXED.split('').forEach((letter, i) => {
      expect(key(letter).getAttribute('aria-label')).toBe(`${letter}, ${SPOKEN[res[i]]}`)
    })
    const untouched = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').find(l => !MIXED.includes(l))
    expect(key(untouched).getAttribute('aria-label')).toBe(untouched)
  })
})

describe('Words key label contrast (F26)', () => {
  // Inks that clear 4.5:1 on each key colour (see the KEY_INK comment).
  const INK = { correct: 'var(--bg)', present: 'var(--bg)', absent: 'var(--ink-2)' }

  it.each([
    ['standard', null, { correct: 'var(--correct)', present: 'var(--present)', absent: 'var(--absent)' }],
    ['high-contrast', '1', { correct: 'var(--hc-correct)', present: 'var(--hc-present)', absent: 'var(--absent)' }],
  ])('uses a 4.5:1 ink on every coloured key (%s colours)', async (_, hc, fill) => {
    if (hc) localStorage.setItem('streakle-hc', hc)
    await mount()
    await guess(MIXED)
    const res = evaluate(MIXED, ANSWER)
    MIXED.split('').forEach((letter, i) => {
      expect(key(letter).style.background).toBe(fill[res[i]])
      expect(key(letter).style.color).toBe(INK[res[i]])
    })
    expect(key('Q').style.color).toBe('var(--ink)')
  })
})

describe('Words tile letter contrast', () => {
  // On screens under ~609px tall a tile is under 44px, so its letters
  // (0.42 of the tile, bold) are small text and need 4.5:1, not 3:1.
  it.each([
    ['standard', null],
    ['high-contrast', '1'],
  ])('gives every revealed letter 4.5:1 against its tile (%s colours)', async (_, hc) => {
    if (hc) localStorage.setItem('streakle-hc', hc)
    await mount()
    await guess(MIXED)
    const faces = backFaces(0)
    expect(faces).toHaveLength(5)
    faces.forEach(face => {
      expect(contrast(face.style.color, face.style.background)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('uses the same ink on a green tile as on a green key', async () => {
    await mount()
    await guess(MIXED)
    const col = evaluate(MIXED, ANSWER).indexOf('correct')
    expect(backFaces(0)[col].style.color).toBe(key(MIXED[col]).style.color)
  })
})

describe('Words lost card for screen readers', () => {
  // Screen readers cancel queued speech when focus moves, so an answer put in
  // the live region before focus lands on the card would be cut off.
  it('announces the answer only after focus has moved to the lost card', async () => {
    await mount()
    for (const w of MISSES.slice(0, 5)) await guess(w)
    await submit(MISSES[5])

    let liveAtFocus = null
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (...args) {
      if (this === result()) liveAtFocus = live()
      return focus.apply(this, args)
    })
    await tick(REVEAL + 200)

    expect(document.activeElement).toBe(result())
    expect(liveAtFocus).toBe(`${rowResult(4, MISSES[4])}. 1 guess left.`)
    expect(live()).toBe(`${rowResult(5, MISSES[5])}. Out of guesses. The word was ${ANSWER}.`)
  })
})

describe('Words: Enter on a focused page button with letters typed (F160)', () => {
  it('opens the Archive from the keyboard with a full row typed, and takes no guess', async () => {
    await mount()
    await type(MISSES[0])
    archiveButton().focus()
    const enter = await enterOn(archiveButton())
    await tick(2000)

    expect(enter.defaultPrevented).toBe(false)
    expect(dialog()).not.toBeNull()
    expect(saveResult).not.toHaveBeenCalled()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(live()).toBe('')
    expect(spokenRows()[0]).toBe(`Guess 1: ${spell(MISSES[0])}`)
  })

  it('toggles How to play with a partial guess typed, and says nothing about letters', async () => {
    await mount()
    await type('AB')
    howToButton().focus()
    const enter = await enterOn(howToButton())

    expect(enter.defaultPrevented).toBe(false)
    expect(howToButton().getAttribute('aria-expanded')).toBe('true')
    expect(live()).toBe('')
    expect(spokenRows()[0]).toBe('Guess 1: A B')
  })

  it('types the letter of an on-screen key reached with Tab, even after a mouse press', async () => {
    await mount()
    await pointerPress(key('C'))
    expect(spokenRows()[0]).toBe('Guess 1: C')

    // Tab moves focus by keyboard: Enter now belongs to the focused key.
    await press('Tab', key('C'))
    key('R').focus()
    const enter = await enterOn(key('R'))

    expect(enter.defaultPrevented).toBe(false)
    expect(spokenRows()[0]).toBe('Guess 1: C R')

    // Shift+Tab back to the key the mouse pressed: keyboard focus again.
    await act(async () => {
      key('R').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    })
    key('C').focus()
    const back = await enterOn(key('C'))
    expect(back.defaultPrevented).toBe(false)
    expect(spokenRows()[0]).toBe('Guess 1: C R C')
    expect(live()).toBe('')
  })

  it('still submits the guess when the focused key or button was pressed with the mouse', async () => {
    await mount()
    const first = MISSES[0][0]
    await pointerPress(key(first))
    await type(MISSES[0].slice(1))
    const fromKey = await enterOn(key(first))
    await tick(2000)
    expect(fromKey.defaultPrevented).toBe(true)
    expect(live()).toBe(`${rowResult(0, MISSES[0])}. 5 guesses left.`)

    // How to play, clicked open and shut with the mouse, keeps focus too.
    await pointerPress(howToButton())
    await pointerPress(howToButton())
    await type(MISSES[1])
    const fromButton = await enterOn(howToButton())
    await tick(2000)
    expect(fromButton.defaultPrevented).toBe(true)
    expect(howToButton().getAttribute('aria-expanded')).toBe('false')
    expect(live()).toBe(`${rowResult(1, MISSES[1])}. 4 guesses left.`)
  })
})

describe('Words with the Archive dialog open (F160)', () => {
  it('lets Enter activate a dialog button instead of submitting the hidden guess', async () => {
    await mount()
    await type(MISSES[0])
    await click(archiveButton())
    await tick(0)
    const inDialog = dialog().querySelector('button')

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    await act(async () => { inDialog.dispatchEvent(enter) })
    await tick(2000)

    expect(enter.defaultPrevented).toBe(false)
    expect(spokenRows()[0]).toBe(`Guess 1: ${spell(MISSES[0])}`)
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(live()).toBe('')
  })

  it('keeps letters and Backspace off the board until the dialog closes', async () => {
    await mount()
    await type('AB')
    await click(archiveButton())
    await tick(0)

    await type('CD')
    await press('Backspace')
    expect(spokenRows()[0]).toBe('Guess 1: A B')

    await press('Escape')
    expect(dialog()).toBeNull()
    await press('Backspace')
    await type('E')
    expect(spokenRows()[0]).toBe('Guess 1: A E')
  })
})
