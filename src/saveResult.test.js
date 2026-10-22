import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { upsert, getSession } = vi.hoisted(() => ({ upsert: vi.fn(), getSession: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { auth: { getSession }, from: () => ({ upsert }) } }))

// Node 25's own (method-less, without --localstorage-file) localStorage
// shadows any other; the outbox needs a working one.
function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
    clear: () => { data.clear() },
  }
}
vi.stubGlobal('localStorage', memoryStorage())

const { saveResult, sendPendingResults } = await import('./saveResult')

const KEY = 'streakle-pending-results'
const CONFLICT = { onConflict: 'user_id,game,puzzle_date', ignoreDuplicates: true }
const signedIn = (id) => getSession.mockResolvedValue({ data: { session: id ? { user: { id } } : null } })
const outbox = () => JSON.parse(localStorage.getItem(KEY) ?? '[]')
const rowsOf = (list) => list.map(({ owner, row }) => ({ owner, ...row }))
const row = (game, puzzle_date, extra = {}) => ({ game, puzzle_date, completed: true, score: 1, swaps_used: 0, ...extra })
const keep = (entries) => localStorage.setItem(KEY, JSON.stringify(entries.map(([owner, r], i) => ({ id: `e${i}`, owner, row: r }))))

let log
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 22, 0, 5)) // just after local midnight
  localStorage.clear()
  upsert.mockReset().mockResolvedValue({ error: null })
  getSession.mockReset()
  signedIn('u-1')
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  log.mockRestore()
})

describe('saveResult', () => {
  it("records under the puzzle's own date, insert-if-absent, then clears the outbox", async () => {
    await saveResult({ game: 'words', puzzleDate: '2026-10-22', completed: true, score: 3 })
    expect(upsert).toHaveBeenCalledWith({ user_id: 'u-1', ...row('words', '2026-10-22', { score: 3 }) }, CONFLICT)
    expect(outbox()).toEqual([])
  })

  it('puts the result on disk before its first await (write-ahead)', async () => {
    let finish
    upsert.mockReturnValue(new Promise(r => { finish = r }))
    const saving = saveResult({ game: 'link', puzzleDate: '2026-10-22', completed: false })
    expect(rowsOf(outbox())).toEqual([{ owner: null, ...row('link', '2026-10-22', { completed: false, score: 0 }) }])
    await vi.waitFor(() => expect(upsert).toHaveBeenCalled())
    expect(rowsOf(outbox())[0].owner).toBe('u-1')
    finish({ error: null })
    await saving
    expect(outbox()).toEqual([])
  })

  it("still records yesterday's board finished after midnight", async () => {
    await saveResult({ game: 'mines', puzzleDate: '2026-10-21', completed: false, score: 90, swaps_used: 3 })
    expect(upsert.mock.calls[0][0]).toMatchObject({ puzzle_date: '2026-10-21', completed: false })
  })

  it('ignores a board older than yesterday or with no date', async () => {
    await saveResult({ game: 'link', puzzleDate: '2026-10-20', completed: true })
    await saveResult({ game: 'link', completed: true })
    expect(getSession).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
    expect(outbox()).toEqual([])
  })

  it("keeps a guest's result until they sign in", async () => {
    signedIn(null)
    await saveResult({ game: 'nums', puzzleDate: '2026-10-22', completed: true, swaps_used: 12 })
    expect(upsert).not.toHaveBeenCalled()
    expect(rowsOf(outbox())).toEqual([{ owner: null, ...row('nums', '2026-10-22', { score: 0, swaps_used: 12 }) }])
  })

  it('keeps a failed write for its owner, logged', async () => {
    upsert.mockResolvedValue({ error: { message: 'network down' } })
    await saveResult({ game: 'weave', puzzleDate: '2026-10-22', completed: true, score: 4 })
    expect(log).toHaveBeenCalledWith('Error saving result:', { message: 'network down' })
    expect(rowsOf(outbox())).toEqual([{ owner: 'u-1', ...row('weave', '2026-10-22', { score: 4 }) }])
  })

  it('keeps the result when reading the session throws', async () => {
    getSession.mockRejectedValue(new Error('lock stolen'))
    await expect(saveResult({ game: 'words', puzzleDate: '2026-10-22', completed: true })).resolves.toBeUndefined()
    expect(rowsOf(outbox())).toEqual([{ owner: null, ...row('words', '2026-10-22', { score: 0 }) }])
  })
})

describe('sendPendingResults', () => {
  it("sends this user's and unowned entries oldest first, keeping other accounts' entries", async () => {
    keep([[null, row('words', '2026-10-22')], ['u-1', row('link', '2026-10-21')], ['u-2', row('nums', '2026-10-22')]])
    await sendPendingResults('u-1')
    expect(upsert.mock.calls.map(c => c[0])).toEqual([
      { user_id: 'u-1', ...row('words', '2026-10-22') },
      { user_id: 'u-1', ...row('link', '2026-10-21') },
    ])
    expect(rowsOf(outbox())).toEqual([{ owner: 'u-2', ...row('nums', '2026-10-22') }])
  })

  it('drops stale and malformed entries and sends only whitelisted fields', async () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'old', owner: null, row: row('words', '2026-10-20') },
      { id: 'bad', owner: null, row: { game: 'words' } },
      null, 7,
      { id: 'x', owner: null, row: { ...row('nums', '2026-10-22'), user_id: 'u-9', id: 'abc' } },
    ]))
    await sendPendingResults('u-1')
    expect(upsert.mock.calls.map(c => c[0])).toEqual([{ user_id: 'u-1', ...row('nums', '2026-10-22') }])
    expect(outbox()).toEqual([])
  })

  it('keeps an entry whose retry fails, now owned by this user', async () => {
    upsert.mockResolvedValue({ error: { message: 'still down' } })
    keep([[null, row('words', '2026-10-22')]])
    await sendPendingResults('u-1')
    expect(rowsOf(outbox())).toEqual([{ owner: 'u-1', ...row('words', '2026-10-22') }])
  })

  it('sends each entry once when sign-in events overlap', async () => {
    keep([[null, row('words', '2026-10-22')]])
    await Promise.all([sendPendingResults('u-1'), sendPendingResults('u-1'), sendPendingResults('u-1')])
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(outbox()).toEqual([])
  })

  it('ignores a corrupted outbox', async () => {
    localStorage.setItem(KEY, '{not json')
    await sendPendingResults('u-1')
    expect(upsert).not.toHaveBeenCalled()
  })
})
