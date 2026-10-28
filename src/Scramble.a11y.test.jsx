// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { generatePuzzle, boardCells, cellsOf, cellKey, hiddenCells, HINT_SECONDS, BOARD_WORDS } from './scramble/engine'
import { readFileSync } from 'node:fs'

// Scramble for keyboard and screen-reader users: Enter on a focused control
// activates that control (typing or tapping a word and pressing Enter still
// submits it), a tile used by Enter keeps a full-strength focus ring, and the
// board — aria-hidden cells — reads as a list naming each word ("word 3"),
// its length, the letters showing in it and its crossings, kept up to date
// by finds and hints, which name words the same way.
const { saveResult } = vi.hoisted(() => ({ saveResult: vi.fn() }))
vi.mock('./saveResult', () => ({ saveResult }))
// The player's streak (none unless a test sets one).
const streakNow = vi.hoisted(() => ({ days: 0 }))
vi.mock('./useStreak', () => ({ useStreak: () => ({ streak: streakNow.days, loading: false }) }))

// The Archive reads find no history; nobody belongs to a pool.
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

// The site's tokens (Vitest stubs CSS imports, so read the file; a literal
// new URL(…, import.meta.url) would be rewritten to a served URL), loaded so
// computed colours resolve as they do on the page.
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const indexCss = source('index.css')
const tokens = document.createElement('style')
tokens.textContent = indexCss
document.head.appendChild(tokens)

const { default: ScrambleGame } = await import('./Scramble.jsx')

const TODAY = '2026-10-21'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const PZ = generatePuzzle(TODAY)
const CELLS = boardCells(PZ)
const ROOT = PZ.words[0] // the root goes first; every other word crosses something
// The words in the chips' order: shortest first, then board order. A word's
// place in it is its spoken name, "word N".
const CHIP_ORDER = PZ.words.map((w, i) => i).sort((a, b) => PZ.words[a].length - PZ.words[b].length || a - b)
const SHORTEST = PZ.words[CHIP_ORDER[0]]
const num = (i) => CHIP_ORDER.indexOf(i) + 1

const keysOf = (i) => cellsOf(PZ.placements[i]).map(([r, c]) => cellKey(r, c))
// How a word should read: its showing letters, "blank" for the rest.
const pattern = (i, shown) => keysOf(i).map(k => (shown.has(k) ? CELLS.get(k).ch : 'blank')).join(' ')
// Where it crosses the others: " Letter 2 crosses word 6, letter 4 crosses word 5."
function crossings(i) {
  const parts = keysOf(i).flatMap((k, n) => CELLS.get(k).words.filter(j => j !== i).map(j => `letter ${n + 1} crosses word ${num(j)}`))
  return parts.length ? ` ${parts.join(', ').replace(/^l/, 'L')}.` : ''
}
// A word's line in the board list, before it is found.
const listed = (i, shown) => (keysOf(i).some(k => shown.has(k))
  ? `Word ${num(i)}, ${PZ.words[i].length} letters: ${pattern(i, shown)}.${crossings(i)}`
  : `Word ${num(i)}, ${PZ.words[i].length} letters, none showing.${crossings(i)}`)

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockClear()
  streakNow.days = 0
  localStorage.clear()
})
afterEach(() => {
  if (root) { act(() => root.unmount()); host.remove(); root = null }
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><ScrambleGame /></AuthContext.Provider>)
  })
}

// el.click() is a keyboard-style activation (detail 0); a mouse or touch
// click has detail 1.
const click = (el) => act(async () => { el.click() })
const pointerClick = (el) => act(async () => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
})
// A physical key press: the browser sends keydown to whatever has focus.
const press = (key) => act(async () => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  ;(document.activeElement ?? document.body).dispatchEvent(ev)
  return ev
})
async function type(letters) { for (const key of letters) await press(key) }
// Enter as a browser handles it: the page's keydown listeners first, then
// (unless one prevented it) the focused control activates.
async function pressEnter() {
  const focused = document.activeElement
  const enter = await press('Enter')
  if (!enter.defaultPrevented && focused instanceof HTMLElement && focused.matches('button, a[href], [role="switch"]')) await click(focused)
  return enter
}
async function enterOn(el) {
  await act(async () => { el.focus() })
  return pressEnter()
}

// useAnnouncer-style live region: a zero-width space toggles on every other message.
const ZWSP = String.fromCharCode(0x200b)
const live = () => host.querySelector('.sc-sr-only[aria-live]').textContent.split(ZWSP).join('')
// The text a screen reader can reach: everything outside aria-hidden subtrees.
function readable(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE || node.getAttribute('aria-hidden') === 'true') return ''
  return [...node.childNodes].map(readable).join('')
}
const spokenGuess = () => readable(host.querySelector('.sc-guess[role="status"]'))
const boardList = () => [...host.querySelectorAll('ul[aria-label="Board"] > li')].map(li => li.textContent)
const tile = (ch) => host.querySelector(`.sc-rack button[aria-label="Add ${ch}"]`)
const named = (label) => host.querySelector(`button[aria-label="${label}"]`)
const textButton = (text) => [...host.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text))

// Makes the next hint reveal `key` (the page picks hidden[floor(random * n)]).
function aimHint(pz, key, shown) {
  const hidden = hiddenCells(pz, shown)
  const idx = hidden.indexOf(key)
  vi.spyOn(Math, 'random').mockReturnValue((idx + 0.5) / hidden.length)
}
async function hintAt(key, shown, pz = PZ) {
  aimHint(pz, key, shown)
  await click(textButton('💡 Hint'))
  vi.restoreAllMocks()
}

// WCAG relative luminance and contrast, from the palette's hex tokens.
const token = (name) => indexCss.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))[1]
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Enter on a focused control', () => {
  it('Tab and Enter on the letter tiles spell a word, and Enter on the Enter button submits it', async () => {
    await mount()
    for (const [k, ch] of [...SHORTEST].entries()) {
      const enter = await enterOn(tile(ch))
      expect(enter.defaultPrevented).toBe(false)
      expect(spokenGuess()).toBe(`Your word: ${SHORTEST.slice(0, k + 1).split('').join(' ')}`)
    }
    expect(live()).toBe('')
    const enter = await enterOn(textButton('Enter'))
    expect(enter.defaultPrevented).toBe(false)
    expect(live()).toBe(`${SHORTEST} (word 1) found! 1 of ${BOARD_WORDS}.`)
  })

  it('Enter on ⌫ deletes a letter and Enter on Hint gives a hint, with a guess pending', async () => {
    await mount()
    await type(ROOT.slice(0, 2))
    expect(spokenGuess()).toBe(`Your word: ${ROOT[0]} ${ROOT[1]}`)

    const back = await enterOn(named('Delete last letter'))
    expect(back.defaultPrevented).toBe(false)
    expect(spokenGuess()).toBe(`Your word: ${ROOT[0]}`)
    expect(live()).toBe('')

    const hint = await enterOn(textButton('💡 Hint'))
    expect(hint.defaultPrevented).toBe(false)
    expect(live()).toMatch(/^Hint: [A-Z][.,] /)
  })

  it('Enter on the high-contrast switch toggles it and keeps the guess', async () => {
    await mount()
    await click(named('How to play'))
    await type(ROOT.slice(0, 2))
    const sw = host.querySelector('[role="switch"]')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    const enter = await enterOn(sw)
    expect(enter.defaultPrevented).toBe(false)
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(spokenGuess()).toBe(`Your word: ${ROOT[0]} ${ROOT[1]}`)
    expect(live()).toBe('')
  })

  it('typing a word after using a button hands Enter back to the guess', async () => {
    await mount()
    const shuffle = named('Shuffle letters')
    await enterOn(shuffle)
    expect(document.activeElement).toBe(shuffle)
    await type(SHORTEST)
    expect(document.activeElement).not.toBe(shuffle)
    const enter = await press('Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(live()).toBe(`${SHORTEST} (word 1) found! 1 of ${BOARD_WORDS}.`)
  })

  // Some clicks focus the button pressed (then the page drops it); others
  // leave focus where it was — on a control reached by Tab, say.
  it.each([
    ['the tap focuses each tile', true],
    ['the tap leaves focus on Hint', false],
  ])('tapping a word with a pointer hands Enter back to the guess: %s', async (_, focusesTile) => {
    await mount()
    const hintButton = textButton('💡 Hint')
    await act(async () => { hintButton.focus() })
    for (const ch of SHORTEST) {
      const t = tile(ch)
      if (focusesTile) await act(async () => { t.focus() })
      await pointerClick(t)
    }
    expect(spokenGuess()).toBe(`Your word: ${SHORTEST.split('').join(' ')}`)
    expect(document.activeElement).not.toBe(hintButton)
    const enter = await pressEnter()
    expect(enter.defaultPrevented).toBe(true)
    // The word went in; no hint (and no +30 s) was taken instead.
    expect(live()).toBe(`${SHORTEST} (word 1) found! 1 of ${BOARD_WORDS}.`)
    expect(host.querySelector('[role="timer"]').getAttribute('aria-label')).toBe('Time 0:00')
  })
})

// The open account menu keeps its keys (Tab, Enter, Escape): typing there
// neither pulls focus out of it nor reaches the guess.
describe('keys pressed in the open account menu', () => {
  const avatar = () => named('Account menu')
  const signOut = () => textButton('Sign out')
  const typedTwo = () => `Your word: ${ROOT[0]} ${ROOT[1]}`
  async function openMenu() {
    await act(async () => { avatar().focus() })
    await click(avatar())
    expect(avatar().getAttribute('aria-expanded')).toBe('true')
  }

  it.each([
    ['Sign out', () => signOut()],
    ['the avatar', () => avatar()],
  ])('a letter typed on %s keeps focus there and stays out of the guess', async (_, target) => {
    await mount()
    await type(ROOT.slice(0, 2))
    await openMenu()
    await act(async () => { target().focus() })
    const letter = await press(ROOT[2])
    expect(letter.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(target())
    expect(avatar().getAttribute('aria-expanded')).toBe('true')
    expect(spokenGuess()).toBe(typedTwo())
  })

  it('Backspace leaves the guess alone, and Escape closes the menu onto the avatar without clearing it', async () => {
    await mount()
    await type(ROOT.slice(0, 2))
    await openMenu()
    await act(async () => { signOut().focus() })

    const back = await press('Backspace')
    expect(back.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(signOut())
    expect(spokenGuess()).toBe(typedTwo())

    await press('Escape')
    expect(avatar().getAttribute('aria-expanded')).toBe('false')
    expect(signOut()).toBeUndefined()
    expect(document.activeElement).toBe(avatar())
    expect(spokenGuess()).toBe(typedTwo())
  })

  it('with the menu closed, a letter typed on the avatar still drops its focus and types', async () => {
    await mount()
    await act(async () => { avatar().focus() })
    await type(ROOT.slice(0, 2))
    expect(document.activeElement).not.toBe(avatar())
    expect(avatar().getAttribute('aria-expanded')).toBe('false')
    expect(spokenGuess()).toBe(typedTwo())
  })
})

describe('a letter tile used by Enter', () => {
  it('keeps focus, and its focus ring stays at full strength (3:1 on the page)', async () => {
    await mount()
    const t = tile(SHORTEST[0])
    await enterOn(t)
    expect(document.activeElement).toBe(t)
    expect(t.getAttribute('aria-label')).toBe(`${SHORTEST[0]}, used`)
    expect(t.classList.contains('sc-tile-used')).toBe(true)
    // Opacity on the tile (or anything around it) fades its outline too.
    for (let el = t; el; el = el.parentElement) expect(Number(getComputedStyle(el).opacity || 1)).toBe(1)
    // It dims through its colours instead, from the palette's tokens…
    const rgb = (name) => indexCss.match(new RegExp(`${name}:\\s*([0-9, ]+);`))[1].split(',').map(Number)
    const channels = (css) => css.match(/rgba?\(([^)]*)\)/)[1].split(',').map(Number)
    expect(channels(getComputedStyle(t).color)).toEqual([...rgb('--ink-rgb'), 0.18])
    expect(channels(getComputedStyle(t).borderTopColor)).toEqual([...rgb('--gold-rgb'), 0.18])
    // …and its ring is a solid 2px of --ink, 3:1+ on the page's --bg.
    const ring = getComputedStyle(t)
    expect(ring.outlineStyle).toBe('solid')
    expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2)
    expect(ring.outlineColor.toUpperCase()).toBe(token('--ink').toUpperCase())
    expect(contrast(ring.outlineColor, token('--bg'))).toBeGreaterThanOrEqual(3)
  })
})

describe('the board for screen readers', () => {
  it('hides the visual cells and lists every word by name, length and crossings, shortest first', async () => {
    await mount()
    expect(host.querySelector('.sc-board').getAttribute('aria-hidden')).toBe('true')
    expect(boardList()).toEqual(CHIP_ORDER.map(i => listed(i, new Set())))
  })

  it('reads a found word, and the letters it fills into the words that cross it', async () => {
    await mount()
    await type(ROOT)
    await press('Enter')
    const shown = new Set(keysOf(0))
    expect(boardList()).toEqual(CHIP_ORDER.map(i => (i === 0 ? `Word ${num(0)}: ${ROOT}, found` : listed(i, shown))))
    // The root crosses other words, so some of them now show a letter.
    expect(boardList().filter(t => /: [^.]*\b[A-Z]\b/.test(t)).length).toBeGreaterThan(0)
  })

  it('a hint names each word its letter lands in, with that word’s new pattern', async () => {
    await mount()
    // A crossing cell: the hint shows its letter in two words at once.
    const [key, cell] = [...CELLS].find(([, c]) => c.words.length === 2)
    await hintAt(key, new Set())
    const shown = new Set([key])
    const [a, b] = [...cell.words].sort((x, y) => num(x) - num(y))
    expect(live()).toBe(`Hint: ${cell.ch}, shared by words ${num(a)} and ${num(b)}. ` +
      `Word ${num(a)} now reads ${pattern(a, shown)}. Word ${num(b)} now reads ${pattern(b, shown)}. ${HINT_SECONDS} seconds added.`)
    expect(live()).not.toMatch(/row \d|column \d/)
    expect(boardList()[num(a) - 1]).toBe(listed(a, shown))
  })

  it('a hint that fills in a word says so, and the list then reads it as found', async () => {
    await mount()
    const target = CHIP_ORDER[0]
    const shown = new Set()
    for (const key of keysOf(target)) {
      await hintAt(key, shown)
      shown.add(key)
    }
    expect(live()).toContain(`That completes ${PZ.words[target]} (word 1).`)
    expect(boardList()[0]).toBe(`Word 1: ${PZ.words[target]}, found`)
  })

  it('a find that completes a crossing word names that word too', async () => {
    await mount()
    // Hint every letter of a word crossing the root except the shared one;
    // finding the root then fills it in.
    const other = CHIP_ORDER.find(i => i !== 0 && keysOf(i).some(k => keysOf(0).includes(k)))
    const shown = new Set()
    for (const key of keysOf(other).filter(k => !keysOf(0).includes(k))) {
      await hintAt(key, shown)
      shown.add(key)
    }
    await type(ROOT)
    await press('Enter')
    expect(live()).toBe(`${ROOT} (word ${num(0)}) found! That also completes ${PZ.words[other]} (word ${num(other)}). 2 of ${BOARD_WORDS}.`)
  })
})

// On a phone the CSS sizes the cells from the visible height too, using the
// board's shape and whether the streak line takes a row of its own (layout
// itself is checked in a real browser; happy-dom has none).
describe('fitting the board on a phone', () => {
  const board = () => host.querySelector('.sc-board')

  it('the board carries its rows and columns, and reserves no streak row without a streak', async () => {
    await mount()
    expect(board().style.getPropertyValue('--sc-rows')).toBe(String(PZ.rows))
    expect(board().style.getPropertyValue('--sc-cols')).toBe(String(PZ.cols))
    expect(board().style.getPropertyValue('--sc-streak-h')).toBe('0px')
    expect(host.querySelector('.sc-streak')).toBeNull()
  })

  it('a streak reserves its row, and still reads in full where a short phone shows only the number', async () => {
    streakNow.days = 12
    await mount()
    expect(board().style.getPropertyValue('--sc-streak-h')).toBe('26px')
    const streak = host.querySelector('.sc-streak')
    expect(readable(streak)).toBe('🔥 12 day streak')
    // It sits with the chips and the timer, ahead of them, as before.
    const status = streak.parentElement
    expect(status.firstElementChild).toBe(streak)
    expect(status.querySelector('[role="img"]').getAttribute('aria-label')).toBe(`0 of ${BOARD_WORDS} words found; still to find: ${CHIP_ORDER.map(i => PZ.words[i].length).join(', ')} letters`)
    expect(status.querySelector('[role="timer"]').getAttribute('aria-label')).toBe('Time 0:00')
  })
})

// 2026-10-22 has three 5-letter words, two pairs of them crossing: lengths
// alone can't tell them apart.
describe('words of the same length (2026-10-22)', () => {
  const PZ22 = generatePuzzle('2026-10-22')
  beforeEach(() => { vi.setSystemTime(new Date(2026, 9, 22, 12)) })

  it('the board list names each word, so no two lines read the same', async () => {
    expect(PZ22.words).toEqual(['CAPSULE', 'SPACE', 'LAPSE', 'SCALE', 'CLUE', 'CASE'])
    await mount()
    expect(boardList()).toEqual([
      'Word 1, 4 letters, none showing. Letter 2 crosses word 6, letter 4 crosses word 5.',
      'Word 2, 4 letters, none showing. Letter 4 crosses word 4.',
      'Word 3, 5 letters, none showing. Letter 1 crosses word 6, letter 3 crosses word 5.',
      'Word 4, 5 letters, none showing. Letter 2 crosses word 6, letter 4 crosses word 5, letter 5 crosses word 2.',
      'Word 5, 5 letters, none showing. Letter 1 crosses word 4, letter 3 crosses word 3, letter 5 crosses word 1.',
      'Word 6, 7 letters, none showing. Letter 2 crosses word 4, letter 4 crosses word 3, letter 6 crosses word 1.',
    ])
  })

  it('a hint on a letter two 5-letter words share names both words and says they share it', async () => {
    await mount()
    // The A where SPACE (word 3) crosses SCALE (word 5).
    await hintAt('5,3', new Set(), PZ22)
    expect(live()).toBe('Hint: A, shared by words 3 and 5. Word 3 now reads blank blank A blank blank. ' +
      `Word 5 now reads blank blank A blank blank. ${HINT_SECONDS} seconds added.`)
    const list = boardList()
    expect(list[2]).toBe('Word 3, 5 letters: blank blank A blank blank. Letter 1 crosses word 6, letter 3 crosses word 5.')
    expect(list[4]).toBe('Word 5, 5 letters: blank blank A blank blank. Letter 1 crosses word 4, letter 3 crosses word 3, letter 5 crosses word 1.')
    expect(new Set(list).size).toBe(list.length)
  })

  it('a hint in one word names it; a find names the word found', async () => {
    await mount()
    // CLUE's U crosses nothing.
    await hintAt('7,2', new Set(), PZ22)
    expect(live()).toBe(`Hint: U. Word 1 now reads blank blank U blank. ${HINT_SECONDS} seconds added.`)
    await type('SCALE')
    await press('Enter')
    expect(live()).toBe(`SCALE (word 5) found! 1 of ${BOARD_WORDS}.`)
    expect(boardList()[4]).toBe('Word 5: SCALE, found')
  })
})
