import { describe, it, expect } from 'vitest'
import { GAMES, GAME_BY_KEY } from './games'

describe('games registry', () => {
  it('has a unique key and path for every game', () => {
    expect(new Set(GAMES.map(g => g.key)).size).toBe(GAMES.length)
    expect(GAMES.every(g => g.path === `/${g.key}`)).toBe(true)
    expect(GAME_BY_KEY.weave.title).toBe('WEAVE')
  })
})
