import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './AuthProvider.jsx'
import { scrubAnalyticsEvent } from './analytics.js'
import './fonts.css'
import './index.css'
import AppRoutes from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppRoutes />
      <Analytics beforeSend={scrubAnalyticsEvent} />
    </AuthProvider>
  </StrictMode>,
)