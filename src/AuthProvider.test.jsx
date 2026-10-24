// @vitest-environment happy-dom
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

const { events, calls, sendPendingResults, getSession } = vi.hoisted(() => ({
  events: [],
  calls: [],
  sendPendingResults: vi.fn(async (id) => { calls.push(`send:${id}`) }),
  getSession: vi.fn(),
}))

vi.mock('./saveResult', () => ({ sendPendingResults }))
vi.mock('./supabase', () => {
  const profiles = {
    select: () => profiles,
    eq: () => profiles,
    single: async () => { calls.push('profile:read'); return { data: null } },
    insert: async () => { calls.push('profile:create'); return { error: null } },
  }
  return {
    supabase: {
      auth: {
        getSession,
        onAuthStateChange: (cb) => { events.push(cb); return { data: { subscription: { unsubscribe() {} } } } },
        signOut: async () => ({ error: null }),
      },
      from: () => profiles,
    },
  }
})

vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')

// Node 25's own (method-less, without --localstorage-file) localStorage
// shadows happy-dom's; the session check needs a working one.
function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)) },
    clear: () => { data.clear() },
  }
}
vi.stubGlobal('localStorage', memoryStorage())

const { AuthProvider } = await import('./AuthProvider.jsx')
const { useAuth } = await import('./AuthContext.js')
const SESSION_KEY = 'sb-example-auth-token'

function Probe() {
  const { user, loading } = useAuth()
  return <p>{loading ? 'loading' : user?.id ?? 'guest'}</p>
}

let host, root
const mount = () => act(async () => { root.render(<AuthProvider><Probe /></AuthProvider>) })

beforeEach(() => {
  events.length = 0
  calls.length = 0
  sendPendingResults.mockClear()
  getSession.mockReset().mockResolvedValue({ data: { session: null } })
  localStorage.clear()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()) })

const fire = (session) => act(async () => {
  events.forEach(cb => cb('SIGNED_IN', session))
  await new Promise(r => setTimeout(r, 10))
})

it("sends the user's waiting results once their profile row exists", async () => {
  await mount()
  await vi.waitFor(() => expect(events).toHaveLength(1))
  await fire({ user: { id: 'u-1', email: 'a@b.c', user_metadata: {} } })
  expect(calls).toEqual(['profile:read', 'profile:create', 'send:u-1'])
})

it('sends nothing without a signed-in user', async () => {
  await mount()
  await vi.waitFor(() => expect(events).toHaveLength(1))
  await fire(null)
  expect(calls).toEqual([])
})

it("renders a guest's page without waiting for Supabase", async () => {
  getSession.mockReturnValue(new Promise(() => {}))
  await mount()
  expect(host.textContent).toBe('guest')
})

it('holds a page with a stored session until Supabase has read it', async () => {
  let resolve
  getSession.mockReturnValue(new Promise(r => { resolve = r }))
  localStorage.setItem(SESSION_KEY, '{}')
  await mount()
  expect(host.textContent).toBe('loading')
  await vi.waitFor(() => expect(getSession).toHaveBeenCalled())
  await act(async () => resolve({ data: { session: { user: { id: 'u-1' } } } }))
  expect(host.textContent).toBe('u-1')
})

it('lets the page render when reading a stored session fails', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  getSession.mockRejectedValue(new Error('lock timeout'))
  localStorage.setItem(SESSION_KEY, '{}')
  await mount()
  await vi.waitFor(() => expect(host.textContent).toBe('guest'))
  expect(log).toHaveBeenCalledWith('Error reading session:', expect.any(Error))
  log.mockRestore()
})
