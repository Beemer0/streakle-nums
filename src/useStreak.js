import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useStreak(game) {
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStreak() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('game_results')
        .select('puzzle_date, completed')
        .eq('user_id', user.id)
        .eq('game', game)
        .eq('completed', true)
        .order('puzzle_date', { ascending: false })

      if (!data || data.length === 0) { setStreak(0); setLoading(false); return; }

      // Get today as YYYY-MM-DD string in local time
      const todayStr = new Date().toLocaleDateString('en-CA') // returns YYYY-MM-DD

      let count = 0
      for (let i = 0; i < data.length; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const expected = d.toLocaleDateString('en-CA')
        if (data[i].puzzle_date === expected) {
          count++
        } else {
          break
        }
      }

      setStreak(count)
      setLoading(false)
    }

    fetchStreak()
  }, [game])

  return { streak, loading }
}