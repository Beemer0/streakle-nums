import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import Home from './Home.jsx'
import Nums from './Nums.jsx'
import Grid from './Grid.jsx'
import Words from './Words.jsx'
import Privacy from './Privacy.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nums" element={<Nums />} />
        <Route path="/grid" element={<Grid />} />
        <Route path="/words" element={<Words />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
)