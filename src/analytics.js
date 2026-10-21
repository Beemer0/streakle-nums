// Vercel Analytics records the full page URL. Drop the fragment and the OAuth
// callback's query params so nothing from sign-in ever reaches the beacon.
const AUTH_PARAMS = ['code', 'error', 'error_code', 'error_description']

export function scrubUrl(url) {
  const u = new URL(url)
  u.hash = ''
  // Touch the query only when it holds one: deleting re-encodes the rest.
  if (AUTH_PARAMS.some(p => u.searchParams.has(p))) AUTH_PARAMS.forEach(p => u.searchParams.delete(p))
  return u.href
}

// Analytics' beforeSend hook. An unparseable URL drops the event rather than
// risk sending it unscrubbed.
export function scrubAnalyticsEvent(event) {
  try {
    return { ...event, url: scrubUrl(event.url) }
  } catch {
    return null
  }
}
