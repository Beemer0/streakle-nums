import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import './index.css'
import Home from './Home.jsx'
import Nums from './Nums.jsx'
import Link from './Link.jsx'
import Words from './Words.jsx'
import Gridiron from './Gridiron.jsx'
import Faceoff from './Faceoff.jsx'
import Privacy from './Privacy.jsx'
import Auth from './Auth.jsx'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaaaff', fontFamily: 'Segoe UI', fontSize: 18 }}>
      Loading...
    </div>
  )

  if (!user) return <Auth />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nums" element={<Nums />} />
        <Route path="/link" element={<Link />} />
        <Route path="/words" element={<Words />} />
        <Route path="/gridiron" element={<Gridiron />} />
        <Route path="/faceoff" element={<Faceoff />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
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