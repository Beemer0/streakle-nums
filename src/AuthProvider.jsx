import { useEffect, useState } from 'react'
import { getSupabase, mayHaveSession } from './supabaseLoader'
import { AuthContext } from './AuthContext'

// Create a profile row on first sign in
async function createProfile(supabase, user) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!data) {
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name || user.email,
      avatar_url: user.user_metadata?.avatar_url,
    })
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // A guest's page renders straight away; one that may hold a session waits
  // for Supabase to read it, so it never flashes the signed-out view.
  const [loading, setLoading] = useState(() => mayHaveSession(globalThis.window))

  useEffect(() => {
    let active = true
    let subscription = null

    getSupabase().then(supabase => {
      if (!active) return

      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active) return
        setUser(session?.user ?? null)
        setLoading(false)
      }, error => {
        console.error('Error reading session:', error)
        if (active) setLoading(false)
      })

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        const signedIn = session?.user
        if (!signedIn) return
        // Deferred: supabase calls made inside this callback can deadlock the
        // auth lock. Results reference the profile row, so it goes first.
        setTimeout(async () => {
          await createProfile(supabase, signedIn)
          const { sendPendingResults } = await import('./saveResult')
          sendPendingResults(signedIn.id)
        }, 0)
      })
      subscription = data.subscription
    }, error => {
      // The client didn't load (offline, a stale deploy): carry on signed out.
      console.error('Error loading Supabase:', error)
      if (active) setLoading(false)
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
