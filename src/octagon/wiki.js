// Assisted grading: parse the Results table of a Wikipedia UFC event page.
// Wikipedia's REST API serves CORS-open HTML, so the admin's browser can fetch
// and parse it directly — no server, no key. The parser only PROPOSES results;
// the admin confirms each fight in the UI. A paste-the-table fallback
// (parsePasted) covers format drift, and manual grading always works.
//
// Row shape (both parsers): { card, weightClass, name1, name2, decided,
// method, methodRaw, round, time } — name1 beat name2 when decided is true;
// otherwise the bout was a draw/no contest (see method).

export function wikiUrl(slug) {
  return `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(slug)}`
}

export async function fetchResults(slug) {
  const res = await fetch(wikiUrl(slug))
  if (!res.ok) throw new Error(`Wikipedia responded ${res.status}`)
  return parseResults(await res.text())
}

// 'TKO (punches)' → 'ko', 'Technical Submission (choke)' → 'sub', … DQ and
// other oddities map to null: the admin decides those by hand.
export function mapMethod(raw) {
  const s = (raw ?? '').trim().toLowerCase()
  if (/^t?ko\b/.test(s)) return 'ko'
  if (/^(technical\s+)?sub/.test(s)) return 'sub'
  if (/^(technical\s+)?dec/.test(s)) return 'dec'
  if (/^draw\b/.test(s)) return 'draw'
  if (/^no contest|^nc\b/.test(s)) return 'nc'
  return null
}

// Ł, ø & friends are standalone letters NFD can't decompose, so map them
// before stripping combining marks — 'Błachowicz' must match 'Blachowicz'.
const CHAR_MAP = {
  'ł': 'l', 'Ł': 'l', 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'Đ': 'd',
  'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe', 'ð': 'd', 'þ': 'th',
}
export function norm(name) {
  return (name ?? '')
    .replace(/[łŁøØđĐßæÆœŒðþ]/g, c => CHAR_MAP[c])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
const lastName = n => n.split(' ').pop()

// '(c)' champion markers and '[a]' footnote remnants off a fighter cell.
function cleanName(s) {
  return s
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\(i?c\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cellText(td) {
  for (const sup of td.querySelectorAll('sup')) sup.remove()
  return td.textContent.replace(/\s+/g, ' ').trim()
}

export function parseResults(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = [...doc.querySelectorAll('table')].find(t => {
    const ths = [...t.querySelectorAll('th')].map(th => th.textContent.trim())
    return ths.includes('Weight class') && ths.includes('Method')
  })
  if (!table) return []

  const rows = []
  let card = null
  for (const tr of table.querySelectorAll('tr')) {
    const ths = tr.querySelectorAll('th')
    const tds = [...tr.querySelectorAll('td')]
    if (ths.length === 1 && tds.length === 0) {  // 'Main card', 'Preliminary card (…)'
      card = ths[0].textContent.trim()
      continue
    }
    if (ths.length > 0 || tds.length < 6) continue
    const sep = cellText(tds[2])
    if (!/^(def|vs)\.?$/i.test(sep)) continue
    const methodRaw = cellText(tds[4])
    const round = parseInt(cellText(tds[5]), 10)
    rows.push({
      card,
      weightClass: cellText(tds[0]),
      name1: cleanName(cellText(tds[1])),
      name2: cleanName(cellText(tds[3])),
      decided: /^def/i.test(sep),
      method: mapMethod(methodRaw),
      methodRaw,
      round: Number.isFinite(round) ? round : null,
      time: tds[6] ? cellText(tds[6]) : null,
    })
  }
  return rows
}

// Fallback: the admin copy-pastes the wiki table (tab-separated cells, one
// bout per line). Same row shape as parseResults.
export function parsePasted(text) {
  const rows = []
  let card = null
  for (const line of (text ?? '').split(/\r?\n/)) {
    const cells = line.split('\t').map(c => c.trim())
    if (cells.length === 1 && /card/i.test(cells[0])) {
      card = cells[0]
      continue
    }
    const sepIdx = cells.findIndex(c => /^(def|vs)\.?$/i.test(c))
    if (sepIdx < 1 || cells.length < sepIdx + 3) continue
    const methodRaw = cells[sepIdx + 2] ?? ''
    const round = parseInt(cells[sepIdx + 3] ?? '', 10)
    rows.push({
      card,
      weightClass: sepIdx >= 2 ? cells[sepIdx - 2] : null,
      name1: cleanName(cells[sepIdx - 1]),
      name2: cleanName(cells[sepIdx + 1]),
      decided: /^def/i.test(cells[sepIdx]),
      method: mapMethod(methodRaw),
      methodRaw,
      round: Number.isFinite(round) ? round : null,
      time: cells[sepIdx + 4] ?? null,
    })
  }
  return rows
}

// Match parsed rows against the admin's entered fights. Exact normalized
// full-name matches win; a both-last-names match is accepted but flagged
// fuzzy so the UI can highlight it. Fights with no matching row are simply
// absent from the result.
export function matchFights(rows, fights) {
  const proposals = []
  for (const f of fights) {
    const na = norm(f.fighter_a)
    const nb = norm(f.fighter_b)
    let best = null
    for (const row of rows) {
      const r1 = norm(row.name1)
      const r2 = norm(row.name2)
      const exact = (r1 === na && r2 === nb) || (r1 === nb && r2 === na)
      const fuzzy = !exact
        && ((lastName(r1) === lastName(na) && lastName(r2) === lastName(nb))
          || (lastName(r1) === lastName(nb) && lastName(r2) === lastName(na)))
      if (exact) { best = { row, fuzzy: false }; break }
      if (fuzzy && !best) best = { row, fuzzy: true }
    }
    if (!best) continue
    const { row, fuzzy } = best
    const r1 = norm(row.name1)
    const name1IsA = r1 === na || lastName(r1) === lastName(na)
    proposals.push({
      fight_id: f.id,
      winner: row.decided
        ? (name1IsA ? 'a' : 'b')
        : (row.method === 'draw' || row.method === 'nc' ? row.method : null),
      method: row.decided && row.method !== 'draw' && row.method !== 'nc'
        ? row.method : null,
      end_round: row.round,
      fuzzy,
      row,
    })
  }
  return proposals
}
