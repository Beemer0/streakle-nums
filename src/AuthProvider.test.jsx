// @vitest-environment happy-dom
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

const { events, calls, sendPendingResults } = vi.hoisted(() => ({
  events: [],
  calls: [],
  sendPendingResults: vi.fn(async (id) => { calls.push(`send:${id}`) }),
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
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: (cb) => { events.push(cb); return { data: { subscription: { unsubscribe() {} } } } },
        signOut: async () => ({ error: null }),
      },
      from: () => profiles,
    },
  }
})

const { AuthProvider } = await import('./AuthProvider.jsx')

let host, root
beforeEach(async () => {
  events.length = 0
  calls.length = 0
  sendPendingResults.mockClear()
  host = document.createElement('div')
  root = createRoot(host)
  await act(async () => { root.render(<AuthProvider><p>app</p></AuthProvider>) })
})
afterEach(() => { act(() => root.unmount()) })

const fire = (session) => act(async () => {
  events.forEach(cb => cb('SIGNED_IN', session))
  await new Promise(r => setTimeout(r, 10))
})

it("sends the user's waiting results once their profile row exists", async () => {
  await fire({ user: { id: 'u-1', email: 'a@b.c', user_metadata: {} } })
  expect(calls).toEqual(['profile:read', 'profile:create', 'send:u-1'])
})

it('sends nothing without a signed-in user', async () => {
  await fire(null)
  expect(calls).toEqual([])
})
