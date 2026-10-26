import { describe, it, expect, vi } from 'vitest'
import { createHash } from 'node:crypto'
import {
  SCRAMBLE_CUTOVER, WORD_BLOCK_DAYS, ROOT_GROUPS, GROUP_BLOCK_DAYS, ROOT_GAP, RESIDUES, EPOCH_DAYS,
  POOL_SIZE, BOARD_WORDS, MIN_LONG_WORDS, FALLBACK, ROOTS_BEFORE_CUTOVER, SERVED_BOARDS,
  generatePuzzle, boardId, rootGroups, subwords, wordColour,
} from './engine.js'
import { WORDS } from './words.js'
import { addDays, dateDay } from '../dateMath.js'

// Every board dealt from launch (2026-10-18) to the day before the cutover,
// as served: letters, then each word at row,col and direction. Never update
// these — a served board must never change.
const SERVED = [
  ['2026-10-18', 'INTTPAE', 'PATIENT@4,0a INEPT@0,6d PAINT@0,2d PINE@1,4a PANE@1,4d PAIN@4,0d'],
  ['2026-10-19', 'PIOTORN', 'PORTION@2,0a TROOP@1,2d PRINT@0,4d INTRO@1,6d TORN@4,4a PINT@2,0d'],
  ['2026-10-20', 'ONERSTM', 'MONSTER@0,2d MENTOR@5,1a SNORE@3,5d METRO@0,2a TERM@7,4a MOST@3,0a'],
  ['2026-10-21', 'ACEGRLI', 'GLACIER@1,5d GARLIC@4,0a CIGAR@1,1d GRAIL@0,3d LACE@6,2a GIRL@1,5a'],
  ['2026-10-22', 'ACSEUPL', 'CAPSULE@2,1d SPACE@5,1a LAPSE@3,0a SCALE@3,3d CLUE@7,0a CASE@0,4d'],
  ['2026-10-23', 'OEERXPL', 'EXPLORE@2,0a EXPEL@2,0d ELOPE@5,0a REPEL@1,6d PEEL@4,5a POLE@0,3d'],
  ['2026-10-24', 'FUNEACR', 'FURNACE@3,0a FARCE@2,4d CRANE@2,2d FERN@3,0d CANE@5,4a CURE@0,6d'],
  ['2026-10-25', 'DUTFLEA', 'DEFAULT@5,2a ADULT@2,7d FLUTE@1,3d FAULT@2,0a DEFT@0,0d DUAL@3,5d'],
  ['2026-10-26', 'CMEBEAR', 'EMBRACE@2,4d BRACE@8,0a AMBER@5,0a EMBER@4,1d MARE@2,1a CRAM@0,2d'],
  ['2026-10-27', 'CEIENSC', 'SCIENCE@0,5d SCENE@3,3a NIECE@1,2a SINCE@6,1a SEEN@3,3d NICE@4,0a'],
  ['2026-10-28', 'OTHYNLM', 'MONTHLY@4,0a HOTLY@0,6d MONTH@2,3a MYTH@2,3d HOLY@3,1d MOTH@0,3a'],
  ['2026-10-29', 'CISLMAU', 'MUSICAL@0,4d CLAIM@0,0a MUSIC@4,0a ALUM@2,1d SLIM@6,3a SLUM@2,4a'],
]

// The boards dealt from the cutover: its first group block and two far days
// as above, then a digest (sha256, first 16 hex digits) of each group block's
// days, [date, letters, layout], through 2030. A change to the group deal,
// the colouring, the group-block constants, ROOTS_BEFORE_CUTOVER or
// SERVED_BOARDS moves them. These are served boards from 2026-10-30 — never
// update a pin for a day any time zone has reached.
const DEALT = [
  ['2026-10-30', 'ETUELCR', 'LECTURE@1,2d ERECT@2,2a ELECT@0,4d TRUCE@2,6d TRUE@4,4a CURL@6,0a'],
  ['2026-10-31', 'CARYTHI', 'CHARITY@0,6d YACHT@5,2a HAIRY@1,2d ITCHY@3,4d TRAY@2,0a HAIR@2,5a'],
  ['2026-11-01', 'DCNUELI', 'INCLUDE@3,0a DUNCE@3,5d UNCLE@6,3a LUCID@1,2d CLUE@0,6d LIEU@4,7d'],
  ['2026-11-02', 'OROATND', 'TORNADO@3,0a ADORN@1,6d DONOR@0,1d ROAD@1,0a DARN@5,3a ROOT@5,5d'],
  ['2026-11-03', 'RVYAITE', 'VARIETY@4,0a RIVET@0,5d TEARY@0,2a IRATE@2,1d YEAR@6,0a VERY@2,5a'],
  ['2026-11-04', 'ONAVCOL', 'VOLCANO@0,2d COLON@6,1a VOCAL@3,0a COOL@1,1a OVAL@2,0d LOAN@5,4d'],
  ['2026-11-05', 'OTIVLEN', 'VIOLENT@0,3d LIVEN@3,3a INLET@1,3a OLIVE@0,5d TILE@6,3a LOVE@4,0a'],
  ['2026-11-06', 'ERDMEOF', 'FREEDOM@3,1a DEFER@0,4d ERODE@1,0a RODE@2,6d FORD@3,1d DEEM@0,4a'],
  ['2026-11-07', 'RETNEAV', 'VETERAN@1,2d EATER@3,0a AVERT@0,4d EVENT@3,0d NEAT@6,0a EVEN@2,4a'],
  ['2026-11-08', 'EURPGAD', 'UPGRADE@0,6d PRUDE@6,2a PURGE@4,3d GRAPE@4,0a RUDE@8,0a AGED@3,0d'],
  ['2026-11-09', 'EOARNMY', 'ANYMORE@0,2d YEARN@0,0a MONEY@4,1a RAYON@2,0a YARN@0,0d OMEN@6,0a'],
  ['2026-11-10', 'ERNETSP', 'PRESENT@1,3d SPENT@1,2a STEEP@0,6d ENTER@3,3a PEER@5,1a REST@7,0a'],
  ['2026-11-11', 'WKEROTN', 'NETWORK@1,1a TOKEN@0,5d OWNER@4,3a TENOR@1,3d TORN@3,0a TORE@3,0d'],
  ['2026-11-12', 'RTWESTI', 'TWISTER@0,3d TRITE@4,0a WRITE@2,1a TWIST@4,0d SITE@0,1a TEST@8,0a'],
  ['2026-11-13', 'EUFASRC', 'SURFACE@2,2a SAFER@0,5d SCARE@1,7d SCARF@2,2d FUSE@0,3a SURF@5,0a'],
  ['2026-11-14', 'ETSRCLU', 'CLUSTER@4,0a RESULT@0,1d CRUST@0,4d CURSE@0,4a SLUR@0,7d SECT@4,3d'],
  ['2026-11-15', 'EMNOSOE', 'SOMEONE@6,0a NOOSE@2,3d MOOSE@3,2a SOON@3,5d NOSE@0,6d SOME@1,5a'],
  ['2026-11-16', 'TLRFUET', 'FLUTTER@1,0d TURTLE@4,0a FLUTE@3,4d UTTER@0,2d FUEL@7,2a TURF@0,1a'],
  ['2026-11-17', 'ARKPESE', 'SPEAKER@0,2d SPREE@6,0a ERASE@3,0a SPARK@0,2a EASE@3,4d RAKE@0,0d'],
  ['2026-11-18', 'TNORIUE', 'ROUTINE@7,0a INERT@3,3d INTRO@3,3a RENT@5,2a TUNE@5,5d INTO@0,7d'],
  ['2026-11-19', 'INITGSH', 'INSIGHT@1,4d SIGHT@7,0a STING@3,2d THIS@4,2a SIGH@1,3a SHIN@0,6d'],
  ['2026-11-20', 'LHSEATC', 'SATCHEL@3,0a CASTLE@0,2d CLEAT@5,0a LEACH@1,0a LACE@3,6d CASE@5,0d'],
  ['2026-11-21', 'GONRIAC', 'ORGANIC@0,2d CARGO@3,1a CONGA@0,1a CORGI@2,5d GAIN@5,0a IRON@6,5a'],
  ['2026-11-22', 'OLIRGAL', 'GORILLA@1,3d GRILL@3,2a GRAIL@1,3a GALL@0,5d GOAL@7,1a ROLL@5,0a'],
  ['2026-11-23', 'OPITRAR', 'AIRPORT@1,3d PARROT@3,0a PATIO@7,1a RATIO@1,5d PAIR@1,2a TRIP@0,0d'],
  ['2026-11-24', 'DAHCORR', 'ORCHARD@0,4d HOARD@3,4a ROACH@0,3a CHORD@6,0a ORCA@4,1a HARD@2,6d'],
  ['2026-11-25', 'AEAKPNC', 'PANCAKE@4,0a APNEA@0,1d PECAN@1,4d CAKE@1,6d PACK@1,4a PANE@0,0a'],
  ['2026-11-26', 'ERLAKSP', 'SPARKLE@5,0a LAPSE@1,6d PEARL@1,2a LASER@4,2d SLAP@5,0d PEAK@0,3d'],
  ['2026-11-27', 'EOKSDPT', 'DESKTOP@0,6d STOKE@3,3a SPOKE@1,2a PESTO@1,3d POET@5,5a KEPT@4,0a'],
  ['2026-11-28', 'TOURBLE', 'TROUBLE@4,0a BLURT@0,0d TURBO@0,2d LOBE@2,4d TOUR@0,2a TORE@1,6d'],
  ['2026-11-29', 'AECPNIL', 'PELICAN@3,0a PENCIL@0,4d PLACE@5,3a PANIC@1,6d CLAP@0,1a PILE@3,0d'],
  ['2026-11-30', 'RUEHDDN', 'HUNDRED@3,1a UDDER@1,4d UNDER@5,0a NERD@0,7d RUDE@4,0d DUDE@5,2d'],
  ['2026-12-18', 'STROOER', 'ROOSTER@2,2d ROTOR@2,2a RETRO@7,1a STORE@4,0a ROOT@5,5d SORT@0,6d'],
  ['2030-12-31', 'TPAMELR', 'TRAMPLE@0,5d TAMER@6,2a METAL@3,3d PEARL@1,2a PELT@4,5a MARE@4,0a'],
]
const BLOCK_DIGESTS = [
  '56692df6d963894d', 'b0cecbc742619c50', 'b745b589d9b7a754', 'ee430353d78baf86', '8ef313a3497b2c81', '82f6a54ec69e4d4f',
  'dd54d6afe3a926be', 'd64fae1d676151f8', '8c0674c4b309d7df', '58e92ea30c9d9da3', 'bdda78a11f837d94', '6bc7fd736a7cfa1d',
  '4d3223c6d2069dcc', '176a38df930174fc', 'ce71fa412f362fc8', 'b2357aa62bf78a85', 'caca0469b2086dd8', 'a41580dfa9720550',
  '7e2a810aec8ebef8', '6e7c2689a6e06e91', '268d95668885d7cd', '3fef236d75900359', 'ff2c9f81ce91564d', 'baa37a036f63b0c1',
  '094e5f2477a8bddf', '0505e89ceb983b39', '0a9026a1d96192f0', 'a61230340fabc094', 'ece914c6862cd647', '4824d40547675199',
  'fcfd0a7a93bbbfda', '37107083be1d38a2', 'e097d795fe9c1c92', 'd68f6840bfed25c6', '53a8ca78c66c5f30', '04aad85a11c9b08c',
  '837cbafedefeb1ad', '789e8ff00e20bf3c', '1218a215c785a97e', '70ce992147e4b9f8', '27ff1dec0f5df5e1', '79c9372d99c0ad22',
  '2f0038518ecc0cee', 'a1727be61a50a556', 'e8268af5d10ae7b9', 'f6c40d56f61747f0', 'de4e4d9d3c1779c5', '3b4869eb3feb7b8d',
]
const layoutOf = (p) => p.placements.map(q => `${q.word}@${q.row},${q.col}${q.dir[0]}`).join(' ')

// The ROOT_GAP − 1 days before the cutover and the whole first epoch after
// it — replayed once, shared by the tests below.
const FROM = addDays(SCRAMBLE_CUTOVER, -(ROOT_GAP - 1))
const TO = addDays(SCRAMBLE_CUTOVER, EPOCH_DAYS - 1)
let days = null
function replay() {
  if (!days) {
    days = []
    for (let d = FROM; d <= TO; d = addDays(d, 1)) days.push({ date: d, p: generatePuzzle(d, { noFallback: true }) })
  }
  return days
}
const blockOf = (date) => Math.floor((dateDay(date) - dateDay(SCRAMBLE_CUTOVER)) / GROUP_BLOCK_DAYS)

describe('before the cutover (frozen)', () => {
  it('keeps every served board exactly as dealt', () => {
    expect(SCRAMBLE_CUTOVER).toBe('2026-10-30')
    expect(addDays(SERVED.at(-1)[0], 1)).toBe(SCRAMBLE_CUTOVER)
    for (const [date, pool, layout] of SERVED) {
      const p = generatePuzzle(date, { noFallback: true })
      expect([date, p.pool, layoutOf(p)]).toEqual([date, pool, layout])
    }
    expect([FALLBACK.pool, layoutOf(FALLBACK)]).toEqual(SERVED[0].slice(1))
  })

  // The two constants the days from the cutover read, regenerated here so
  // they can't drift from the frozen days.
  it('pins ROOTS_BEFORE_CUTOVER: the roots of the ROOT_GAP − 1 days before it, oldest first', () => {
    const roots = Array.from({ length: ROOT_GAP - 1 }, (_, k) =>
      generatePuzzle(addDays(SCRAMBLE_CUTOVER, k - (ROOT_GAP - 1)), { noFallback: true }).root)
    expect(ROOTS_BEFORE_CUTOVER).toEqual(roots)
  })

  it('pins SERVED_BOARDS: the board of every day served before it, from launch', () => {
    expect(SERVED.map(([date]) => date))
      .toEqual(Array.from({ length: SERVED.length }, (_, k) => addDays('2026-10-18', k)))
    expect(SERVED_BOARDS).toEqual(SERVED.map(([date]) => boardId(generatePuzzle(date, { noFallback: true }).words)))
  })
})

describe('from the cutover', () => {
  it('deals the pinned boards', () => {
    expect(DEALT.slice(0, GROUP_BLOCK_DAYS).map(([date]) => date))
      .toEqual(Array.from({ length: GROUP_BLOCK_DAYS }, (_, k) => addDays(SCRAMBLE_CUTOVER, k)))
    for (const [date, pool, layout] of DEALT) {
      const p = generatePuzzle(date, { noFallback: true })
      expect([date, p.pool, layoutOf(p)]).toEqual([date, pool, layout])
    }
  })

  it('matches the pinned digest of every group block through 2030', () => {
    expect(addDays(SCRAMBLE_CUTOVER, BLOCK_DIGESTS.length * GROUP_BLOCK_DAYS) > '2030-12-31').toBe(true)
    const digests = BLOCK_DIGESTS.map((_, b) => {
      const first = addDays(SCRAMBLE_CUTOVER, b * GROUP_BLOCK_DAYS)
      const days = Array.from({ length: GROUP_BLOCK_DAYS }, (_, k) => {
        const date = addDays(first, k), p = generatePuzzle(date, { noFallback: true })
        return [date, p.pool, layoutOf(p)]
      })
      return [first, createHash('sha256').update(JSON.stringify(days)).digest('hex').slice(0, 16)]
    })
    expect(digests).toEqual(BLOCK_DIGESTS.map((hash, b) => [addDays(SCRAMBLE_CUTOVER, b * GROUP_BLOCK_DAYS), hash]))
  })

  it('deals every root that can build a board into exactly one group', () => {
    const groups = rootGroups()
    const buildable = WORDS[POOL_SIZE].filter(w =>
      subwords(w).length >= BOARD_WORDS - 1 && subwords(w).filter(s => s.length >= 5).length >= MIN_LONG_WORDS)
    expect(groups).toHaveLength(ROOT_GROUPS)
    expect(groups.flat().sort()).toEqual(buildable)
    const sizes = groups.map(g => g.length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    // A root used shortly before the cutover sits in a group whose first
    // block starts late enough.
    ROOTS_BEFORE_CUTOVER.forEach((root, i) => {
      const d = ROOTS_BEFORE_CUTOVER.length - i // days before the cutover
      const g = groups.findIndex(list => list.includes(root))
      expect(g * GROUP_BLOCK_DAYS + d).toBeGreaterThanOrEqual(ROOT_GAP)
    })
  })

  it(`never brings a root back within ROOT_GAP days, across the cutover too`, () => {
    expect(ROOT_GAP).toBeGreaterThanOrEqual(120)
    const last = new Map()
    let minGap = Infinity
    for (const { date, p } of replay()) {
      expect(p, date).not.toBeNull()
      if (date >= SCRAMBLE_CUTOVER && last.has(p.root)) minGap = Math.min(minGap, dateDay(date) - last.get(p.root))
      last.set(p.root, dateDay(date))
    }
    expect(minGap).toBeGreaterThanOrEqual(ROOT_GAP)
  })

  it('never brings a shorter word back within WORD_BLOCK_DAYS days of its block', () => {
    const last = new Map()
    for (const { date, p } of replay().filter(d => d.date >= SCRAMBLE_CUTOVER)) {
      for (const w of p.words.slice(1)) {
        const prev = last.get(w)
        if (prev && blockOf(prev) === blockOf(date)) expect(dateDay(date) - dateDay(prev)).toBeGreaterThanOrEqual(WORD_BLOCK_DAYS)
        last.set(w, date)
      }
    }
  })

  it('repeats no board within the first epoch, nor any served before the cutover', () => {
    const served = new Set(SERVED_BOARDS)
    const seen = new Set()
    for (const { date, p } of replay().filter(d => d.date >= SCRAMBLE_CUTOVER)) {
      const cycle = Math.floor(blockOf(date) / ROOT_GROUPS)
      expect(p.words.slice(1).reduce((n, w) => n + wordColour(w), 0) % RESIDUES).toBe(cycle % RESIDUES)
      const id = boardId(p.words)
      expect(served.has(id), date).toBe(false)
      expect(seen.has(id), date).toBe(false)
      seen.add(id)
    }
    expect(seen.size).toBe(EPOCH_DAYS)
  })

  it('no longer deals 2026-12-18 the board of 2026-11-03 (audit F307)', () => {
    const a = generatePuzzle('2026-11-03'), b = generatePuzzle('2026-12-18')
    expect(a.root).not.toBe('COMMENT')
    expect(b.root).not.toBe(a.root)
    expect(b.words.slice(1).sort()).not.toEqual(a.words.slice(1).sort())
  })

  it('deals a far-future day the same board cold, in a fresh engine, as warm', async () => {
    const warm = generatePuzzle('2030-12-31')
    vi.resetModules()
    const fresh = await import('./engine.js')
    const cold = fresh.generatePuzzle('2030-12-31')
    expect(fresh.generatePuzzle).not.toBe(generatePuzzle)
    expect({ pool: cold.pool, placements: cold.placements }).toEqual({ pool: warm.pool, placements: warm.placements })
  })
})
