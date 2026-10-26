import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.js'
import Home from './Home.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { GameLoading } from './GameShell.jsx'

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
const PoolHistory = lazy(() => import('./PoolHistory.jsx'))
const LoginPage = lazy(() => import('./LoginPage.jsx'))
const Mines    = lazy(() => import('./Mines.jsx'))
const Weave    = lazy(() => import('./Weave.jsx'))
const Scramble = lazy(() => import('./Scramble.jsx'))
const NotFound = lazy(() => import('./NotFound.jsx'))

// Home is the one page without a top bar (the games have GameShell's, every
// other page PageShell's, which carries the Sign in link — sign-in itself,
// by design, has none), so only Home gets a floating Sign in link.
function SignInBanner() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (user || pathname !== '/') return null

  return (
    <a href="/login" className="sign-in-banner">
      🔥 Sign in
    </a>
  )
}

// A game route shows its own header while the game's chunk loads.
function GameRoute({ game, children }) {
  return <Suspense fallback={<GameLoading game={game} />}>{children}</Suspense>
}

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <div className="loading-wordmark">STREAKLE</div>
    </div>
  )
}

// Every route below must be served by Vercel as a page: either prerendered
// (PRERENDERED in seo.js) or rewritten to `/` in vercel.json — a private page
// like the pools needs the rewrite. Anything else gets dist/404.html with a
// 404 status (App.routing.test.jsx fails on a route that is neither).
export default function AppRoutes() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nums" element={<GameRoute game="nums"><Nums /></GameRoute>} />
            <Route path="/mines" element={<GameRoute game="mines"><Mines /></GameRoute>} />
            <Route path="/weave" element={<GameRoute game="weave"><Weave /></GameRoute>} />
            <Route path="/scramble" element={<GameRoute game="scramble"><Scramble /></GameRoute>} />
            <Route path="/link" element={<GameRoute game="link"><Link /></GameRoute>} />
            <Route path="/words" element={<GameRoute game="words"><Words /></GameRoute>} />
            <Route path="/gridiron" element={<GameRoute game="gridiron"><Gridiron /></GameRoute>} />
            <Route path="/faceoff" element={<GameRoute game="faceoff"><Faceoff /></GameRoute>} />
            <Route path="/knockout" element={<GameRoute game="knockout"><Knockout /></GameRoute>} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/octagon" element={<Octagon />} />
            <Route path="/pools" element={<PoolHistory />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <SignInBanner />
    </BrowserRouter>
  )
}
