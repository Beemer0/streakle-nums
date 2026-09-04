// Mines — the pure engine behind /mines. No React, no DOM, no Date, no
// Math.random: every board is a deterministic function of the date string,
// so all players get the same three boards. Imported unchanged by Mines.jsx,
// engine.test.js and scripts/check-mines.mjs.
//
// Cell state (player and solver alike): 0 hidden/unknown, 1 revealed,
// 2 flagged (player) / deduced mine (solver).
//
// ANY change to RUNGS, layout, perturbation, rule order or mixSeed rewrites
// every historical board. The FALLBACKS snapshot test exists to make that a
// deliberate act.

export const RUNGS = [
  { key: 'easy',   label: 'Easy',   cols: 9,  rows: 9,  mines: 10, protect: 1, minOpen: 12 },
  { key: 'medium', label: 'Medium', cols: 10, rows: 14, mines: 22, protect: 2, minOpen: 28 },
  { key: 'hard',   label: 'Hard',   cols: 10, rows: 24, mines: 48, protect: 2, minOpen: 28 },
]
export const MAX_ATTEMPTS = 3
export const GEN_LAYOUTS = 40
export const GEN_REPAIRS = 80
// The global-mine-count rule is an ENDGAME deduction: it only fires when at
// most this many cells are still unknown. Without the cap the repair loop
// learns to pile every leftover mine into one sealed wall that "the counter"
// then resolves — technically no-guess, but a dreadful board.
export const COUNT_RULE_MAX = 8
// Uniformity guard: no mine may have this many mine neighbours.
export const MAX_MINE_NEIGHBOURS = 6
export const HIDDEN = 0, REVEALED = 1, FLAGGED = 2

// The launch-day boards (2026-09-04), pasted from `check-mines.mjs --dump`.
// They pin the engine (snapshot test) and are the last-resort fallback.
export const FALLBACKS = [
  '........./......o../..*....../...*...../*......*./....*..*./........./*.*.....*/......*..',
  '..*......./....*...../*.*....o../........../.*......../...***..*./..**....../*...**..*./....*...../...*....*./..*......./......*.../.*.......*/..........',
  '...*..*.../..*......./.......*../..*...**../..*.*...../..*......*/**..*...../*.**...*../**....*.../*.**....../.**.*.*..*/...*...*../...*....*./.*.*.*..*./*........./....*.*.../..*......./*........./.......o../*........./........../*...*...../..*......./*.....*...',
]

export function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function dateSeed(dateStr) {
  return parseInt(dateStr.replace(/-/g, ''))
}

// Integer hash of (date seed, rung, attempt). The site's `seed + attempt*997`
// idiom collides across dates (20260105 + 997 === 20261102), which would let
// two days share a board.
export function mixSeed(seed, rung, attempt) {
  let h = (seed ^ 0x9E3779B9) | 0
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B)
  h = (h + Math.imul(rung + 1, 0x27D4EB2F) + Math.imul(attempt + 1, 0x165667B1)) | 0
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35)
  return (h ^ (h >>> 16)) | 0
}

const NEIGHBOR_CACHE = new Map()
// adj: the ≤8 cells within Chebyshev distance 1; near2: the ≤24 within
// distance 2. Both in ascending index order.
export function neighbors(cols, rows) {
  const key = cols + 'x' + rows
  const cached = NEIGHBOR_CACHE.get(key)
  if (cached) return cached
  const N = cols * rows
  const adj = new Array(N), near2 = new Array(N)
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / cols), c = i % cols
    const a = [], n2 = []
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (!dr && !dc) continue
        const rr = r + dr, cc = c + dc
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue
        const j = rr * cols + cc
        n2.push(j)
        if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) a.push(j)
      }
    }
    adj[i] = a
    near2[i] = n2
  }
  const out = { adj, near2 }
  NEIGHBOR_CACHE.set(key, out)
  return out
}

export function computeCounts(board) {
  const { cols, rows, mine, count } = board
  const { adj } = neighbors(cols, rows)
  for (let i = 0; i < cols * rows; i++) {
    if (mine[i]) { count[i] = 0; continue }
    let n = 0
    for (const j of adj[i]) n += mine[j]
    count[i] = n
  }
}

// Reveals idx into `cells` (mutating), cascading through zero cells. Never
// enters cells already revealed or in state 2. Returns the opened indices.
function floodInto(board, cells, idx) {
  const { adj } = neighbors(board.cols, board.rows)
  const opened = []
  const stack = [idx]
  cells[idx] = REVEALED
  opened.push(idx)
  while (stack.length) {
    const i = stack.pop()
    if (board.count[i] !== 0) continue
    for (const j of adj[i]) {
      if (cells[j] !== HIDDEN) continue
      cells[j] = REVEALED
      opened.push(j)
      stack.push(j)
    }
  }
  return opened
}

function floodRegion(board, start) {
  const cells = new Uint8Array(board.cols * board.rows)
  floodInto(board, cells, start)
  const out = []
  for (let i = 0; i < cells.length; i++) if (cells[i] === REVEALED) out.push(i)
  return out
}

export function openingState(board) {
  const cells = new Uint8Array(board.cols * board.rows)
  for (const i of board.opening) cells[i] = REVEALED
  return cells
}

export function revealedCount(cells) {
  let n = 0
  for (let i = 0; i < cells.length; i++) if (cells[i] === REVEALED) n++
  return n
}

export function flagCount(cells) {
  let n = 0
  for (let i = 0; i < cells.length; i++) if (cells[i] === FLAGGED) n++
  return n
}

export function isWon(board, cells) {
  return revealedCount(cells) === board.cols * board.rows - board.mines
}

// Play primitives return fresh arrays on change and the SAME reference on a
// no-op, so callers can skip setState. `hit` is the mine index or -1; on a
// hit `cells` is unchanged (the UI renders the explosion from `hit`).
export function dig(board, cells, idx) {
  if (cells[idx] !== HIDDEN) return { cells, hit: -1, opened: [] }
  if (board.mine[idx]) return { cells, hit: idx, opened: [] }
  const next = cells.slice()
  const opened = floodInto(board, next, idx)
  return { cells: next, hit: -1, opened }
}

export function chord(board, cells, idx) {
  if (cells[idx] !== REVEALED || board.count[idx] === 0) return { cells, hit: -1, opened: [] }
  const { adj } = neighbors(board.cols, board.rows)
  let flags = 0
  const targets = []
  for (const j of adj[idx]) {
    if (cells[j] === FLAGGED) flags++
    else if (cells[j] === HIDDEN) targets.push(j)
  }
  if (flags !== board.count[idx] || targets.length === 0) return { cells, hit: -1, opened: [] }
  for (const j of targets) if (board.mine[j]) return { cells, hit: j, opened: [] }
  const next = cells.slice()
  const opened = []
  for (const j of targets) if (next[j] === HIDDEN) opened.push(...floodInto(board, next, j))
  return { cells: next, hit: -1, opened }
}

export function toggleFlag(cells, idx) {
  if (cells[idx] === REVEALED) return cells
  const next = cells.slice()
  next[idx] = cells[idx] === FLAGGED ? HIDDEN : FLAGGED
  return next
}

// ── The solver: the definition of "no guess" ────────────────────────────────
// Three rule classes to a fixpoint; a later rule runs only when the earlier
// ones made no progress. No frontier enumeration — a board that needs case
// analysis across many cells is one players experience as guessing.
//   bit 1  trivial: need 0 → all hidden neighbours safe; need = |S| → mines
//   bit 2  pairwise difference between overlapping constraints
//   bit 4  global mine count
// fromCells: any state 2 there is treated as unknown (players' flags may be wrong).
export function solve(board, fromCells) {
  const { cols, rows, count, mines } = board
  const N = cols * rows
  const { adj, near2 } = neighbors(cols, rows)
  const cells = new Uint8Array(N)
  let revealed = 0
  if (fromCells) {
    for (let i = 0; i < N; i++) if (fromCells[i] === REVEALED) { cells[i] = REVEALED; revealed++ }
  } else {
    for (const i of board.opening) { cells[i] = REVEALED; revealed++ }
  }
  let deduced = 0, rules = 0, iterations = 0

  const reveal = (i) => { if (cells[i] === HIDDEN) revealed += floodInto(board, cells, i).length }
  const markMine = (i) => { if (cells[i] === HIDDEN) { cells[i] = FLAGGED; deduced++ } }
  const unknownOf = (i) => {
    const s = []
    for (const j of adj[i]) if (cells[j] === HIDDEN) s.push(j)
    return s
  }
  const needOf = (i) => {
    let known = 0
    for (const j of adj[i]) if (cells[j] === FLAGGED) known++
    return count[i] - known
  }

  for (;;) {
    iterations++
    let progress = false
    const cons = []
    for (let i = 0; i < N; i++) {
      if (cells[i] !== REVEALED || count[i] === 0) continue
      const S = unknownOf(i)
      if (!S.length) continue
      const need = needOf(i)
      if (need === 0) { for (const j of S) reveal(j); progress = true }
      else if (need === S.length) { for (const j of S) markMine(j); progress = true }
      else cons.push(i)
    }
    if (progress) { rules |= 1; continue }

    outer: for (const a of cons) {
      const SA = unknownOf(a)
      if (!SA.length) continue
      const needA = needOf(a)
      for (const b of near2[a]) {
        if (b <= a || cells[b] !== REVEALED || count[b] === 0) continue
        const SB = unknownOf(b)
        if (!SB.length) continue
        let shared = false
        for (const j of SA) if (SB.includes(j)) { shared = true; break }
        if (!shared) continue
        const DA = SA.filter(j => !SB.includes(j))
        const DB = SB.filter(j => !SA.includes(j))
        if (!DA.length && !DB.length) continue
        const needB = needOf(b)
        if (needA - needB === DA.length) {
          for (const j of DA) markMine(j)
          for (const j of DB) reveal(j)
          progress = true
        } else if (needB - needA === DB.length) {
          for (const j of DB) markMine(j)
          for (const j of DA) reveal(j)
          progress = true
        }
        if (progress) break outer
      }
    }
    if (progress) { rules |= 2; continue }

    const rem = mines - deduced
    const U = []
    for (let i = 0; i < N; i++) if (cells[i] === HIDDEN) U.push(i)
    if (!U.length || U.length > COUNT_RULE_MAX) break
    if (rem === 0) { for (const i of U) reveal(i); rules |= 4; continue }
    if (rem === U.length) { for (const i of U) markMine(i); rules |= 4; continue }
    break
  }

  const frontier = []
  for (let i = 0; i < N; i++) {
    if (cells[i] === REVEALED) continue
    for (const j of adj[i]) if (cells[j] === REVEALED) { frontier.push(i); break }
  }
  return { solved: revealed === N - mines, cells, rules, iterations, frontier }
}

// ── Generation: seeded layout + solver-guided repair ────────────────────────

function layoutBoard(rng, spec, rung) {
  const { cols, rows, mines, protect: p, minOpen } = spec
  const N = cols * rows
  const or = p + Math.floor(rng() * (rows - 2 * p))
  const oc = p + Math.floor(rng() * (cols - 2 * p))
  const open = or * cols + oc
  const cand = []
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / cols), c = i % cols
    if (Math.abs(r - or) > p || Math.abs(c - oc) > p) cand.push(i)
  }
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]]
  }
  const mine = new Uint8Array(N)
  for (let k = 0; k < mines; k++) mine[cand[k]] = 1
  const board = { rung, cols, rows, mines, mine, count: new Uint8Array(N), open, opening: [], meta: null }
  computeCounts(board)
  if (clustered(board)) return null
  board.opening = floodRegion(board, open)
  if (board.opening.length < minOpen) return null
  return board
}

function mineNeighbours(board, i) {
  const { adj } = neighbors(board.cols, board.rows)
  let n = 0
  for (const j of adj[i]) n += board.mine[j]
  return n
}

function clustered(board) {
  for (let i = 0; i < board.mine.length; i++) {
    if (board.mine[i] && mineNeighbours(board, i) >= MAX_MINE_NEIGHBOURS) return true
  }
  return false
}

// Moves one mine so the stuck solver state changes. The frontier includes
// deduced mines, so a region sealed by a mine wall is repairable. Mine count
// is constant; sources and destinations are non-revealed cells, which always
// lie outside the protected square. Destinations are the sparsest candidates
// and interior sources the densest, so repairs spread mines instead of
// piling them into the last unexplored corner. rng is consumed in a fixed
// order: the roll, then one draw per pick.
function perturb(board, res, rng) {
  const { cols, rows, mine } = board
  const { adj } = neighbors(cols, rows)
  const cells = res.cells
  const fMine = [], fSafe = [], iMine = [], iSafe = []
  for (let i = 0; i < cols * rows; i++) {
    if (cells[i] === REVEALED) continue
    let front = false
    for (const j of adj[i]) if (cells[j] === REVEALED) { front = true; break }
    ;(front ? (mine[i] ? fMine : fSafe) : (mine[i] ? iMine : iSafe)).push(i)
  }
  const dens = i => mineNeighbours(board, i)
  const pick = arr => arr[Math.floor(rng() * arr.length)]
  const pickBy = (arr, better) => {
    let best = null, cands = []
    for (const i of arr) {
      const v = dens(i)
      if (best === null || better(v, best)) { best = v; cands = [i] }
      else if (v === best) cands.push(i)
    }
    return pick(cands)
  }
  const sparsest = arr => pickBy(arr, (v, b) => v < b)
  const densest = arr => pickBy(arr, (v, b) => v > b)
  const roll = rng()
  let from, to
  if (roll < 0.6 && fMine.length && fSafe.length) { from = pick(fMine); to = sparsest(fSafe) }
  else if (roll < 0.8 && fMine.length && iSafe.length) { from = pick(fMine); to = sparsest(iSafe) }
  else if (iMine.length && fSafe.length) { from = densest(iMine); to = sparsest(fSafe) }
  else if (fMine.length && fSafe.length) { from = pick(fMine); to = sparsest(fSafe) }
  else if (fMine.length && iSafe.length) { from = pick(fMine); to = sparsest(iSafe) }
  else return false
  mine[from] = 0
  mine[to] = 1
  computeCounts(board)
  board.opening = floodRegion(board, board.open)
  return true
}

// Never throws once FALLBACKS are filled. opts are for tests and the checker.
export function generateBoard(dateStr, rung, opts = {}) {
  const { layouts = GEN_LAYOUTS, repairs = GEN_REPAIRS, noFallback = false } = opts
  const spec = RUNGS[rung]
  const seed = dateSeed(dateStr)
  let solves = 0
  for (let layout = 0; layout < layouts; layout++) {
    const rng = mulberry32(mixSeed(seed, rung, layout))
    const board = layoutBoard(rng, spec, rung)
    if (!board) continue
    for (let repair = 0; repair <= repairs; repair++) {
      if (clustered(board)) break
      const res = solve(board)
      solves++
      if (res.solved) {
        board.meta = { layout, repairs: repair, solves, rules: res.rules, fallback: false }
        return board
      }
      if (repair === repairs || !perturb(board, res, rng)) break
    }
  }
  if (noFallback) return null
  const fb = boardFromString(FALLBACKS[rung], rung)
  fb.meta = { layout: -1, repairs: 0, solves, rules: 0, fallback: true }
  return fb
}

// '.' safe, '*' mine, 'o' the opening cell; rows joined by '/'.
export function boardToString(board) {
  const rows = []
  for (let r = 0; r < board.rows; r++) {
    let s = ''
    for (let c = 0; c < board.cols; c++) {
      const i = r * board.cols + c
      s += board.mine[i] ? '*' : i === board.open ? 'o' : '.'
    }
    rows.push(s)
  }
  return rows.join('/')
}

export function boardFromString(str, rung) {
  const spec = RUNGS[rung]
  const lines = str.split('/')
  const { cols, rows } = spec
  const N = cols * rows
  const mine = new Uint8Array(N)
  let open = -1, mines = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c]
      const i = r * cols + c
      if (ch === '*') { mine[i] = 1; mines++ }
      else if (ch === 'o') open = i
    }
  }
  const board = { rung, cols, rows, mines, mine, count: new Uint8Array(N), open, opening: [], meta: null }
  computeCounts(board)
  board.opening = floodRegion(board, open)
  return board
}

export function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// rows: [{ state: 'cleared'|'failed'|'locked', ms, hits }] in rung order.
export function shareLines(rows) {
  const ICON = { cleared: '🟩', failed: '🟥', locked: '⬛' }
  return rows.map((row, i) => {
    const time = row.state === 'locked' ? '—' : formatTime(row.ms)
    const hits = row.hits > 0 ? ' ' + '💥'.repeat(row.hits) : ''
    return `${ICON[row.state]} ${RUNGS[i].label} ${time}${hits}`
  })
}
