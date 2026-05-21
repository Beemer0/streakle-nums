// Wordle-style guess evaluation, extracted from Words for testability.
// Compares a guess to the target and returns a per-letter array of
// 'correct' | 'present' | 'absent', with standard duplicate-letter handling:
// each target letter is consumed once, correct positions taking priority.
export function evaluate(guess, target) {
  const n = target.length
  const result = Array(n).fill('absent')
  const t = target.split('')
  const g = guess.split('')
  const used = Array(n).fill(false)
  for (let i = 0; i < n; i++) {
    if (g[i] === t[i]) { result[i] = 'correct'; used[i] = true }
  }
  for (let i = 0; i < n; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < n; j++) {
      if (!used[j] && g[i] === t[j]) { result[i] = 'present'; used[j] = true; break }
    }
  }
  return result
}
