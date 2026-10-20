import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { POOLS } from './pools'

// Which registered pools (src/pools.js) the signed-in user belongs to, asked
// through is_member_of — the pool-scoped SECURITY DEFINER helper the pool RLS
// is built on. A plain pool_members select would not do: that table's RLS
// (is_pool_member) only shows rows to World Cup members, so an Octagon-only
// member would read none. One lookup per user per page load, shared by every
// caller; a failed lookup is dropped so the next mount asks again.
let cache = null // { userId, promise }
let refreshes = 0
const listeners = new Set()

// Drops the cached lookup and re-runs it in every mounted caller — for an
// in-page join (Octagon's join form), where no page load follows.
export function refreshPoolMemberships() {
  cache = null
  refreshes += 1
  listeners.forEach(notify => notify())
}

function subscribe(notify) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}
const getRefreshes = () => refreshes

function fetchMemberPoolIds(userId) {
  if (cache?.userId === userId) return cache.promise
  const promise = Promise.all(POOLS.map(p => supabase.rpc('is_member_of', { pool: p.id })))
    .then(results => {
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
      return POOLS.filter((_, i) => results[i].data === true).map(p => p.id)
    })
  cache = { userId, promise }
  promise.catch(() => { if (cache?.promise === promise) cache = null })
  return promise
}

// { poolIds, error }: poolIds is null while loading and [] when signed out.
export function usePoolMemberships() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [result, setResult] = useState({ userId: null, poolIds: null, error: null })
  const refreshCount = useSyncExternalStore(subscribe, getRefreshes)

  // A refresh keeps showing the previous answer until the new one lands.
  useEffect(() => {
    if (!userId) return
    let active = true
    fetchMemberPoolIds(userId).then(
      poolIds => { if (active) setResult({ userId, poolIds, error: null }) },
      error => {
        console.error('Pool membership lookup failed:', error)
        if (active) setResult({ userId, poolIds: null, error })
      },
    )
    return () => { active = false }
  }, [userId, refreshCount])

  if (!userId) return { poolIds: [], error: null }
  if (result.userId !== userId) return { poolIds: null, error: null }
  return { poolIds: result.poolIds, error: result.error }
}
