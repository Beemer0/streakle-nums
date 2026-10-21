import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// A sign-in that lands with tokens in the hash (e.g. one begun before the
// switch to PKCE) is rejected by the PKCE client, which then leaves the
// tokens in the URL. Lift them out before the client reads the URL.
export function takeImplicitTokens(win) {
  if (!win) return null
  const params = new URLSearchParams(win.location.hash.slice(1))
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  win.history.replaceState(win.history.state, '', win.location.pathname + win.location.search)
  return { access_token, refresh_token }
}

const implicitTokens = takeImplicitTokens(globalThis.window)

// PKCE: the OAuth redirect carries only a single-use ?code= (useless without
// the verifier kept in this browser) instead of the implicit flow's
// #access_token/#refresh_token, which analytics and AdSense saw in the URL.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})

if (implicitTokens) {
  supabase.auth.setSession(implicitTokens).then(({ error }) => {
    if (error) console.error('Error restoring session from URL:', error)
  })
}
