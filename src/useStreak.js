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

      // Calculate streak — count consecutive days back from today
      let count = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < data.length; i++) {
        const date = new Date(data[i].puzzle_date)
        date.setHours(0, 0, 0, 0)
        const expected = new Date(today)
        expected.setDate(today.getDate() - i)
        if (date.getTime() === expected.getTime()) {
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