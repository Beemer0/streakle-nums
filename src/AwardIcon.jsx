// Crisp, custom-drawn award & trophy icons shared by Faceoff, Gridiron, Knockout.
// Each award maps to a hand-drawn SVG that echoes its real-life trophy.

const G = '#C9A84C'   // base gold
const L = '#E3C56B'   // light gold highlight
const D = '#8A6E2E'   // deep gold shadow
const I = '#1C1A16'   // ink detail

const ICONS = {
  // classic two-handled trophy cup — the workhorse for most named trophies
  trophy: (
    <>
      <path d="M14 11C7.5 11 7.5 22 16 23" fill="none" stroke={G} strokeWidth="3.2" strokeLinecap="round"/>
      <path d="M34 11C40.5 11 40.5 22 32 23" fill="none" stroke={G} strokeWidth="3.2" strokeLinecap="round"/>
      <path d="M13 7H35V15C35 25 30 31 24 31C18 31 13 25 13 15Z" fill={G}/>
      <path d="M17 9H21.5V15C21.5 21.5 22.2 25.8 23.4 28C18.7 25.6 17 20.4 17 14.4Z" fill={L}/>
      <rect x="21" y="31" width="6" height="5" fill={G}/>
      <rect x="15.5" y="36" width="17" height="4" rx="1" fill={G}/>
      <rect x="11.5" y="40" width="25" height="5.5" rx="1.6" fill={G}/>
    </>
  ),
  // Stanley Cup — tiered, flaring chalice
  stanleyCup: (
    <>
      <path d="M18 4H30V8C30 13 27 16 24 16C21 16 18 13 18 8Z" fill={G}/>
      <path d="M20.5 5H23V13.6C21 12.6 20.5 9.2 20.5 6.6Z" fill={L}/>
      <rect x="19" y="16.5" width="10" height="4.6" rx="1" fill={G}/>
      <rect x="16" y="22" width="16" height="5" rx="1" fill={G}/>
      <rect x="12.5" y="28" width="23" height="5.6" rx="1.3" fill={G}/>
      <rect x="9.5" y="34.6" width="29" height="8" rx="2" fill={G}/>
      <rect x="12" y="35.6" width="9" height="2.2" rx="1.1" fill={L}/>
      <line x1="12" y1="39.4" x2="36" y2="39.4" stroke={D} strokeWidth="1.6"/>
    </>
  ),
  // Vince Lombardi Trophy — football on a faceted stand
  lombardi: (
    <>
      <ellipse cx="24" cy="10" rx="9.5" ry="5.6" fill={G}/>
      <ellipse cx="20" cy="7.8" rx="3.3" ry="1.7" fill={L}/>
      <line x1="18.5" y1="10" x2="29.5" y2="10" stroke={I} strokeWidth="1.7"/>
      <line x1="21" y1="8" x2="21" y2="12" stroke={I} strokeWidth="1.5"/>
      <line x1="24" y1="7.6" x2="24" y2="12.4" stroke={I} strokeWidth="1.5"/>
      <line x1="27" y1="8" x2="27" y2="12" stroke={I} strokeWidth="1.5"/>
      <path d="M21 15H27L32 39H16Z" fill={G}/>
      <path d="M24 15V39H16Z" fill={L} opacity="0.5"/>
      <rect x="13" y="39" width="22" height="5.6" rx="1.6" fill={G}/>
    </>
  ),
  // Championship belt — round center plate + straps
  belt: (
    <>
      <rect x="1" y="17.5" width="17" height="13" rx="3.5" fill={D}/>
      <rect x="30" y="17.5" width="17" height="13" rx="3.5" fill={D}/>
      <circle cx="7" cy="24" r="1.5" fill={I}/>
      <circle cx="41" cy="24" r="1.5" fill={I}/>
      <circle cx="24" cy="24" r="14" fill={G}/>
      <circle cx="24" cy="24" r="14" fill="none" stroke={L} strokeWidth="2.2"/>
      <circle cx="24" cy="24" r="9" fill={D}/>
      <path d="M24 16.5L25.76 21.57L31.13 21.68L26.85 24.93L28.41 30.07L24 27L19.59 30.07L21.15 24.93L16.87 21.68L22.24 21.57Z" fill={L}/>
    </>
  ),
  // Star — for selections (All-Star, Pro Bowl)
  star: (
    <>
      <path d="M24 4L28.7 17.53L43.02 17.82L31.61 26.47L35.76 40.18L24 32L12.24 40.18L16.39 26.47L4.98 17.82L19.3 17.53Z" fill={G}/>
      <path d="M24 32L12.24 40.18L35.76 40.18Z" fill={D} opacity="0.25"/>
      <path d="M24 4L19.3 17.53L24 14.5Z" fill={L}/>
    </>
  ),
  // Wide leader's bowl — for scoring / statistical titles
  bowl: (
    <>
      <rect x="6.5" y="7" width="35" height="4.5" rx="2.2" fill={L}/>
      <path d="M8 11.5H40C39 22 32 27.5 24 27.5C16 27.5 9 22 8 11.5Z" fill={G}/>
      <path d="M12 13H19.5C19.5 19.5 20.6 24 22.6 26.4C16.4 24.6 12.4 19.2 12 13Z" fill={L}/>
      <rect x="21" y="27.5" width="6" height="6" fill={G}/>
      <rect x="13.5" y="33" width="21" height="4" rx="1" fill={G}/>
      <rect x="10" y="37" width="28" height="6" rx="2" fill={G}/>
    </>
  ),
  // Medal on a ribbon — for rookie honours
  medal: (
    <>
      <path d="M14 4L25 22L19.5 25.5L9 7Z" fill={D}/>
      <path d="M34 4L23 22L28.5 25.5L39 7Z" fill={G}/>
      <circle cx="24" cy="32" r="12" fill={G}/>
      <circle cx="24" cy="32" r="12" fill="none" stroke={L} strokeWidth="2.2"/>
      <circle cx="24" cy="32" r="7.5" fill={D}/>
      <path d="M24 26L25.47 29.98L29.71 30.15L26.38 32.77L27.53 36.85L24 34.5L20.47 36.85L21.62 32.77L18.29 30.15L22.53 29.98Z" fill={L}/>
    </>
  ),
  // Classical hall — for Hall of Fame
  hof: (
    <>
      <path d="M24 4L44 17H4Z" fill={G}/>
      <path d="M24 4L44 17H24Z" fill={D} opacity="0.22"/>
      <rect x="6" y="17" width="36" height="4" fill={G}/>
      <rect x="10.5" y="22" width="4.5" height="16" fill={G}/>
      <rect x="18" y="22" width="4.5" height="16" fill={G}/>
      <rect x="25.5" y="22" width="4.5" height="16" fill={G}/>
      <rect x="33" y="22" width="4.5" height="16" fill={G}/>
      <rect x="11.3" y="23" width="1.5" height="14" fill={L} opacity="0.6"/>
      <rect x="6" y="38" width="36" height="3.5" fill={G}/>
      <rect x="3" y="41.5" width="42" height="4" rx="1" fill={G}/>
    </>
  ),
  // Gloved fist — for KO / TKO wins
  fist: (
    <>
      <path d="M11 17C11 10.5 37 10.5 37 17.5V27C37 33.5 31 36 24 36C17 36 11 33.5 11 27Z" fill={G}/>
      <path d="M11 21C5.5 22 5.5 29.5 12.5 29Z" fill={G}/>
      <ellipse cx="18" cy="18" rx="4.5" ry="2.6" fill={L}/>
      <line x1="19" y1="14" x2="19" y2="23" stroke={D} strokeWidth="1.8"/>
      <line x1="25" y1="14" x2="25" y2="23" stroke={D} strokeWidth="1.8"/>
      <line x1="31" y1="15" x2="31" y2="23" stroke={D} strokeWidth="1.8"/>
      <rect x="14" y="34.5" width="20" height="8" rx="2.5" fill={D}/>
    </>
  ),
  // Open hand — for submission wins (the tap-out)
  hand: (
    <>
      <rect x="13.5" y="7" width="4.6" height="17" rx="2.3" fill={G}/>
      <rect x="19.5" y="3.5" width="4.6" height="20.5" rx="2.3" fill={G}/>
      <rect x="25.5" y="4.5" width="4.6" height="19.5" rx="2.3" fill={G}/>
      <rect x="31.5" y="8.5" width="4.6" height="15.5" rx="2.3" fill={G}/>
      <path d="M12 19H38V29C38 38 31.5 43.5 24 43.5C16.5 43.5 12 38 12 29Z" fill={G}/>
      <path d="M12 23C5 24 5 32 13 32Z" fill={G}/>
      <rect x="16" y="21" width="5" height="10" rx="2.5" fill={L} opacity="0.55"/>
    </>
  ),
}

const ICON_FOR = {
  // NHL — Faceoff
  SC_CHAMP:'stanleyCup', CONN_SMYTHE:'trophy', HART:'trophy', ALL_STAR:'star',
  VEZINA:'trophy', NORRIS:'trophy', ART_ROSS:'bowl', CALDER:'trophy',
  SELKE:'trophy', TED_LINDSAY:'trophy',
  // NFL — Gridiron
  SB_CHAMP:'lombardi', SB_MVP:'trophy', NFL_MVP:'trophy', PRO_BOWL:'star',
  OPOY:'trophy', DPOY:'trophy', RUSH_TITLE:'bowl', PASS_TITLE:'bowl',
  OROY:'medal', DROY:'medal',
  // MMA — Knockout
  CHAMPION:'belt', MULTI_CHAMP:'belt', HOF:'hof', SUB_WIN:'hand',
  KO_WIN:'fist', TITLE_DEF:'belt',
}

export default function AwardIcon({ name, size = 36 }) {
  const icon = ICONS[ICON_FOR[name] || 'trophy']
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      {icon}
    </svg>
  )
}
