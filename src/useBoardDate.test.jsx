// @vitest-environment happy-dom
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useBoardDate } from './useBoardDate'

let host, root, board
const capture = (latest) => { board = latest }
function Probe({ onRender }) {
  const latest = useBoardDate()
  useEffect(() => onRender(latest))
  return null
}
const select = (date) => act(() => { board.selectDate(date) })
const rerender = () => act(() => { root.render(<Probe onRender={capture} />) })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
  host = document.createElement('div')
  root = createRoot(host)
  act(() => { root.render(<Probe onRender={capture} />) })
})
afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
})

it("starts on today's live board", () => {
  expect(board).toMatchObject({ seedDate: '2026-10-21', isToday: true, boardKey: 'today-2026-10-21' })
})

it('keeps the dealt date past midnight', () => {
  vi.setSystemTime(new Date(2026, 9, 22, 0, 5))
  rerender()
  expect(board).toMatchObject({ seedDate: '2026-10-21', isToday: true, boardKey: 'today-2026-10-21' })
})

it('treats any other day as a replay, and the live date as a way back', () => {
  select('2026-10-18')
  expect(board).toMatchObject({ seedDate: '2026-10-18', isToday: false, boardKey: 'archive-2026-10-18' })
  select('2026-10-21')
  expect(board).toMatchObject({ seedDate: '2026-10-21', isToday: true, boardKey: 'today-2026-10-21' })
})

it("after midnight, the live board's own date returns to it and today's date moves on", () => {
  vi.setSystemTime(new Date(2026, 9, 22, 0, 5))
  rerender()
  expect(board.keyFor('2026-10-21')).toBe(board.boardKey)
  select('2026-10-21')
  expect(board).toMatchObject({ seedDate: '2026-10-21', isToday: true, boardKey: 'today-2026-10-21' })
  expect(board.keyFor('2026-10-22')).toBe('today-2026-10-22')
  select('2026-10-22')
  expect(board).toMatchObject({ seedDate: '2026-10-22', isToday: true, boardKey: 'today-2026-10-22' })
  expect(board.keyFor('2026-10-21')).toBe('archive-2026-10-21')
})
