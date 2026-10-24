// The Supabase client is most of what the entry chunk would carry, and a
// guest's first paint needs none of it, so first-paint code (the auth
// provider, the account menu, Home) loads it on first use. Lazy routes may
// still import ./supabase directly. Every caller shares the one load (Vitest
// can hand a second, concurrent import of a mocked module the real one); a
// failed load is dropped so the next call tries again.
let loading = null
export function getSupabase() {
  loading ??= import('./supabase.js').then(m => m.supabase, error => {
    loading = null
    throw error
  })
  return loading
}

// Where supabase-js keeps the session: its default storageKey
// (supabase.test.js checks the client agrees).
export function authStorageKey(supabaseUrl) {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
}

// Whether this page might have a signed-in user, read without loading the
// client: a stored session, or a sign-in landing on the page (the PKCE
// ?code=, or tokens in the hash from the old implicit flow). Only a page that
// might waits for Supabase before rendering; a guest's renders at once.
export function mayHaveSession(win, supabaseUrl = import.meta.env.VITE_SUPABASE_URL) {
  if (!win) return false
  try {
    if (win.localStorage.getItem(authStorageKey(supabaseUrl)) !== null) return true
  } catch {
    return true // unreadable: wait for the client, as before
  }
  return new URLSearchParams(win.location.search).has('code') ||
    new URLSearchParams(win.location.hash.slice(1)).has('access_token')
}
