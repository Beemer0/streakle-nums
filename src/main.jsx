import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import Home from './Home.jsx'
import Nums from './Nums.jsx'
import Link from './Link.jsx'
import Words from './Words.jsx'
import Gridiron from './Gridiron.jsx'
import Privacy from './Privacy.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nums" element={<Nums />} />
        <Route path="/link" element={<Link />} />
        <Route path="/words" element={<Words />} />
        <Route path="/gridiron" element={<Gridiron />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
)