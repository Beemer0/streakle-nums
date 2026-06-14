// FIFA three-letter team codes (what football-data.org returns) → ISO 3166
// codes that flagcdn.com serves. Windows doesn't render flag emojis, so we
// use flag images instead. Unmapped codes simply render without a flag.
const FLAG_ISO = {
  // Hosts
  USA: 'us', MEX: 'mx', CAN: 'ca',
  // CONMEBOL (URY is the ISO-3 code football-data.org returns for Uruguay)
  ARG: 'ar', BRA: 'br', URU: 'uy', URY: 'uy', COL: 'co', ECU: 'ec',
  PAR: 'py', PER: 'pe', CHI: 'cl', BOL: 'bo', VEN: 've',
  // UEFA
  ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls', NIR: 'gb-nir',
  FRA: 'fr', GER: 'de', ESP: 'es', POR: 'pt', ITA: 'it', NED: 'nl',
  BEL: 'be', CRO: 'hr', SUI: 'ch', DEN: 'dk', AUT: 'at', TUR: 'tr',
  POL: 'pl', UKR: 'ua', SRB: 'rs', SWE: 'se', NOR: 'no', CZE: 'cz',
  SVK: 'sk', SVN: 'si', HUN: 'hu', ROU: 'ro', GRE: 'gr', ALB: 'al',
  MKD: 'mk', BIH: 'ba', MNE: 'me', ISL: 'is', IRL: 'ie', FIN: 'fi',
  GEO: 'ge', KOS: 'xk', ARM: 'am', AZE: 'az', ISR: 'il', BUL: 'bg',
  LUX: 'lu', CYP: 'cy', EST: 'ee', LVA: 'lv', LTU: 'lt', KAZ: 'kz',
  BLR: 'by', MDA: 'md', MLT: 'mt', FRO: 'fo', GIB: 'gi', AND: 'ad',
  SMR: 'sm', LIE: 'li', RUS: 'ru',
  // CONCACAF
  CRC: 'cr', JAM: 'jm', PAN: 'pa', HON: 'hn', SLV: 'sv', GUA: 'gt',
  TRI: 'tt', CUW: 'cw', HAI: 'ht', CUB: 'cu', NCA: 'ni', BER: 'bm',
  SUR: 'sr', GUY: 'gy', PUR: 'pr',
  // AFC
  JPN: 'jp', KOR: 'kr', AUS: 'au', IRN: 'ir', KSA: 'sa', QAT: 'qa',
  UAE: 'ae', IRQ: 'iq', JOR: 'jo', UZB: 'uz', OMA: 'om', BHR: 'bh',
  KUW: 'kw', SYR: 'sy', LBN: 'lb', PLE: 'ps', KGZ: 'kg', TJK: 'tj',
  TKM: 'tm', IND: 'in', THA: 'th', VIE: 'vn', CHN: 'cn', IDN: 'id',
  MAS: 'my', PRK: 'kp',
  // CAF
  MAR: 'ma', SEN: 'sn', TUN: 'tn', ALG: 'dz', EGY: 'eg', NGA: 'ng',
  GHA: 'gh', CMR: 'cm', CIV: 'ci', MLI: 'ml', BFA: 'bf', RSA: 'za',
  COD: 'cd', GAB: 'ga', GUI: 'gn', ZAM: 'zm', UGA: 'ug', BEN: 'bj',
  CPV: 'cv', TAN: 'tz', KEN: 'ke', MOZ: 'mz', ANG: 'ao', MAD: 'mg',
  GAM: 'gm', EQG: 'gq', LBY: 'ly', TOG: 'tg', ZIM: 'zw', NAM: 'na',
  RWA: 'rw', COM: 'km', MTN: 'mr', ETH: 'et', SDN: 'sd',
  // OFC
  NZL: 'nz', FIJ: 'fj', NCL: 'nc', SOL: 'sb', TAH: 'pf', VAN: 'vu',
  PNG: 'pg',
}

// w40 is plenty for ~20px-wide rendering on retina screens.
export function flagUrl(teamCode) {
  const iso = FLAG_ISO[teamCode]
  return iso ? `https://flagcdn.com/w40/${iso}.png` : null
}
