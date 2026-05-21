import { describe, it, expect } from 'vitest'
import { evaluate } from './evaluate'

describe('evaluate', () => {
  it('marks an exact match all correct', () => {
    expect(evaluate('CRANE', 'CRANE')).toEqual(
      ['correct', 'correct', 'correct', 'correct', 'correct'])
  })

  it('marks letters not in the word absent', () => {
    expect(evaluate('TUMID', 'CRANE')).toEqual(
      ['absent', 'absent', 'absent', 'absent', 'absent'])
  })

  it('marks every right-letter-wrong-spot present', () => {
    expect(evaluate('HEART', 'EARTH')).toEqual(
      ['present', 'present', 'present', 'present', 'present'])
  })

  it('does not over-mark a repeated guess letter', () => {
    // ROBOT has O at index 1 and 3; guessing all Os marks only those correct
    expect(evaluate('OOOOO', 'ROBOT')).toEqual(
      ['absent', 'correct', 'absent', 'correct', 'absent'])
  })

  it('lets a correct position consume the only matching target letter', () => {
    // GHOST has a single O at index 2; the extra Os are absent, not present
    expect(evaluate('OOOXX', 'GHOST')).toEqual(
      ['absent', 'absent', 'correct', 'absent', 'absent'])
  })

  it('matches each repeated letter against a distinct target letter', () => {
    // SPEED has two Es; both Es in the guess find one each
    expect(evaluate('ERASE', 'SPEED')).toEqual(
      ['present', 'absent', 'absent', 'present', 'present'])
  })
})
