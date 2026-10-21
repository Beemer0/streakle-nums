// Post-build pass: write a per-route index.html for each public page, with the
// right <title>, meta description, OG/Twitter tags, canonical link and JSON-LD
// baked in. Non-JS scrapers (Slack, iMessage, Discord, LinkedIn, old Facebook
// crawlers) read these directly instead of falling back to the homepage tags.
// Googlebot still works either way — it runs the useSeo effect too.
//
// Not a full SSR pass: the body stays as the SPA shell, so React re-mounts
// cleanly over it. Only the <head> is customised.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAGE_SEO } from '../src/seo.js'

const __filename = fileURLToPath(import.meta.url)
const root = resolve(dirname(__filename), '..')
const dist = join(root, 'dist')
const SITE_URL = 'https://playstreakle.com'

// Public, indexable routes get a static per-route HTML. The private pools
// (/bracket, /octagon, /pools) stay out so a scraper never finds them.
const ROUTES = [
  'home', 'scramble', 'weave', 'mines', 'faceoff', 'gridiron', 'knockout',
  'words', 'link', 'nums', 'privacy', 'login',
]

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function replace(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`[prerender] ${label}: pattern not found in dist/index.html`)
  }
  return html.replace(pattern, replacement)
}

function renderPage(template, seo) {
  const { title, description, path, jsonLd, noindex } = seo
  const url = SITE_URL + path
  let out = template

  out = replace(out, /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`, 'title')
  out = replace(out, /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(description)}" />`, 'description')
  out = replace(out, /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`, 'og:title')
  out = replace(out, /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`, 'og:description')
  out = replace(out, /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${escapeHtml(url)}" />`, 'og:url')
  out = replace(out, /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`, 'twitter:title')
  out = replace(out, /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`, 'twitter:description')

  // Insert canonical, per-route JSON-LD, and robots meta (noindex only) before </head>.
  const extras = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    jsonLd ? `<script type="application/ld+json" id="route-jsonld">${JSON.stringify(jsonLd)}</script>` : '',
    noindex ? `<meta name="robots" content="noindex" />` : '',
  ].filter(Boolean).join('\n    ')

  out = replace(out, /<\/head>/, `    ${extras}\n  </head>`, '</head>')

  return out
}

const template = readFileSync(join(dist, 'index.html'), 'utf8')
let count = 0
let home = null

for (const key of ROUTES) {
  const seo = PAGE_SEO[key]
  if (!seo) {
    throw new Error(`[prerender] no PAGE_SEO entry for "${key}"`)
  }
  const html = renderPage(template, seo)
  if (key === 'home') {
    home = html
    continue
  }
  const routePath = seo.path.replace(/^\//, '')
  const outDir = join(dist, routePath)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html)
  count++
}

// Overwrite dist/index.html with the home version so / shares the shape
// (canonical, WebSite JSON-LD stays, home description stays).
if (home) {
  writeFileSync(join(dist, 'index.html'), home)
  count++
}

console.log(`[prerender] wrote ${count} HTML files`)
