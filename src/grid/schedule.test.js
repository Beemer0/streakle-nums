import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { addDays, dateDay } from '../dateMath.js'
import { GRID_CUTOVER, gridKey } from './engine.js'
import { getDailyPuzzle as faceoff, PLAYERS as NHL, fitsOn as nhlFitsOn } from '../faceoff/puzzle.js'
import { getDailyPuzzle as gridiron, PLAYERS as NFL, fitsOn as nflFitsOn } from '../gridiron/puzzle.js'
import { getDailyPuzzle as knockout, FIGHTERS as MMA, fitsOn as mmaFitsOn } from '../knockout/puzzle.js'

const GAMES = { faceoff, gridiron, knockout }
const SHIPPED_DAY = '2026-10-22'
const NEW_DAY = '2026-10-25'
const nhl = (name) => NHL.find(p => p.n === name)
const nfl = (name) => NFL.find(p => p.n === name)
const mma = (name) => MMA.find(f => f.n === name)

// Shipped boards must never change. Every grid from 2025-01-01 to the day
// before the cutover was compared with the original in-page generators when
// the engine was extracted (and again in review, in four time zones); these
// fingerprints freeze that whole history.
describe('shipped grids', () => {
  const HISTORY = {
    faceoff: 'eea78266b0972d9152a1a419ee69201b09bc4a289d9efcfe9991e0fa844afc1b',
    gridiron: '41e4caa88f363b23f2b01a9310a722a9f577533d2a8211653e75e9852ed6ddd1',
    knockout: '939c05f221372060c5fcf995098eb312a052ae1bc46c3c01ee812ec16c091a58',
  }
  for (const [game, hash] of Object.entries(HISTORY)) {
    it(`${game}: every board from 2025-01-01 to 2026-10-24 is as dealt`, () => {
      expect(GRID_CUTOVER).toBe('2026-10-25')
      const history = []
      for (let d = '2025-01-01'; d < GRID_CUTOVER; d = addDays(d, 1)) history.push([d, GAMES[game](d)])
      expect(history).toHaveLength(662)
      expect(createHash('sha256').update(JSON.stringify(history)).digest('hex')).toBe(hash)
    })
  }

  it('readable pins: the last shipped day', () => {
    expect(faceoff(SHIPPED_DAY)).toEqual({ rows: ['ALL_STAR', 'ANA', 'BUF'], cols: ['NYI', 'NYR', 'DAL'] })
    expect(gridiron(SHIPPED_DAY)).toEqual({ rows: ['SB_MVP', 'RUSH_TITLE', 'TEN'], cols: ['PRO_BOWL', 'NYJ', 'DAL'] })
    expect(knockout(SHIPPED_DAY)).toEqual({ rows: ['LHW', 'LW', 'WW'], cols: ['WEC', 'TITLE_DEF', 'BELLATOR'] })
  })
})

// From the cutover the schedule depends on the engine, the header pools, the
// accept rules and the correction batches: a change to any of them moves these
// pins (and every board from the cutover on), so it must be deliberate.
describe('grids from the cutover', () => {
  it('the cutover day and a later one', () => {
    expect(faceoff(NEW_DAY)).toEqual({ rows: ['SEA', 'SC_CHAMP', 'CBJ'], cols: ['CGY', 'CHI', 'DET'] })
    expect(gridiron(NEW_DAY)).toEqual({ rows: ['RUSH_TITLE', 'TB', 'SB_CHAMP'], cols: ['LV', 'CLE', 'KC'] })
    expect(knockout(NEW_DAY)).toEqual({ rows: ['HOF', 'WW', 'KO_WIN'], cols: ['UFC', 'MULTI_CHAMP', 'WEC'] })
    expect(faceoff('2027-06-01')).toEqual({ rows: ['EDM', 'ALL_STAR', 'TBL'], cols: ['HART', 'CGY', 'ART_ROSS'] })
    expect(gridiron('2027-06-01')).toEqual({ rows: ['NYG', 'PHI', 'ARI'], cols: ['BAL', 'OROY', 'ATL'] })
    expect(knockout('2027-06-01')).toEqual({ rows: ['STRIKEFORCE', 'MULTI_CHAMP', 'WW'], cols: ['BELLATOR', 'FW', 'KO_WIN'] })
  })

  for (const [game, get] of Object.entries(GAMES)) {
    it(`${game}: no grid returns within a year of the cutover`, () => {
      const last = new Map()
      for (let d = addDays(GRID_CUTOVER, -365); d <= addDays(GRID_CUTOVER, 400); d = addDays(d, 1)) {
        const { rows, cols } = get(d)
        const key = gridKey(rows, cols)
        if (d >= GRID_CUTOVER && last.has(key)) expect(dateDay(d) - dateDay(last.get(key))).toBeGreaterThan(365)
        last.set(key, d)
      }
    })
  }
})

describe('answer checking', () => {
  it('a team header is the franchise: relocated predecessors count', () => {
    expect(nflFitsOn(NEW_DAY)(nfl('Kurt Warner'), 'LAR')).toBe(true) // St. Louis Rams
    expect(nflFitsOn(NEW_DAY)(nfl('Drew Brees'), 'LAC')).toBe(true) // San Diego Chargers
    expect(nhlFitsOn(NEW_DAY)(nhl('Joe Sakic'), 'COL')).toBe(true) // Quebec Nordiques
    expect(nhlFitsOn(NEW_DAY)(nhl('Dino Ciccarelli'), 'DAL')).toBe(true) // Minnesota North Stars
  })

  it('takes the 2026 Stanley Cup champions (Carolina beat Vegas)', () => {
    for (const name of ['Sebastian Aho', 'Taylor Hall', 'Frederik Andersen']) {
      expect(nhlFitsOn(NEW_DAY)(nhl(name), 'SC_CHAMP')).toBe(true)
    }
    expect(nhlFitsOn(NEW_DAY)(nhl('Tomas Hertl'), 'SC_CHAMP')).toBe(false)
  })

  it('drops wrong tags from the cutover, but never makes a shipped board harder', () => {
    expect(nhlFitsOn(NEW_DAY)(nhl('Dominik Hasek'), 'COL')).toBe(false)
    expect(nhlFitsOn(SHIPPED_DAY)(nhl('Dominik Hasek'), 'COL')).toBe(true)
    expect(mmaFitsOn(NEW_DAY)(mma('Dan Henderson'), 'BELLATOR')).toBe(false)
    expect(mmaFitsOn(SHIPPED_DAY)(mma('Dan Henderson'), 'BELLATOR')).toBe(true)
    // Additions count on shipped boards too.
    expect(nhlFitsOn(SHIPPED_DAY)(nhl('Bobby Orr'), 'CHI')).toBe(true)
    expect(mmaFitsOn(SHIPPED_DAY)(mma('Jon Jones'), 'SUB_WIN')).toBe(true)
  })
})
