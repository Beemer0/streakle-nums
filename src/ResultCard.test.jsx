// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ResultCard from './ResultCard'
import { nextGame } from './games'

let host, root
async function render(ui) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => { root.render(ui) })
}
afterEach(() => {
  act(() => root.unmount()); host.remove()
  vi.unstubAllGlobals()
})

// Stubs the browser's share sheet / clipboard for one test.
function stubSharing({ share, writeText = vi.fn(() => Promise.resolve()) }) {
  vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText } })
  return writeText
}
const shareButton = () => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Share'))
const click = (el) => act(async () => { el.click() })

describe('ResultCard', () => {
  it('shows the outcome, the game\'s own stats and a link to the next game', async () => {
    await render(
      <ResultCard game="weave" outcome="won" title="🎉 Woven!" shareText={() => 'x'}>
        <div className="rc-detail">CRANE · SLATE</div>
      </ResultCard>
    )
    expect(host.querySelector('.rc-title').textContent).toBe('🎉 Woven!')
    expect(host.textContent).toContain('CRANE · SLATE')
    const next = host.querySelector('a.rc-next')
    expect(next.getAttribute('href')).toBe(nextGame('weave').path)
    expect(next.textContent).toContain(nextGame('weave').title)
    expect(shareButton().className).toContain('rc-btn-primary')
  })

  it('de-emphasises sharing on a loss', async () => {
    await render(<ResultCard game="link" outcome="lost" title="Game over!" shareText={() => 'x'} />)
    expect(host.querySelector('section').className).toContain('rc-lost')
    expect(shareButton().className).not.toContain('rc-btn-primary')
  })

  it('copies the share text and flashes "Copied!" where there is no share sheet', async () => {
    const writeText = stubSharing({ share: undefined })
    await render(<ResultCard game="nums" outcome="won" title="🎉 Solved!" shareText={() => 'NUMS 3/20'} />)
    await click(shareButton())
    expect(writeText).toHaveBeenCalledWith('NUMS 3/20')
    expect(host.textContent).toContain('Copied!')
  })

  it('uses the share sheet, and treats closing it as no error', async () => {
    const share = vi.fn(() => Promise.reject(Object.assign(new Error('closed'), { name: 'AbortError' })))
    const writeText = stubSharing({ share })
    await render(<ResultCard game="nums" outcome="won" title="🎉 Solved!" shareText={() => 'NUMS'} />)
    await click(shareButton())
    expect(share).toHaveBeenCalledWith({ text: 'NUMS' })
    expect(writeText).not.toHaveBeenCalled()
    expect(host.textContent).not.toContain('Copied!')
  })

  it('falls back to the clipboard when the share sheet fails', async () => {
    const share = vi.fn(() => Promise.reject(new Error('not allowed')))
    const writeText = stubSharing({ share })
    await render(<ResultCard game="nums" outcome="won" title="🎉 Solved!" shareText={() => 'NUMS'} />)
    await click(shareButton())
    expect(writeText).toHaveBeenCalledWith('NUMS')
    expect(host.textContent).toContain('Copied!')
  })
})

describe('nextGame', () => {
  it('wraps from the last game back to the first', () => {
    expect(nextGame('scramble').key).toBe('weave')
    expect(nextGame('knockout').key).toBe('scramble')
  })
})
