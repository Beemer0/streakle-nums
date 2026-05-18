import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email

  return (
    <div style={{ position: 'absolute', right: 16, top: 20, zIndex: 50 }}>
      {/* Avatar button */}
      <div onClick={() => setOpen(!open)} style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#2a2a6a', border: '2px solid #4a4a8a',
        cursor: 'pointer', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {avatar
          ? <img src={avatar} width={36} height={36} style={{ borderRadius: '50%' }} />
          : <span style={{ fontSize: 14, fontWeight: 700, color: '#aaaaff' }}>
              {name?.[0]?.toUpperCase()}
            </span>
        }
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44,
          background: '#16213e', border: '1px solid #2a2a6a',
          borderRadius: 10, padding: 12, minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#6666aa', marginBottom: 12 }}>{user.email}</div>
          <div style={{ borderTop: '1px solid #2a2a6a', paddingTop: 10 }}>
            <button onClick={signOut} style={{
              width: '100%', background: 'none', border: '1px solid #e94560',
              borderRadius: 6, color: '#e94560', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, padding: '8px',
              transition: 'background 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.background = '#e9456022'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: -1
        }} />
      )}
    </div>
  )
}