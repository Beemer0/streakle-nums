// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { WORDS } from './words/bank'
import { getDailyWord } from './words/schedule'

// Today's Words board lives in a localStorage checkpoint, so a reload resumes
// it exactly: no refunded guesses, no revived finished game, no second save.
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

// Each day's answer, from the page's own schedule.
const wordFor = (date) => getDailyWord(date).word
// The checkpoint names its answer by a 32-bit FNV-1a hash, in base 36.
const sigOf = (word) => {
  let h = 0x811c9dc5
  for (const ch of word) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
  return h.toString(36)
}

const KEY = 'streakle-words'
const TODAY = '2026-10-21'
const YESTERDAY = '2026-10-20'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const ANSWER = wordFor(TODAY)
const SIG = sigOf(ANSWER)
// Valid guesses that miss today's, yesterday's and the archive day's word.
const MISSES = ['CRANE', 'SLOTH', 'PIVOT', 'MUDDY', 'WHELK', 'JAZZY', 'FROWN', 'GLYPH']
  .filter(w => w !== ANSWER && w !== wordFor(YESTERDAY) && w !== wordFor(PAST))

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
// A reload: a fresh root, with localStorage kept.
async function reload() {
  unmount()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const ended = () => host.querySelector('.rc-title') !== null
const title = () => host.querySelector('.rc-title')?.textContent
const board = () => host.querySelector('.wd-board').outerHTML
const keyboard = () => host.querySelector('.wd-kb')?.outerHTML ?? null
const rowText = (r) => [...host.querySelectorAll('.wd-board > div')[r].children]
  .map(tile => tile.firstChild.firstChild.textContent).join('')
const saved = () => JSON.parse(localStorage.getItem(KEY))
const store = (value) => localStorage.setItem(KEY, typeof value === 'string' ? value : JSON.stringify(value))

async function submit(word) {
  for (const key of [...word, 'Enter']) {
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key })) })
  }
}
async function typeWord(word) {
  await submit(word)
  await tick(2000)
}

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

// What the Share button would put on the clipboard.
async function shareText() {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await click(button('📋'))
  return writeText.mock.calls[0][0]
}

describe("Words: today's checkpoint", () => {
  it('resumes a reload mid-game exactly, with no guesses refunded', async () => {
    await mount()
    await typeWord(MISSES[0])
    await typeWord(MISSES[1])
    const before = { board: board(), keyboard: keyboard() }
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [MISSES[0], MISSES[1]] })

    await reload()
    expect(board()).toBe(before.board)
    expect(keyboard()).toBe(before.keyboard)
    expect(ended()).toBe(false)

    // Only four rows are left: four more misses end the game.
    for (const w of MISSES.slice(2, 6)) await typeWord(w)
    expect(ended()).toBe(true)
    expect(title()).toBe('So close!')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed: false })
  })

  it('keeps a guess whose reveal a reload interrupted', async () => {
    await mount()
    await submit(MISSES[0])
    await tick(200) // the first tiles have flipped
    await reload()
    expect(rowText(0)).toBe(MISSES[0])
    expect(rowText(1)).toBe('')
    await typeWord(ANSWER)
    expect(title()).toBe('🎉 Got it in 2!')
  })

  it('saves a win as the guess lands, so a reload mid-reveal cannot lose it', async () => {
    await mount()
    await submit(ANSWER)
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed: true })
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [ANSWER] })

    await tick(100)
    await reload()
    await tick(5000)
    expect(ended()).toBe(true)
    expect(title()).toBe('🎉 Got it in 1!')
    expect(saveResult).toHaveBeenCalledTimes(1)
  })

  it('saves a loss as the sixth guess lands', async () => {
    await mount()
    for (const w of MISSES.slice(0, 5)) await typeWord(w)
    expect(saveResult).not.toHaveBeenCalled()
    await submit(MISSES[5])
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed: false })
    expect(saved().guesses).toEqual(MISSES.slice(0, 6))
  })

  it('restores a finished win as finished, with no confetti and no second save', async () => {
    await mount()
    await typeWord(MISSES[0])
    await typeWord(ANSWER)
    await tick(3000)
    const before = { board: board(), title: title(), share: await shareText() }
    expect(saveResult).toHaveBeenCalledTimes(1)
    saveResult.mockClear()

    await reload()
    expect(ended()).toBe(true)
    expect(title()).toBe(before.title)
    expect(title()).toBe('🎉 Got it in 2!')
    expect(board()).toBe(before.board)
    expect(keyboard()).toBeNull()
    expect(host.querySelector('[style*="confetti"]')).toBeNull()
    expect(host.textContent).toContain(ANSWER)
    expect(await shareText()).toBe(before.share)
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('restores a finished loss as finished, with the answer and no second save', async () => {
    await mount()
    for (const w of MISSES.slice(0, 6)) await typeWord(w)
    await tick(4000)
    const before = { board: board(), share: await shareText() }
    expect(before.share).toContain('X/6')
    saveResult.mockClear()

    await reload()
    expect(ended()).toBe(true)
    expect(title()).toBe('So close!')
    expect(host.textContent).toContain("Today's word was")
    expect(host.textContent).toContain(ANSWER)
    expect(board()).toBe(before.board)
    expect(keyboard()).toBeNull()
    expect(await shareText()).toBe(before.share)
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('an Archive replay neither reads nor writes the checkpoint', async () => {
    // Shaped for the archive day, so a replay that read it would restore it.
    store({ v: 1, date: PAST, sig: sigOf(wordFor(PAST)), guesses: [MISSES[0], MISSES[1]] })
    const kept = localStorage.getItem(KEY)
    await mount()
    await pickArchiveDay(PAST)
    expect(rowText(0)).toBe('')
    await typeWord(MISSES[2])
    await typeWord(wordFor(PAST))
    expect(ended()).toBe(true)
    expect(localStorage.getItem(KEY)).toBe(kept)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("leaves today's checkpoint alone during a replay and resumes it after", async () => {
    await mount()
    await typeWord(MISSES[0])
    await pickArchiveDay(PAST)
    expect(rowText(0)).toBe('')
    await typeWord(wordFor(PAST))
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [MISSES[0]] })

    await pickArchiveDay(TODAY)
    expect(rowText(0)).toBe(MISSES[0])
    expect(ended()).toBe(false)
    await typeWord(ANSWER)
    expect(title()).toBe('🎉 Got it in 2!')
    expect(saveResult).toHaveBeenCalledTimes(1)
  })

  const BAD = [
    ['unparseable JSON', 'not json{'],
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"CRANE"'],
    ['another version', { v: 2, date: TODAY, sig: SIG, guesses: ['CRANE'] }],
    ['no guesses', { v: 1, date: TODAY, sig: SIG }],
    ['guesses as a string', { v: 1, date: TODAY, sig: SIG, guesses: 'CRANE' }],
    ['a lower-case guess', { v: 1, date: TODAY, sig: SIG, guesses: ['crane'] }],
    ['a short guess', { v: 1, date: TODAY, sig: SIG, guesses: ['CRAN'] }],
    ['a non A-Z guess', { v: 1, date: TODAY, sig: SIG, guesses: ['CRANÉ'] }],
    ['a number', { v: 1, date: TODAY, sig: SIG, guesses: [12345] }],
    ['a null guess', { v: 1, date: TODAY, sig: SIG, guesses: [null] }],
    ['seven guesses', { v: 1, date: TODAY, sig: SIG, guesses: MISSES.slice(0, 7) }],
    ['a guess after the win', { v: 1, date: TODAY, sig: SIG, guesses: [ANSWER, 'CRANE'] }],
    ['no answer signature', { v: 1, date: TODAY, guesses: ['CRANE'] }],
    ["another day's answer signature", { v: 1, date: TODAY, sig: sigOf(wordFor(YESTERDAY)), guesses: ['CRANE'] }],
  ]
  it.each(BAD)('ignores a checkpoint with %s and starts fresh', async (_, value) => {
    store(value)
    await mount()
    expect(rowText(0)).toBe('')
    expect(keyboard()).not.toBeNull()
    expect(ended()).toBe(false)
    await typeWord(MISSES[0])
    expect(rowText(0)).toBe(MISSES[0])
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [MISSES[0]] })
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('accepts a well-formed checkpoint', async () => {
    store({ v: 1, date: TODAY, sig: SIG, guesses: [MISSES[0]] })
    await mount()
    expect(rowText(0)).toBe(MISSES[0])
    expect(rowText(1)).toBe('')
    expect(ended()).toBe(false)
  })

  it('ignores a checkpoint dated another day', async () => {
    // Today's own answer, so only the date gives it away.
    store({ v: 1, date: YESTERDAY, sig: SIG, guesses: [ANSWER] })
    await mount()
    expect(ended()).toBe(false)
    expect(rowText(0)).toBe('')
  })

  // A build deployed mid-day that changed today's word (as adding a word did
  // under the old YYYYMMDD % length pick): the checkpoint was written against
  // the word the old build dealt, here the pick from a bank one word shorter.
  const STALE = WORDS[parseInt(TODAY.replace(/-/g, '')) % (WORDS.length - 1)].word
  it.each([
    ['mid-game', [MISSES[0]]],
    ['won', [MISSES[0], STALE]],
    ['lost', MISSES.slice(0, 6)],
  ])("drops today's %s checkpoint when the day's word changed under it", async (_, guesses) => {
    expect(STALE).not.toBe(ANSWER)
    expect(sigOf(STALE)).not.toBe(SIG)
    store({ v: 1, date: TODAY, sig: sigOf(STALE), guesses })
    await mount()
    expect(rowText(0)).toBe('')
    expect(keyboard()).not.toBeNull()
    expect(ended()).toBe(false)

    // The new word plays from scratch and the checkpoint now names it.
    await typeWord(MISSES[1])
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [MISSES[1]] })
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("starts the next day fresh after a board finished past midnight", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
    await mount()
    vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
    await typeWord(ANSWER)
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [ANSWER] })
    await reload()
    expect(host.textContent).toContain('October 22, 2026')
    expect(ended()).toBe(false)
    expect(rowText(0)).toBe('')
  })

  it('plays on when storage throws', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('denied') })
    await mount()
    await typeWord(MISSES[0])
    await typeWord(ANSWER)
    expect(title()).toBe('🎉 Got it in 2!')
    expect(saveResult).toHaveBeenCalledTimes(1)
  })
})

describe('Words: the deciding guess locks input', () => {
  // The deciding row's reveal ends at 1.4 s; gameOver (and the result card)
  // lands 400 ms later on a win, 200 ms later on a loss. In between, the
  // keyboard is still on screen.
  const REVEAL = 4 * 150 + 800
  const win = async () => { await submit(ANSWER) }
  const sixthMiss = async () => {
    for (const w of MISSES.slice(0, 5)) await typeWord(w)
    await submit(MISSES[5])
  }
  it.each([
    ['a win', 'a miss', win, MISSES[6], 0, '🎉 Got it in 1!', true],
    ['a win', 'the answer again', win, ANSWER, 0, '🎉 Got it in 1!', true],
    ['the sixth miss', 'the answer', sixthMiss, ANSWER, 5, 'So close!', false],
    ['the sixth miss', 'another miss', sixthMiss, MISSES[6], 5, 'So close!', false],
  ])('after %s, ignores %s typed before the game ends', async (_, __, decide, typed, row, outcome, completed) => {
    await mount()
    await decide()
    const decided = rowText(row)
    await tick(REVEAL)
    expect(ended()).toBe(false)
    expect(keyboard()).not.toBeNull()
    const before = { board: board(), checkpoint: localStorage.getItem(KEY) }

    await submit(typed)
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' })) })
    expect(board()).toBe(before.board)
    expect(localStorage.getItem(KEY)).toBe(before.checkpoint)
    expect(saveResult).toHaveBeenCalledTimes(1)

    await tick(3000)
    expect(title()).toBe(outcome)
    expect(rowText(row)).toBe(decided)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed })

    await reload()
    expect(title()).toBe(outcome)
    expect(rowText(row)).toBe(decided)
  })
})

describe('Words: a tab left open since yesterday', () => {
  it.each([
    ['mid-game', [MISSES[0], MISSES[1]], false],
    ['won', [MISSES[0], ANSWER], true],
  ])("never overwrites today's %s checkpoint, and still saves its own day", async (_, guesses, finished) => {
    // Today's board, played in another tab.
    const todays = JSON.stringify({ v: 1, date: TODAY, sig: SIG, guesses })
    store(todays)
    // This tab was dealt yesterday's board just before midnight and plays on after it.
    vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
    await mount()
    expect(host.textContent).toContain('October 20, 2026')
    vi.setSystemTime(new Date(2026, 9, 21, 0, 2))

    await typeWord(MISSES[2])
    expect(rowText(0)).toBe(MISSES[2])
    expect(localStorage.getItem(KEY)).toBe(todays)
    await typeWord(wordFor(YESTERDAY))
    expect(title()).toBe('🎉 Got it in 2!')
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: YESTERDAY, completed: true })
    expect(localStorage.getItem(KEY)).toBe(todays)

    // Today's board still reloads as the other tab left it.
    saveResult.mockClear()
    await reload()
    expect(host.textContent).toContain('October 21, 2026')
    guesses.forEach((g, r) => expect(rowText(r)).toBe(g))
    expect(rowText(guesses.length)).toBe('')
    expect(ended()).toBe(finished)
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('is not blocked by a checkpoint dated past the real today (a clock set ahead)', async () => {
    const TOMORROW = '2026-10-22'
    store({ v: 1, date: TOMORROW, sig: sigOf(wordFor(TOMORROW)), guesses: [MISSES[0]] })
    await mount()
    expect(rowText(0)).toBe('')
    await typeWord(MISSES[1])
    expect(saved()).toEqual({ v: 1, date: TODAY, sig: SIG, guesses: [MISSES[1]] })
  })
})
