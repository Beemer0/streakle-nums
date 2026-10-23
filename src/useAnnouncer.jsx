import { useCallback, useState } from 'react'

// A polite live region for game feedback, for screen-reader users.
// const [announce, liveRegion] = useAnnouncer(); render {liveRegion} once
// (always mounted), then announce('Not a valid word') — repeating the same
// text still reads it again (the trailing zero-width space toggles).
export function useAnnouncer() {
  const [live, setLive] = useState({ n: 0, text: '' })
  const announce = useCallback((text) => setLive(l => ({ n: l.n + 1, text })), [])
  const liveRegion = (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {live.text}{live.n % 2 ? '​' : ''}
    </div>
  )
  return [announce, liveRegion]
}
