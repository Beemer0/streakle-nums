import { supabase } from './supabase'

const OUTBOX_KEY = 'streakle-pending-results'
const RESULT_CONFLICT = 'user_id,game,puzzle_date'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const dateStr = (d) => d.toLocaleDateString('en-CA') // YYYY-MM-DD, local time

// A board finished just after midnight still counts for the day it was dealt;
// anything older is a stale page and is not recorded.
function isRecent(puzzleDate) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  return puzzleDate === dateStr(today) || puzzleDate === dateStr(yesterday)
}

const isRow = (r) => !!r && typeof r.game === 'string' && DATE_RE.test(r.puzzle_date) &&
  typeof r.completed === 'boolean' && Number.isFinite(r.score) && Number.isFinite(r.swaps_used)

// The outbox: results not yet confirmed written, oldest first, as
// { id, owner, row }. owner is the account a result belongs to, or null while
// unknown (a guest's result, or the page closed before the session was read).
// Malformed entries and ones older than yesterday are dropped on every read.
function readOutbox() {
  try {
    const list = JSON.parse(localStorage.getItem(OUTBOX_KEY))
    if (!Array.isArray(list)) return []
    return list.filter(p => p && typeof p.id === 'string' &&
      (p.owner === null || typeof p.owner === 'string') && isRow(p.row) && isRecent(p.row.puzzle_date))
  } catch { return [] }
}

function writeOutbox(list) {
  try {
    if (list.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(list))
    else localStorage.removeItem(OUTBOX_KEY)
  } catch { /* storage unavailable */ }
}

const updateOutbox = (change) => writeOutbox(change(readOutbox()))
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

// Insert-if-absent: a replay (another device, cleared storage) never
// overwrites the day's first result, so a win can't turn into a loss or back.
async function writeResult(userId, { game, puzzle_date, completed, score, swaps_used }) {
  try {
    const { error } = await supabase
      .from('game_results')
      .upsert({ user_id: userId, game, puzzle_date, completed, score, swaps_used },
        { onConflict: RESULT_CONFLICT, ignoreDuplicates: true })
    if (error) console.error('Error saving result:', error)
    return !error
  } catch (error) {
    console.error('Error saving result:', error)
    return false
  }
}

// Writes one outbox entry as userId: dropped once written, else kept for them.
const sending = new Set()
async function send(entry, userId) {
  if (sending.has(entry.id)) return
  sending.add(entry.id)
  try {
    const ok = await writeResult(userId, entry.row)
    updateOutbox(list => ok
      ? list.filter(p => p.id !== entry.id)
      : list.map(p => (p.id === entry.id ? { ...p, owner: userId } : p)))
  } finally {
    sending.delete(entry.id)
  }
}

// Records the result for the puzzle dealt on puzzleDate (today or yesterday).
export async function saveResult({ game, puzzleDate, completed, score = 0, swaps_used = 0 }) {
  if (!isRecent(puzzleDate)) return
  // Write-ahead: this runs synchronously when called, before the first await,
  // so the result is on disk before the caller marks its board finished and
  // survives the page closing mid-request (sendPendingResults retries it).
  const entry = { id: newId(), owner: null, row: { game, puzzle_date: puzzleDate, completed, score, swaps_used } }
  updateOutbox(list => [...list, entry])

  let userId
  try {
    const { data } = await supabase.auth.getSession()
    userId = data.session?.user?.id
  } catch { return } // kept; sent on the next auth event
  if (!userId) return // a guest: sent once they sign in

  const owned = { ...entry, owner: userId }
  updateOutbox(list => list.map(p => (p.id === entry.id ? owned : p)))
  await send(owned, userId)
}

// Sends what is waiting for this user, oldest first (so the day's first result
// stands): results they finished as a guest, writes cut short by a closed page,
// and writes that failed. Another account's entries stay for that account.
export async function sendPendingResults(userId) {
  const list = readOutbox()
  writeOutbox(list) // prunes stale and malformed entries
  for (const entry of list) {
    if (entry.owner === null || entry.owner === userId) await send(entry, userId)
  }
}
