import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

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
      // Create profile on first sign in
      if (session?.user) createProfile(session.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const createProfile = async (user) => {
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

export const useAuth = () => useContext(AuthContext)