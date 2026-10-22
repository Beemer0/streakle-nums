import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { AuthContext } from './AuthContext'
import { sendPendingResults } from './saveResult'

// Create a profile row on first sign in
async function createProfile(user) {
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      const signedIn = session?.user
      if (!signedIn) return
      // Deferred: supabase calls made inside this callback can deadlock the
      // auth lock. Results reference the profile row, so it goes first.
      setTimeout(async () => {
        await createProfile(signedIn)
        sendPendingResults(signedIn.id)
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
