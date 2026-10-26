import { useState, useEffect, useRef, useId } from 'react'
import { useAuth } from './AuthContext'
import { usePoolMemberships } from './usePoolMemberships'

// A region that keeps its keys to itself: while focus is inside one, the
// page-wide keyboard shortcuts (a game's typing: letters, Backspace, Enter,
// Escape) stand down. The open account menu is one; another popup can carry
// the same data-no-page-shortcuts attribute.
export const NO_PAGE_SHORTCUTS = '[data-no-page-shortcuts]'

// Pinned to the page's top-right corner by default; `isInline` lets a header
// (GameShell's top bar) place it in its own layout instead.
// A disclosure, not an ARIA menu: the avatar button shows and hides a panel of
// ordinary links and buttons that Tab moves through.
// Keyed by the player, so signing out (even when the logout request reports
// an error after the session is gone) or in as someone else starts the menu
// afresh: closed, with no stale sign-out message.
export default function UserMenu({ isInline = false }) {
  const { user } = useAuth()
  return user ? <AccountMenu key={user.id} user={user} isInline={isInline} /> : null
}

function AccountMenu({ user, isInline }) {
  const { signOut } = useAuth()
  const { poolIds } = usePoolMemberships()
  const [open, setOpen] = useState(false)
  // The avatar URL that failed to load, so a refused image falls back to the
  // initial (and a different user's avatar gets its own try).
  const [failedAvatar, setFailedAvatar] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)
  const inFlight = useRef(false) // a second click while one is in flight does nothing
  const triggerRef = useRef(null)
  const panelId = useId()

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

  const avatar = user.user_metadata?.avatar_url
  const showAvatar = avatar && failedAvatar !== avatar
  const name = user.user_metadata?.full_name || user.email

  // Focus moving to something outside (Tab past Sign out, Shift+Tab before the
  // avatar) closes the panel; clicks on the page close it through the backdrop.
  const handleBlur = (e) => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false)
  }

  // A failed sign-out keeps the player signed in (see AuthProvider) and opens
  // the menu (it may have been closed while the request ran) on a message
  // under the button; each failure re-announces it.
  const handleSignOut = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setSigningOut(true)
    setSignOutFailed(false)
    const signedOut = await signOut()
    inFlight.current = false
    setSigningOut(false)
    if (signedOut) {
      setOpen(false)
    } else {
      setOpen(true)
      setSignOutFailed(true)
    }
  }

  // Open, the whole menu (avatar included) keeps Tab, Enter/Space and Escape,
  // and a letter typed in it never pulls focus out to a game's guess. Closed,
  // the avatar is an ordinary button: typing on it reaches the game.
  return (
    <div onBlur={handleBlur} data-no-page-shortcuts={open || undefined} style={isInline ? { position: 'relative', zIndex: 50 } : { position: 'absolute', right: 16, top: 20, zIndex: 50 }}>
      <button ref={triggerRef} type="button" onClick={() => { setOpen(o => !o); setSignOutFailed(false) }}
        aria-expanded={open} aria-controls={open ? panelId : undefined} aria-label="Account menu" style={{
          width: 36, height: 36, borderRadius: '50%', padding: 0,
          background: 'var(--surface)', border: '2px solid var(--border)',
          cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {showAvatar
          ? <img src={avatar} alt="" width={36} height={36} referrerPolicy="no-referrer"
              onError={() => setFailedAvatar(avatar)} style={{ borderRadius: '50%' }} />
          : <span aria-hidden="true" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>
              {name?.[0]?.toUpperCase()}
            </span>
        }
      </button>

      {open && (
        <div id={panelId} style={{
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
            <button type="button" onClick={handleSignOut} style={{
              width: '100%', background: 'none', border: '1px solid rgba(var(--danger-text-rgb),0.25)',
              borderRadius: 6, color: 'var(--danger-text)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, padding: '8px',
              transition: 'background 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(var(--danger-text-rgb),0.07)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
            {signOutFailed && (
              <p role="alert" style={{ margin: '8px 0 0', maxWidth: 200, fontSize: 12, lineHeight: 1.4, color: 'var(--danger-text)' }}>
                Couldn't sign out. Check your connection and try again.
              </p>
            )}
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
