import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { clickableProps } from './a11y'
import { usePoolMemberships } from './usePoolMemberships'

// Pinned to the page's top-right corner by default; `isInline` lets a header
// (GameShell's top bar) place it in its own layout instead.
export default function UserMenu({ isInline = false }) {
  const { user, signOut } = useAuth()
  const { poolIds } = usePoolMemberships()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  // Escape closes the menu and hands focus back to the avatar, so a keyboard
  // user on a menu item isn't dropped to the top of the page.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!user) return null

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email

  return (
    <div style={isInline ? { position: 'relative', zIndex: 50 } : { position: 'absolute', right: 16, top: 20, zIndex: 50 }}>
      <div ref={triggerRef} {...clickableProps(() => setOpen(!open))} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--surface)', border: '2px solid var(--border)',
        cursor: 'pointer', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {avatar
          ? <img src={avatar} alt="" width={36} height={36} style={{ borderRadius: '50%' }} />
          : <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>
              {name?.[0]?.toUpperCase()}
            </span>
        }
      </div>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 12, minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>{user.email}</div>
          {/* Pool members only: the pools they belong to, live and finished. */}
          {poolIds?.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
              <a href="/pools" style={{
                display: 'block', borderRadius: 6, padding: '8px 10px',
                color: 'var(--ink)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                transition: 'background 0.2s',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(var(--gold-rgb),0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <span aria-hidden="true">🏆</span> Pool History
              </a>
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <button onClick={signOut} style={{
              width: '100%', background: 'none', border: '1px solid rgba(var(--danger-text-rgb),0.25)',
              borderRadius: 6, color: 'var(--danger-text)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, padding: '8px',
              transition: 'background 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(var(--danger-text-rgb),0.07)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: -1
        }} />
      )}
    </div>
  )
}
