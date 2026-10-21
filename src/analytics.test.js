import { describe, it, expect } from 'vitest'
import { scrubUrl, scrubAnalyticsEvent } from './analytics'

describe('scrubUrl', () => {
  it('drops an implicit-flow token fragment', () => {
    expect(scrubUrl('https://playstreakle.com/#access_token=eyJ.a.b&refresh_token=r1&token_type=bearer'))
      .toBe('https://playstreakle.com/')
  })

  it("drops the PKCE callback's code and keeps the path and other params", () => {
    expect(scrubUrl('https://playstreakle.com/words?code=abc123&utm_source=x'))
      .toBe('https://playstreakle.com/words?utm_source=x')
  })

  it('drops OAuth error params', () => {
    expect(scrubUrl('https://playstreakle.com/?error=access_denied&error_code=403&error_description=Denied'))
      .toBe('https://playstreakle.com/')
  })

  it('leaves an ordinary page URL alone', () => {
    expect(scrubUrl('https://playstreakle.com/mines')).toBe('https://playstreakle.com/mines')
  })

  it('leaves a query without auth params byte-for-byte', () => {
    expect(scrubUrl('https://playstreakle.com/?utm_campaign=spring%20sale&ref=a/b&flag'))
      .toBe('https://playstreakle.com/?utm_campaign=spring%20sale&ref=a/b&flag')
  })
})

describe('scrubAnalyticsEvent', () => {
  it('scrubs the URL and keeps the rest of the event', () => {
    expect(scrubAnalyticsEvent({ type: 'pageview', url: 'https://playstreakle.com/#refresh_token=r1' }))
      .toEqual({ type: 'pageview', url: 'https://playstreakle.com/' })
  })

  it('drops an event whose URL cannot be parsed', () => {
    expect(scrubAnalyticsEvent({ type: 'pageview', url: 'not a url' })).toBeNull()
  })
})
