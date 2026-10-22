// Each game keeps the live day's board in one localStorage slot. A tab left
// open since an earlier day keeps the board it was dealt, so its moves must
// not replace a later day's board there: today's would reload fresh, refunding
// moves or wiping a finish. Only a later date up to the real today counts — a
// slot dated in the future (a clock that was set ahead, travelling west) never
// blocks a write, and nor does an unreadable one. YYYY-MM-DD compares as dates.
export function slotHoldsLaterDay(key, date) {
  try {
    const stored = JSON.parse(localStorage.getItem(key))?.date
    return typeof stored === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stored) &&
      stored > date && stored <= new Date().toLocaleDateString('en-CA')
  } catch { return false }
}
