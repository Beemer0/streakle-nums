// Shared streak calculation. Given a list of completed-puzzle date strings
// (YYYY-MM-DD, local), returns the number of consecutive days ending today.
export function calcStreak(completedDates) {
  const done = new Set(completedDates)
  let count = 0
  const d = new Date()
  while (done.has(d.toLocaleDateString('en-CA'))) {
    count++
    d.setDate(d.getDate() - 1)
  }
  return count
}
