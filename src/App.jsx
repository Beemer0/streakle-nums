import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './AuthContext.js'
import Home from './Home.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import LoginPage from './LoginPage.jsx'

// Game routes are code-split — each loads its own chunk on demand.
const Nums     = lazy(() => import('./Nums.jsx'))
const Link     = lazy(() => import('./Link.jsx'))
const Words    = lazy(() => import('./Words.jsx'))
const Gridiron = lazy(() => import('./Gridiron.jsx'))
const Faceoff  = lazy(() => import('./Faceoff.jsx'))
const Knockout = lazy(() => import('./Knockout.jsx'))
const Privacy  = lazy(() => import('./Privacy.jsx'))
const Bracket  = lazy(() => import('./Bracket.jsx'))
const Octagon  = lazy(() => import('./Octagon.jsx'))
const Mines    = lazy(() => import('./Mines.jsx'))
const Weave    = lazy(() => import('./Weave.jsx'))
const Scramble = lazy(() => import('./Scramble.jsx'))

function SignInBanner() {
  const { user } = useAuth()
  if (user) return null

  return (
    <a href="/login" className="sign-in-banner">
      🔥 Sign in
    </a>
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

export default function AppRoutes() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nums" element={<Nums />} />
            <Route path="/mines" element={<Mines />} />
            <Route path="/weave" element={<Weave />} />
            <Route path="/scramble" element={<Scramble />} />
            <Route path="/link" element={<Link />} />
            <Route path="/words" element={<Words />} />
            <Route path="/gridiron" element={<Gridiron />} />
            <Route path="/faceoff" element={<Faceoff />} />
            <Route path="/knockout" element={<Knockout />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/octagon" element={<Octagon />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <SignInBanner />
    </BrowserRouter>
  )
}
