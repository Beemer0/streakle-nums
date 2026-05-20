import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { clickableProps } from './a11y'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!user) return null

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email

  return (
    <div style={{ position: 'absolute', right: 16, top: 20, zIndex: 50 }}>
      <div {...clickableProps(() => setOpen(!open))} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#1C1A16', border: '2px solid #2C2820',
        cursor: 'pointer', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {avatar
          ? <img src={avatar} alt="" width={36} height={36} style={{ borderRadius: '50%' }} />
          : <span style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C' }}>
              {name?.[0]?.toUpperCase()}
            </span>
        }
      </div>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44,
          background: '#1C1A16', border: '1px solid #2C2820',
          borderRadius: 10, padding: 12, minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F0E8', marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#7A6E5F', marginBottom: 12 }}>{user.email}</div>
          <div style={{ borderTop: '1px solid #2C2820', paddingTop: 10 }}>
            <button onClick={signOut} style={{
              width: '100%', background: 'none', border: '1px solid rgba(252,165,165,0.25)',
              borderRadius: 6, color: '#FCA5A5', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, padding: '8px',
              transition: 'background 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(252,165,165,0.07)'}
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
