import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { calcStreak } from './streak'

export function useStreak(game) {
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStreak() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('game_results')
        .select('puzzle_date')
        .eq('user_id', user.id)
        .eq('game', game)
        .eq('completed', true)

      setStreak(calcStreak((data || []).map(r => r.puzzle_date)))
      setLoading(false)
    }

    fetchStreak()
  }, [game])

  return { streak, loading }
}
