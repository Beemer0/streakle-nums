import { StrictMode, useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { supabase } from './supabase.js'
import './index.css'
import Home from './Home.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { useSeo, PAGE_SEO } from './seo.js'

// Game routes are code-split — each loads its own chunk on demand.
const Nums     = lazy(() => import('./Nums.jsx'))
const Link     = lazy(() => import('./Link.jsx'))
const Words    = lazy(() => import('./Words.jsx'))
const Gridiron = lazy(() => import('./Gridiron.jsx'))
const Faceoff  = lazy(() => import('./Faceoff.jsx'))
const Knockout = lazy(() => import('./Knockout.jsx'))
const Privacy  = lazy(() => import('./Privacy.jsx'))
const Bracket  = lazy(() => import('./Bracket.jsx'))

function SignInBanner() {
  const { user } = useAuth()
  if (user) return null

  return (
    <a href="/login" className="sign-in-banner">
      🔥 Sign in
    </a>
  )
}

function LoginPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  useSeo(PAGE_SEO.login)

  useEffect(() => {
    if (user) window.location.href = '/'
  }, [user])

  if (user) return null

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) console.error(error)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#F5F0E8', padding: 24,
      position: 'relative',
    }}>
      <a href="/" style={{ position: 'absolute', left: 16, top: 24, color: '#C9A84C', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, letterSpacing: 6, color: '#fff', marginBottom: 8 }}>STREAKLE</div>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 48 }}>
        Start your day with a puzzle
      </div>
      <div style={{ background: '#1C1A16', border: '1px solid #2C2820', borderRadius: 16, padding: '40px 32px', maxWidth: 340, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Save your progress</div>
        <div style={{ fontSize: 13, color: '#7A6E5F', marginBottom: 32 }}>Sign in to track your streaks and unlock the archive</div>
        <button onClick={handleGoogleLogin} disabled={loading} style={{
          width: '100%', background: '#fff', border: 'none', borderRadius: 8,
          padding: '12px 24px', fontSize: 15, fontWeight: 600, color: '#0F0E0C',
          cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          opacity: loading ? 0.7 : 1,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H1.87v2.08A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.51 10.53c-.16-.48-.25-.99-.25-1.53s.09-1.05.25-1.53V5.39H1.87A8 8 0 0 0 .98 9c0 1.29.31 2.51.89 3.61l2.64-2.08z"/>
            <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.11 4.39l2.64 2.08c.63-1.89 2.39-3.29 4.47-3.29z"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        <div style={{ marginTop: 24, fontSize: 12, color: '#5A5040' }}>
          By signing in you agree to our{' '}
          <a href="/privacy" style={{ color: '#C9A84C', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 32, fontWeight: 800, letterSpacing: 6,
        color: '#fff', opacity: 0.4,
        animation: 'pulse 1.5s infinite',
      }}>
        STREAKLE
      </div>
    </div>
  )
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nums" element={<Nums />} />
            <Route path="/link" element={<Link />} />
            <Route path="/words" element={<Words />} />
            <Route path="/gridiron" element={<Gridiron />} />
            <Route path="/faceoff" element={<Faceoff />} />
            <Route path="/knockout" element={<Knockout />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <SignInBanner />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppRoutes />
      <Analytics />
    </AuthProvider>
  </StrictMode>,
)