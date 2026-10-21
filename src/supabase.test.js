import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
const { supabase, takeImplicitTokens } = await import('./supabase.js')
vi.unstubAllEnvs()

const fakeWindow = (hash, search = '') => ({
  location: { hash, pathname: '/words', search },
  history: { state: { idx: 1 }, replaceState: vi.fn() },
})

it('signs in with the PKCE flow, so OAuth tokens never land in the page URL', () => {
  expect(supabase.auth.flowType).toBe('pkce')
})

describe('takeImplicitTokens', () => {
  it('lifts implicit-flow tokens out of the URL, keeping path and query', () => {
    const win = fakeWindow('#access_token=AT&expires_in=3600&refresh_token=RT&token_type=bearer', '?x=1')
    expect(takeImplicitTokens(win)).toEqual({ access_token: 'AT', refresh_token: 'RT' })
    expect(win.history.replaceState).toHaveBeenCalledWith({ idx: 1 }, '', '/words?x=1')
  })

  it('leaves a URL without tokens alone', () => {
    const win = fakeWindow('#rules')
    expect(takeImplicitTokens(win)).toBeNull()
    expect(win.history.replaceState).not.toHaveBeenCalled()
  })

  it('does nothing outside a browser', () => {
    expect(takeImplicitTokens(undefined)).toBeNull()
  })
})
