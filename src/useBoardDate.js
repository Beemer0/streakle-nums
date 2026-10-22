import { useState } from 'react'

const todayStr = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

// Which day a game page shows. Today's board keeps the date it was dealt, so
// a page left open across midnight finishes (and saves) that day's puzzle
// instead of swapping boards mid-game. In the Archive, the live board's own
// date returns to it and today's date moves it on to the new day; any other
// pick is a replay: never today, never saved.
export function useBoardDate() {
  const [liveDate, setLiveDate] = useState(todayStr)
  const [archiveDate, setArchiveDate] = useState(null)

  const isToday = archiveDate === null
  const seedDate = archiveDate ?? liveDate
  // Remount the board whenever the day or the replay/today mode changes.
  const keyFor = (date) => (date === liveDate || date === todayStr() ? `today-${date}` : `archive-${date}`)
  const boardKey = isToday ? `today-${liveDate}` : `archive-${archiveDate}`

  const selectDate = (date) => {
    if (date !== liveDate && date === todayStr()) setLiveDate(date)
    setArchiveDate(date === liveDate || date === todayStr() ? null : date)
  }

  return { seedDate, isToday, boardKey, keyFor, selectDate }
}
