import { describe, it, expect, vi } from 'vitest'

// The first load fails (offline, a stale deploy); later ones succeed.
const loads = vi.hoisted(() => ({ count: 0 }))
vi.mock('./supabase', () => {
  loads.count += 1
  if (loads.count === 1) throw new Error('offline')
  return { supabase: { client: loads.count } }
})

const { authStorageKey, getSupabase, mayHaveSession } = await import('./supabaseLoader.js')

const PROJECT_URL = 'https://abcd1234.supabase.co'
const KEY = 'sb-abcd1234-auth-token'

const fakeWindow = ({ stored = {}, search = '', hash = '', getItem } = {}) => ({
  location: { search, hash },
  localStorage: { getItem: getItem ?? ((k) => (k in stored ? stored[k] : null)) },
})

describe('getSupabase', () => {
  it('retries after a failed load, then shares the one client', async () => {
    await expect(getSupabase()).rejects.toThrow()
    const [a, b] = await Promise.all([getSupabase(), getSupabase()])
    expect(a).toEqual({ client: 2 })
    expect(b).toBe(a)
    expect(await getSupabase()).toBe(a)
    expect(loads.count).toBe(2)
  })
})

describe('authStorageKey', () => {
  it("is supabase-js's default key for the project", () => {
    expect(authStorageKey(PROJECT_URL)).toBe(KEY)
  })
})

describe('mayHaveSession', () => {
  it('is false for a guest: nothing stored, no sign-in in the URL', () => {
    expect(mayHaveSession(fakeWindow(), PROJECT_URL)).toBe(false)
    expect(mayHaveSession(fakeWindow({ search: '?x=1', hash: '#rules' }), PROJECT_URL)).toBe(false)
  })

  it('is true with a stored session', () => {
    expect(mayHaveSession(fakeWindow({ stored: { [KEY]: '{}' } }), PROJECT_URL)).toBe(true)
  })

  it("ignores another project's session", () => {
    expect(mayHaveSession(fakeWindow({ stored: { 'sb-other-auth-token': '{}' } }), PROJECT_URL)).toBe(false)
  })

  it('is true while a PKCE sign-in lands with ?code=', () => {
    expect(mayHaveSession(fakeWindow({ search: '?code=abc' }), PROJECT_URL)).toBe(true)
  })

  it('is true while implicit-flow tokens sit in the hash', () => {
    expect(mayHaveSession(fakeWindow({ hash: '#access_token=AT&refresh_token=RT' }), PROJECT_URL)).toBe(true)
  })

  it('waits for the client when storage or the project URL is unreadable', () => {
    const blocked = fakeWindow({ getItem: () => { throw new Error('SecurityError') } })
    expect(mayHaveSession(blocked, PROJECT_URL)).toBe(true)
    expect(mayHaveSession(fakeWindow(), '')).toBe(true)
  })

  it('is false outside a browser', () => {
    expect(mayHaveSession(undefined, PROJECT_URL)).toBe(false)
  })
})
