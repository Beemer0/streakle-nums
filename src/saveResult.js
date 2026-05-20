import { supabase } from './supabase'

export async function saveResult({ game, completed, score = 0, swaps_used = 0 }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

  const { error } = await supabase
    .from('game_results')
    .upsert({
      user_id: user.id,
      game,
      puzzle_date: today,
      completed,
      score,
      swaps_used,
    }, {
      onConflict: 'user_id,game,puzzle_date'
    })

  if (error) console.error('Error saving result:', error)
}