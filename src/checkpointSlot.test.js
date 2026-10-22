import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { slotHoldsLaterDay } from './checkpointSlot'

const slot = new Map()
vi.stubGlobal('localStorage', { getItem: (k) => slot.get(k) ?? null })
const store = (value) => slot.set('streakle-test', typeof value === 'string' ? value : JSON.stringify(value))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 22, 0, 5))
  slot.clear()
})
afterEach(() => { vi.useRealTimers() })

it("blocks a write for an earlier day over today's board", () => {
  store({ v: 1, date: '2026-10-22' })
  expect(slotHoldsLaterDay('streakle-test', '2026-10-21')).toBe(true)
})

it('allows a write for the same or a later day', () => {
  store({ v: 1, date: '2026-10-21' })
  expect(slotHoldsLaterDay('streakle-test', '2026-10-21')).toBe(false)
  expect(slotHoldsLaterDay('streakle-test', '2026-10-22')).toBe(false)
})

it('never lets a slot dated past the real today block a write', () => {
  store({ v: 1, date: '2026-10-23' })
  expect(slotHoldsLaterDay('streakle-test', '2026-10-22')).toBe(false)
})

it('never lets an empty or unreadable slot block a write', () => {
  expect(slotHoldsLaterDay('streakle-test', '2026-10-21')).toBe(false)
  store('{not json')
  expect(slotHoldsLaterDay('streakle-test', '2026-10-21')).toBe(false)
  store({ date: 20261022 })
  expect(slotHoldsLaterDay('streakle-test', '2026-10-21')).toBe(false)
})
