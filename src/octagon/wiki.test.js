// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { parseResults, parsePasted, matchFights, mapMethod, norm } from './wiki.js'

// Real Wikipedia REST HTML (trimmed to the Results table) for UFC 323 —
// 13 decided bouts + 1 majority draw across three card sections.
// cwd-relative: happy-dom rewrites import.meta.url to an http:// URL.
const HTML = readFileSync('src/octagon/fixtures/ufc_323.html', 'utf8')

describe('parseResults (UFC 323 fixture)', () => {
  const rows = parseResults(HTML)

  it('finds every bout across all three card sections', () => {
    expect(rows).toHaveLength(14)
    expect(new Set(rows.map(r => r.card)).size).toBe(3)
    expect(rows[0].card).toBe('Main card')
  })

  it('parses the main event, stripping the (c) champion marker', () => {
    const main = rows[0]
    expect(main.weightClass).toBe('Bantamweight')
    expect(main.name1).toBe('Petr Yan')
    expect(main.name2).toBe('Merab Dvalishvili')
    expect(main.decided).toBe(true)
    expect(main.method).toBe('dec')
    expect(main.round).toBe(5)
  })

  it('parses the draw as an undecided bout', () => {
    const draw = rows.find(r => !r.decided)
    expect(draw.name1).toBe('Jan Błachowicz')
    expect(draw.name2).toBe('Bogdan Guskov')
    expect(draw.method).toBe('draw')
    expect(draw.methodRaw).toMatch(/^Draw \(majority\)/)
  })

  it('parses a submission finish with its round', () => {
    const sub = rows.find(r => r.name1 === 'Mansur Abdul-Malik')
    expect(sub.name2).toBe('Antonio Trócoli')
    expect(sub.method).toBe('sub')
    expect(sub.round).toBe(1)
  })

  it('returns [] when no results table is present', () => {
    expect(parseResults('<html><body><p>nothing</p></body></html>')).toEqual([])
  })
})

describe('mapMethod', () => {
  it('maps the common finishes and decisions', () => {
    expect(mapMethod('KO (head kick)')).toBe('ko')
    expect(mapMethod('TKO (punches)')).toBe('ko')
    expect(mapMethod('Submission (rear-naked choke)')).toBe('sub')
    expect(mapMethod('Technical Submission (guillotine choke)')).toBe('sub')
    expect(mapMethod('Decision (split)')).toBe('dec')
    expect(mapMethod('Technical Decision (unanimous)')).toBe('dec')
    expect(mapMethod('Draw (split)')).toBe('draw')
    expect(mapMethod('No Contest (accidental eye poke)')).toBe('nc')
  })

  it('leaves oddities (DQ etc.) to the admin', () => {
    expect(mapMethod('DQ (illegal knee)')).toBeNull()
    expect(mapMethod('')).toBeNull()
  })
})

describe('norm', () => {
  it('flattens diacritics and special letters for matching', () => {
    expect(norm('Jan Błachowicz')).toBe('jan blachowicz')
    expect(norm('İbo Aslan')).toBe('ibo aslan')
    expect(norm('Antonio Trócoli')).toBe('antonio trocoli')
    expect(norm('Mansur Abdul-Malik')).toBe('mansur abdul malik')
  })
})

describe('matchFights (against the fixture)', () => {
  const rows = parseResults(HTML)

  it('proposes the right side regardless of a/b order', () => {
    const [p] = matchFights(rows, [
      { id: 1, fighter_a: 'Merab Dvalishvili', fighter_b: 'Petr Yan' },
    ])
    expect(p).toMatchObject({ fight_id: 1, winner: 'b', method: 'dec', end_round: 5, fuzzy: false })
  })

  it('matches ASCII-typed names against accented wiki names', () => {
    const [p] = matchFights(rows, [
      { id: 2, fighter_a: 'Jan Blachowicz', fighter_b: 'Bogdan Guskov' },
    ])
    expect(p.winner).toBe('draw')
    expect(p.method).toBeNull()
    expect(p.fuzzy).toBe(false)
  })

  it('falls back to last-name matching, flagged fuzzy', () => {
    const [p] = matchFights(rows, [
      { id: 3, fighter_a: 'P. Talbott', fighter_b: 'H. Cejudo' },
    ])
    expect(p).toMatchObject({ fight_id: 3, winner: 'a', method: 'dec', fuzzy: true })
  })

  it('omits fights with no matching row', () => {
    expect(matchFights(rows, [
      { id: 4, fighter_a: 'Jon Jones', fighter_b: 'Tom Aspinall' },
    ])).toEqual([])
  })
})

describe('parsePasted', () => {
  const text = [
    'Main card',
    'Bantamweight\tPetr Yan\tdef.\tMerab Dvalishvili (c)\tDecision (unanimous)\t5\t5:00',
    'Light Heavyweight\tJan Błachowicz\tvs.\tBogdan Guskov\tDraw (majority)\t3\t5:00',
    'random noise line',
  ].join('\n')

  it('parses tab-separated rows into the same shape', () => {
    const rows = parsePasted(text)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      card: 'Main card', weightClass: 'Bantamweight',
      name1: 'Petr Yan', name2: 'Merab Dvalishvili',
      decided: true, method: 'dec', round: 5,
    })
    expect(rows[1]).toMatchObject({ decided: false, method: 'draw' })
  })
})
