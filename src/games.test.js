import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { GAMES, GAME_BY_KEY } from './games'

describe('games registry', () => {
  it('has a unique key and path for every game', () => {
    expect(new Set(GAMES.map(g => g.key)).size).toBe(GAMES.length)
    expect(GAMES.every(g => g.path === `/${g.key}`)).toBe(true)
    expect(GAME_BY_KEY.weave.title).toBe('WEAVE')
  })

  // game_results accepts only the keys its CHECK lists, so a game missing
  // there fails every save. This pins the repo copy; the live constraint
  // needs the same change.
  it('lists exactly the game keys the database accepts', () => {
    const sql = readFileSync(new URL('../supabase/core.sql', import.meta.url), 'utf8')
    const list = sql.match(/game_results_game_check check \(game in\s*\(([^)]*)\)/)?.[1] ?? ''
    const accepted = [...list.matchAll(/'([a-z]+)'/g)].map(m => m[1])
    expect(accepted.sort()).toEqual(GAMES.map(g => g.key).sort())
  })
})
