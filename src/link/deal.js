// The day's deal: the order a Link board's 16 tiles are laid out in. The
// words arrive in group order, easiest first, so the shuffle must favour no
// spot. Boards before DEAL_CUTOVER keep the deal they were first shown with:
// an LCG whose low bits put the easiest group top-left on ~45% of days. From
// it, a well-mixed stream from the date. Like every cutover here, it was a day
// no time zone had reached when it shipped (deal.test.js pins both sides).
import { mulberry32, mixSeed } from '../grid/engine.js'

export const DEAL_CUTOVER = '2026-10-30'

function legacyShuffle(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function mixedShuffle(arr, seed) {
  const a = [...arr]
  const random = mulberry32(mixSeed(seed, 0, 0))
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// The words of a date's puzzle (YYYY-MM-DD), in the order they are dealt.
export function dealWords(words, dateStr) {
  const seed = parseInt(dateStr.replace(/-/g, ''), 10)
  return (dateStr < DEAL_CUTOVER ? legacyShuffle : mixedShuffle)(words, seed)
}
