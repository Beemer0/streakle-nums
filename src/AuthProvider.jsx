import { useEffect, useState } from 'react'
import { getSupabase, mayHaveSession } from './supabaseLoader'
import { AuthContext } from './AuthContext'

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
        // auth lock. Results reference the profile row, which the database
        // creates along with the account (supabase/core.sql).
        setTimeout(async () => {
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

  // Resolves to whether the player is signed out. A logout request that fails
  // (offline, a server error) leaves the session stored, so they stay signed
  // in rather than see a signed-out page that a reload would undo; the
  // account menu says so.
  const signOut = async () => {
    try {
      const supabase = await getSupabase()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      return true
    } catch (error) {
      console.error('Error signing out:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
