import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'
import { useSeo, PAGE_SEO } from './seo'
import { usePoolMemberships } from './usePoolMemberships'
import { groupPools, finishLines } from './pools'

const GOLD = '#C9A84C', CARD = '#1C1A16', BORDER = '#2C2820', INK = '#F5F0E8', MUTED = '#7A6E5F', LIVE = '#86EFAC'

const css = `
@keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
.ph-row { display:flex; align-items:center; gap:16px; padding:18px 20px; background:${CARD}; text-decoration:none; transition:background 0.15s; }
.ph-row:hover { background:#211F1A; }
.ph-row:focus-visible { outline-offset:-3px; }
.ph-row:hover .ph-cta-live { background:#D4B45A; }
.ph-row:hover .ph-cta-past { border-color:${GOLD}; }
@media (max-width:520px) {
  .ph-row { padding:14px 16px; gap:12px; }
  .ph-cta-label { display:none; }
}
@media (prefers-reduced-motion:reduce) { .ph-section { animation:none !important; } }
`

const sectionHeading = {
  fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
  color: MUTED, margin: '0 0 10px 4px',
}

// A pool's row: its name and kind, a Live badge or the final standings recap,
// and a call to action — the whole row links through to the pool's page.
function PoolRow({ pool, lines }) {
  const isLive = !pool.archive
  return (
    <a href={pool.path} className="ph-row" style={{ borderLeft: `4px solid ${isLive ? LIVE : GOLD}` }}>
      <span aria-hidden="true" style={{ fontSize: 28, width: 36, flexShrink: 0, textAlign: 'center' }}>{pool.emoji}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800,
            letterSpacing: 1, color: INK, lineHeight: 1,
          }}>{pool.name}</span>
          {isLive && (
            <span style={{
              background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.22)',
              borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', color: LIVE,
            }}>Live</span>
          )}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>
          {pool.kind}
        </span>
        {lines.map(line => (
          <span key={line} style={{ fontSize: 13, color: '#A89880', lineHeight: 1.45 }}>{line}</span>
        ))}
      </span>
      <span className={isLive ? 'ph-cta-live' : 'ph-cta-past'} style={{
        flexShrink: 0, borderRadius: 20, padding: '7px 14px',
        fontSize: 12, fontWeight: 700, letterSpacing: 0.4, whiteSpace: 'nowrap',
        transition: 'background 0.15s, border-color 0.15s',
        ...(isLive
          ? { background: GOLD, color: '#0F0E0C' }
          : { border: '1px solid rgba(201,168,76,0.35)', color: GOLD }),
      }}>
        <span className="ph-cta-label">{isLive ? 'Open pool ' : 'Final results '}</span>→
      </span>
    </a>
  )
}

function PoolSection({ title, pools, userId, delay }) {
  const headingId = `pools-${title.toLowerCase()}`
  return (
    <section aria-labelledby={headingId} className="ph-section" style={{ marginTop: 32, animation: `fadeIn 0.4s ${delay}ms both ease` }}>
      <h2 id={headingId} style={sectionHeading}>{title}</h2>
      <ul style={{
        listStyle: 'none', margin: 0, padding: 0,
        border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}>
        {pools.map((pool, i) => (
          <li key={pool.id} style={{ borderTop: i ? `1px solid ${BORDER}` : 'none' }}>
            <PoolRow pool={pool} lines={pool.archive ? finishLines(pool.archive.standings, userId) : []} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <style>{css}</style>
      <UserMenu />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px 64px', color: INK }}>
        <a href="/" style={{ color: GOLD, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back</a>
        {children}
      </main>
    </div>
  )
}

function Loading() {
  return <Shell><p role="status" style={{ marginTop: 40, fontSize: 13, color: MUTED }}>Loading…</p></Shell>
}

function LoadError() {
  return (
    <Shell>
      <div role="alert" style={{ marginTop: 40, fontSize: 14, color: '#A89880' }}>
        Couldn't load this page.
        <button onClick={() => window.location.reload()} style={{
          display: 'block', marginTop: 12, background: 'none', cursor: 'pointer',
          border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6,
          color: GOLD, fontSize: 13, fontWeight: 600, padding: '7px 14px',
        }}>Try again</button>
      </div>
    </Shell>
  )
}

// The pools the signed-in user belongs to: live ones first, then finished
// ones with their final standings. Guests and non-members are sent home, and
// nothing names a pool until membership is known.
export default function PoolHistory() {
  useSeo(PAGE_SEO.pools)
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { poolIds, error: membershipError } = usePoolMemberships()
  const [archives, setArchives] = useState({ userId: null, rows: null, error: null })

  // RLS (is_member_of) returns only the archives of pools the viewer was in.
  useEffect(() => {
    if (!userId) return
    let active = true
    supabase.from('pool_archive').select('pool_id,archived_at,standings').then(({ data, error }) => {
      if (error) console.error('Pool archive lookup failed:', error)
      if (active) setArchives({ userId, rows: data ?? [], error })
    })
    return () => { active = false }
  }, [userId])

  // Membership first: non-members leave as soon as it is known, before the
  // archive read (which RLS leaves empty for them anyway) can matter.
  const current = archives.userId === userId ? archives : { rows: null, error: null }
  if (!user) return <Navigate to="/" replace />
  if (membershipError) return <LoadError />
  if (!poolIds) return <Loading />
  if (poolIds.length === 0) return <Navigate to="/" replace />
  if (current.error) return <LoadError />
  if (!current.rows) return <Loading />

  const { active, past } = groupPools(poolIds, current.rows)
  return (
    <Shell>
      <h1 style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800,
        letterSpacing: 3, color: INK, margin: '28px 0 0', lineHeight: 1.1,
      }}>
        POOL HISTORY
      </h1>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: GOLD, marginTop: 8 }}>
        Your private pools
      </div>
      {active.length > 0 && <PoolSection title="Active" pools={active} userId={userId} delay={0} />}
      {past.length > 0 && <PoolSection title="Past" pools={past} userId={userId} delay={active.length ? 80 : 0} />}
    </Shell>
  )
}
