import { Component } from 'react'

// Catches render-time crashes in any route so a single broken page
// can't white-screen the whole app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 24, textAlign: 'center', color: '#F5F0E8',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 44, fontWeight: 800, letterSpacing: 5, color: '#F5F0E8', lineHeight: 1,
        }}>
          STREAKLE
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 13, color: '#7A6E5F', maxWidth: 320, lineHeight: 1.6 }}>
          This page hit an unexpected error. Reloading usually fixes it.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#C9A84C', color: '#0F0E0C', border: 'none',
              borderRadius: 8, padding: '10px 24px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <a
            href="/"
            style={{
              color: '#C9A84C', border: '1px solid #2C2820',
              borderRadius: 8, padding: '10px 24px',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            Home
          </a>
        </div>
      </div>
    )
  }
}
