import { useSeo, PAGE_SEO } from './seo'
import { GAMES } from './games'
import PageShell from './PageShell'

const linkStyle = {
  display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 14px',
  border: '1px solid var(--border-strong)', borderRadius: 8,
  color: 'var(--gold)', fontSize: 13, fontWeight: 700, letterSpacing: 1,
  fontFamily: 'var(--font-display)', textDecoration: 'none',
}

// Any URL no route matches. Vercel serves it with a 404 status (dist/404.html);
// a mistyped game name most likely meant one of the games, so they're all here.
export default function NotFound() {
  useSeo(PAGE_SEO.notFound)
  return (
    <PageShell title="PAGE NOT FOUND">
      <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, margin: '8px 0 24px' }}>
        There's no page here. The link may be mistyped or out of date.
      </p>
      <a href="/" style={{ ...linkStyle, background: 'var(--gold)', borderColor: 'var(--gold)', color: 'var(--bg)' }}>
        All of today's puzzles →
      </a>
      <nav aria-label="Games" style={{ marginTop: 28 }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GAMES.map(g => (
            <li key={g.key}><a href={g.path} style={linkStyle}>{g.title}</a></li>
          ))}
        </ul>
      </nav>
    </PageShell>
  )
}
