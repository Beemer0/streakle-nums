// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// saveResult stamps today's date, so a replayed archive puzzle must never call
// it — a past win would mark today done, a past loss would overwrite today's win.
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

// happy-dom has no Web Animations; Link's solved-group flight calls el.animate.
if (!Element.prototype.animate) Element.prototype.animate = () => ({ cancel() {} })

const { default: WordsGame } = await import('./Words.jsx')
const { default: LinkGame } = await import('./Link.jsx')
const { default: FaceoffGame } = await import('./Faceoff.jsx')
const { default: GridironGame } = await import('./Gridiron.jsx')
const { default: KnockoutGame } = await import('./Knockout.jsx')

// Each game picks bank[YYYYMMDD % length]; read the banks the way the checkers do.
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const seedOf = (date) => parseInt(date.replace(/-/g, ''))
const WORDS = [...source('./Words.jsx').matchAll(/\{ word: "([A-Z]{5})"/g)].map(m => m[1])
const linkSrc = source('./Link.jsx')
const linkOpen = linkSrc.indexOf('[', linkSrc.indexOf('const PUZZLES = ['))
const linkEnd = linkSrc.indexOf('\n];', linkOpen)
const PUZZLES = new Function(`return ${linkSrc.slice(linkOpen, linkEnd + 2)}`)()
const wordFor = (date) => WORDS[seedOf(date) % WORDS.length]
const linkFor = (date) => PUZZLES[seedOf(date) % PUZZLES.length]

const TODAY = '2026-10-21'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockClear()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

async function mount(Game) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><Game /></AuthContext.Provider>)
  })
}
const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const ended = () => host.querySelector('.rc-title') !== null

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

async function typeWord(word) {
  for (const key of [...word, 'Enter']) {
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key })) })
  }
  await tick(2000)
}

const linkTile = (word) => [...host.querySelectorAll('[role="button"]')].find(el => el.textContent === word)

// Four wrong groups (one word from each category), losing all four lives.
async function loseLink(puzzle) {
  for (let i = 0; i < 4; i++) {
    for (const c of puzzle.categories) await click(linkTile(c.words[i]))
    await click(button('Submit'))
    await tick(700)
    if (i < 3) await click(button('Deselect'))
  }
}

async function solveLink(puzzle) {
  for (const c of puzzle.categories) {
    for (const w of c.words) await click(linkTile(w))
    await click(button('Submit'))
    await tick(1000)
  }
}

describe('Words', () => {
  it("saves a win on today's board", async () => {
    await mount(WordsGame)
    await typeWord(wordFor(TODAY))
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', completed: true })
  })

  it('never saves a win on an archive day', async () => {
    await mount(WordsGame)
    await pickArchiveDay(PAST)
    await typeWord(wordFor(PAST))
    expect(ended()).toBe(true)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('never saves a loss on an archive day', async () => {
    await mount(WordsGame)
    await pickArchiveDay(PAST)
    const misses = ['CRANE', 'SLOTH', 'PIVOT', 'MUDDY', 'WHELK', 'JAZZY', 'FROWN'].filter(w => w !== wordFor(PAST))
    for (const w of misses.slice(0, 6)) await typeWord(w)
    expect(ended()).toBe(true)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('treats picking today in the Archive as the live board', async () => {
    await mount(WordsGame)
    await pickArchiveDay(TODAY)
    await typeWord(wordFor(TODAY))
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', completed: true })
  })
})

describe('Link', () => {
  it("saves a loss on today's board", async () => {
    await mount(LinkGame)
    await loseLink(linkFor(TODAY))
    expect(saveResult).toHaveBeenCalledWith({ game: 'link', completed: false })
  })

  it('never saves a loss on an archive day', async () => {
    await mount(LinkGame)
    await pickArchiveDay(PAST)
    await loseLink(linkFor(PAST))
    expect(host.textContent).toContain('Game over!')
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('never saves a win on an archive day', async () => {
    await mount(LinkGame)
    await pickArchiveDay(PAST)
    await solveLink(linkFor(PAST))
    expect(ended()).toBe(true)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('treats picking today in the Archive as the live board', async () => {
    await mount(LinkGame)
    await pickArchiveDay(TODAY)
    await loseLink(linkFor(TODAY))
    expect(saveResult).toHaveBeenCalledWith({ game: 'link', completed: false })
  })
})

// The grid games: answer every cell with the first search suggestion until
// the board ends (mostly wrong answers, so it ends on a loss).
const GRIDS = [
  { name: 'Faceoff', Game: FaceoffGame, game: 'faceoff', cells: '.faceoff-grid [role="button"]', query: 'an', submit: 'Submit "' },
  { name: 'Gridiron', Game: GridironGame, game: 'gridiron', cells: '.gridiron-grid [role="button"]', query: 'an', submit: 'Submit "' },
  { name: 'Knockout', Game: KnockoutGame, game: 'knockout', cells: '.ko-grid [role="button"]', query: 'a', submit: 'Confirm:' },
]

for (const g of GRIDS) {
  async function guessOnce() {
    const cells = [...host.querySelectorAll(g.cells)]
    await click(cells.find(c => c.textContent === '?') ?? cells[0])
    await tick(100)
    const input = host.querySelector('input[placeholder^="Search"]')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, g.query)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(input.parentElement.querySelector('[role="button"]'))
    await click(button(g.submit))
  }
  async function playOut() {
    for (let i = 0; i < 12 && !ended(); i++) await guessOnce()
  }

  describe(g.name, () => {
    it("saves today's board", async () => {
      await mount(g.Game)
      await playOut()
      expect(ended()).toBe(true)
      expect(saveResult).toHaveBeenCalledTimes(1)
      expect(saveResult.mock.calls[0][0].game).toBe(g.game)
    })

    it('never saves an archive day', async () => {
      await mount(g.Game)
      await pickArchiveDay(PAST)
      await playOut()
      expect(ended()).toBe(true)
      expect(saveResult).not.toHaveBeenCalled()
    })

    it('treats picking today in the Archive as the live board', async () => {
      await mount(g.Game)
      await pickArchiveDay(TODAY)
      await playOut()
      expect(saveResult).toHaveBeenCalledTimes(1)
    })

    it("keeps a finished board when today is picked again (no replay to re-save)", async () => {
      await mount(g.Game)
      await playOut()
      await pickArchiveDay(TODAY)
      expect(ended()).toBe(true)
      expect(saveResult).toHaveBeenCalledTimes(1)
    })
  })
}
