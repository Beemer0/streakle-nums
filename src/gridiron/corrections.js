// Verified corrections to ./data.js (which never changes), as dated batches.
// A batch changes grid generation only from its `from` date, so boards already
// dealt never change: pick a day no time zone has reached when it ships (2+
// days after the push). Answer checking uses every batch, staying lenient on
// boards dealt from older data (see answerEras / answerTimeline in
// ../grid/engine.js). Add a NEW batch for new fixes; never edit a shipped one.
// corrections: { [name]: { [field]: { add: [...], remove: [...] } } } — t teams, a awards.
export const BATCHES = [
  {
    from: '2026-10-25',
    note: 'Full fact-check: every tag of every answer checked by one agent and confirmed by a second, independent one, against the source noted (2026-10-22).',
    corrections: {
      "Joe Montana": { a: { add: ['OPOY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Player_of_the_Year
      "Brett Favre": { a: { add: ['OPOY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Player_of_the_Year
      "John Elway": { a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_passing_yards_leaders
      "Steve Young": { a: { add: ['OPOY'], remove: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Player_of_the_Year
      "Joe Flacco": { t: { remove: ['MIN'] }, a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Joe_Flacco
      "Ben Roethlisberger": { a: { add: ['OROY', 'PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Rookie_of_the_Year
      "Donovan McNabb": { t: { add: ['MIN'] } }, // https://en.wikipedia.org/wiki/Donovan_McNabb
      "Joe Burrow": { a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_passing_yards_leaders
      "Kirk Cousins": { t: { add: ['LV'] } }, // https://en.wikipedia.org/wiki/Kirk_Cousins
      "Matthew Stafford": { a: { add: ['NFL_MVP', 'PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Most_Valuable_Player
      "Andy Dalton": { t: { add: ['NO', 'PHI'], remove: ['NYG', 'BAL'] } }, // https://en.wikipedia.org/wiki/Andy_Dalton
      "Ryan Tannehill": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Ryan_Tannehill
      "Jimmy Garoppolo": { t: { add: ['LAR'] }, a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Jimmy_Garoppolo
      "Nick Foles": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Nick_Foles
      "Derek Carr": { t: { remove: ['ATL'] } }, // https://en.wikipedia.org/wiki/Derek_Carr
      "Kyler Murray": { t: { add: ['MIN'] } }, // https://en.wikipedia.org/wiki/Kyler_Murray
      "Tua Tagovailoa": { t: { add: ['ATL'] }, a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/Tua_Tagovailoa
      "Baker Mayfield": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Baker_Mayfield
      "Deshaun Watson": { a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_passing_yards_leaders
      "Brad Johnson": { t: { remove: ['NYJ', 'ATL'] }, a: { add: ['PRO_BOWL'], remove: ['SB_MVP'] } }, // https://en.wikipedia.org/wiki/Brad_Johnson_(American_football)
      "Trent Dilfer": { a: { add: ['PRO_BOWL'], remove: ['SB_MVP'] } }, // https://en.wikipedia.org/wiki/Trent_Dilfer
      "Mark Brunell": { a: { add: ['SB_CHAMP', 'PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/Mark_Brunell
      "Jeff Garcia": { t: { remove: ['OAK'] } }, // https://en.wikipedia.org/wiki/Jeff_Garcia
      "Ryan Fitzpatrick": { t: { add: ['STL'], remove: ['PHI'] } }, // https://en.wikipedia.org/wiki/Ryan_Fitzpatrick
      "Josh McCown": { t: { remove: ['MIA', 'MIN', 'HOU'] } }, // https://en.wikipedia.org/wiki/Josh_McCown
      "Case Keenum": { t: { add: ['CHI'] } }, // https://en.wikipedia.org/wiki/Case_Keenum
      "Brock Osweiler": { t: { remove: ['CLE'] } }, // https://en.wikipedia.org/wiki/Brock_Osweiler
      "Emmitt Smith": { a: { add: ['OROY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Rookie_of_the_Year
      "Barry Sanders": { a: { add: ['OROY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Rookie_of_the_Year
      "Jerome Bettis": { t: { add: ['LAR'] } }, // https://en.wikipedia.org/wiki/Jerome_Bettis
      "Edgerrin James": { t: { remove: ['JAX'] } }, // https://en.wikipedia.org/wiki/Edgerrin_James
      "Ricky Williams": { t: { remove: ['HOU'] } }, // https://en.wikipedia.org/wiki/Ricky_Williams
      "Priest Holmes": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Priest_Holmes
      "Le'Veon Bell": { t: { add: ['TB'] } }, // https://en.wikipedia.org/wiki/Le%27Veon_Bell
      "Todd Gurley": { a: { remove: ['RUSH_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_rushing_yards_leaders
      "Leonard Fournette": { t: { add: ['BUF'] }, a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Leonard_Fournette
      "Nick Chubb": { t: { add: ['HOU'] } }, // https://en.wikipedia.org/wiki/Nick_Chubb
      "De'Von Achane": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/2026_Pro_Bowl_Games
      "Reggie Bush": { a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Reggie_Bush
      "Corey Dillon": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Corey_Dillon
      "Willis McGahee": { t: { remove: ['MIA'] } }, // https://en.wikipedia.org/wiki/Willis_McGahee
      "Thomas Jones": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Thomas_Jones_(American_football)
      "Clinton Portis": { a: { add: ['OROY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Rookie_of_the_Year
      "Darren McFadden": { t: { remove: ['NE'] } }, // https://en.wikipedia.org/wiki/Darren_McFadden
      "Darren Sproles": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Darren_Sproles
      "David Johnson": { t: { add: ['NO'] } }, // https://en.wikipedia.org/wiki/David_Johnson_(running_back)
      "Devonta Freeman": { t: { add: ['BAL'] } }, // https://en.wikipedia.org/wiki/Devonta_Freeman
      "Latavius Murray": { t: { add: ['BUF'] } }, // https://en.wikipedia.org/wiki/Latavius_Murray
      "LeGarrette Blount": { t: { remove: ['TEN'] } }, // https://en.wikipedia.org/wiki/LeGarrette_Blount
      "Dion Lewis": { t: { add: ['NYG'], remove: ['CLE'] } }, // https://en.wikipedia.org/wiki/Dion_Lewis
      "Phillip Lindsay": { t: { add: ['MIA'] } }, // https://en.wikipedia.org/wiki/Phillip_Lindsay
      "Kenyan Drake": { t: { add: ['GB'] } }, // https://en.wikipedia.org/wiki/Kenyan_Drake
      "David Montgomery": { t: { add: ['HOU'] } }, // https://en.wikipedia.org/wiki/David_Montgomery_(American_football)
      "Miles Sanders": { t: { add: ['DAL'] } }, // https://en.wikipedia.org/wiki/Miles_Sanders
      "Andre Johnson": { t: { remove: ['CLE', 'DET'] } }, // https://en.wikipedia.org/wiki/Andre_Johnson
      "Marvin Harrison": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Marvin_Harrison
      "Isaac Bruce": { t: { add: ['LAR'] } }, // https://en.wikipedia.org/wiki/Isaac_Bruce
      "Wes Welker": { t: { add: ['SD'] } }, // https://en.wikipedia.org/wiki/Wes_Welker
      "Antonio Brown": { t: { remove: ['OAK'] } }, // https://en.wikipedia.org/wiki/Antonio_Brown
      "Odell Beckham Jr.": { t: { add: ['MIA'] } }, // https://en.wikipedia.org/wiki/Odell_Beckham_Jr
      "Dez Bryant": { t: { add: ['BAL'], remove: ['NO', 'CLE'] } }, // https://en.wikipedia.org/wiki/Dez_Bryant
      "Stefon Diggs": { t: { add: ['WAS'] } }, // https://en.wikipedia.org/wiki/Stefon_Diggs
      "Cooper Kupp": { a: { add: ['SB_MVP'] } }, // https://en.wikipedia.org/wiki/Cooper_Kupp
      "Ja'Marr Chase": { a: { remove: ['OPOY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Player_of_the_Year
      "Mike Evans": { t: { add: ['SF'] } }, // https://en.wikipedia.org/wiki/Mike_Evans_(wide_receiver)
      "Amari Cooper": { t: { remove: ['NO'] } }, // https://en.wikipedia.org/wiki/Amari_Cooper
      "Keenan Allen": { t: { add: ['IND'] } }, // https://en.wikipedia.org/wiki/Keenan_Allen
      "Adam Thielen": { t: { add: ['PIT'] } }, // https://en.wikipedia.org/wiki/Adam_Thielen
      "Tyler Lockett": { t: { add: ['LV'] } }, // https://en.wikipedia.org/wiki/Tyler_Lockett
      "Brandin Cooks": { t: { add: ['BUF', 'SF'] }, a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Brandin_Cooks
      "T.Y. Hilton": { t: { add: ['DAL'] } }, // https://en.wikipedia.org/wiki/T._Y._Hilton
      "Demaryius Thomas": { t: { remove: ['NE'] } }, // https://en.wikipedia.org/wiki/Demaryius_Thomas
      "Julian Edelman": { a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Julian_Edelman
      "Anquan Boldin": { t: { remove: ['BUF', 'NO'] } }, // https://en.wikipedia.org/wiki/Anquan_Boldin
      "Mike Wallace": { t: { remove: ['BUF'] } }, // https://en.wikipedia.org/wiki/Mike_Wallace_(American_football)
      "Golden Tate": { t: { remove: ['SF'] }, a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Golden_Tate
      "Plaxico Burress": { a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Plaxico_Burress
      "Keyshawn Johnson": { t: { remove: ['ATL'] } }, // https://en.wikipedia.org/wiki/Keyshawn_Johnson
      "Deion Branch": { a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Deion_Branch
      "Diontae Johnson": { t: { add: ['HOU'] } }, // https://en.wikipedia.org/wiki/Diontae_Johnson
      "Jason Witten": { t: { remove: ['MIA'] } }, // https://en.wikipedia.org/wiki/Jason_Witten
      "Zach Ertz": { t: { add: ['WAS'] } }, // https://en.wikipedia.org/wiki/Zach_Ertz
      "Dallas Clark": { t: { add: ['BAL'] } }, // https://en.wikipedia.org/wiki/Dallas_Clark
      "Jeremy Shockey": { t: { remove: ['MIA'] } }, // https://en.wikipedia.org/wiki/Jeremy_Shockey
      "Tyler Eifert": { t: { remove: ['NO'] } }, // https://en.wikipedia.org/wiki/Tyler_Eifert
      "Jordan Reed": { t: { add: ['SF'] } }, // https://en.wikipedia.org/wiki/Jordan_Reed
      "David Njoku": { t: { add: ['LAC'] } }, // https://en.wikipedia.org/wiki/David_Njoku
      "Hunter Henry": { a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Hunter_Henry
      "Darren Waller": { t: { add: ['CAR'] } }, // https://en.wikipedia.org/wiki/Darren_Waller
      "Tyron Smith": { t: { add: ['NYJ'] } }, // https://en.wikipedia.org/wiki/Tyron_Smith
      "Laremy Tunsil": { t: { add: ['WAS'] } }, // https://en.wikipedia.org/wiki/Laremy_Tunsil
      "Von Miller": { t: { add: ['WAS', 'DAL'] } }, // https://en.wikipedia.org/wiki/Von_Miller
      "Myles Garrett": { t: { add: ['LAR'] } }, // https://en.wikipedia.org/wiki/Myles_Garrett
      "Dwight Freeney": { t: { add: ['DET'] } }, // https://en.wikipedia.org/wiki/Dwight_Freeney
      "Gerald McCoy": { t: { add: ['LV'], remove: ['BAL'] } }, // https://en.wikipedia.org/wiki/Gerald_McCoy
      "Michael Bennett": { t: { add: ['TB'] } }, // https://en.wikipedia.org/wiki/Michael_Bennett_(defensive_lineman)
      "Carlos Dunlap": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Carlos_Dunlap
      "Frank Clark": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Frank_Clark_(American_football)
      "Leonard Williams": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Leonard_Williams
      "Rashan Gary": { a: { add: ['PRO_BOWL'] }, t: { add: ['DAL'] } }, // https://en.wikipedia.org/wiki/2025_Pro_Bowl_Games
      "Lawrence Taylor": { a: { add: ['DROY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Defensive_Rookie_of_the_Year
      "Darius Leonard": { t: { add: ['PHI'] } }, // https://en.wikipedia.org/wiki/Shaquille_Leonard
      "Elvis Dumervil": { t: { remove: ['NO'] } }, // https://en.wikipedia.org/wiki/Elvis_Dumervil
      "Zach Thomas": { t: { remove: ['KC'] } }, // https://en.wikipedia.org/wiki/Zach_Thomas
      "Jordan Hicks": { t: { add: ['CLE'] }, a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Jordan_Hicks_(American_football)
      "Darrelle Revis": { t: { remove: ['PIT'] } }, // https://en.wikipedia.org/wiki/Darrelle_Revis
      "Richard Sherman": { t: { add: ['TB'] } }, // https://en.wikipedia.org/wiki/Richard_Sherman_(American_football)
      "Jalen Ramsey": { t: { add: ['PIT'] }, a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Jalen_Ramsey
      "Stephon Gilmore": { t: { add: ['MIN'] } }, // https://en.wikipedia.org/wiki/Stephon_Gilmore
      "Minkah Fitzpatrick": { t: { add: ['NYJ'] } }, // https://en.wikipedia.org/wiki/Minkah_Fitzpatrick
      "Tyrann Mathieu": { t: { remove: ['NE'] } }, // https://en.wikipedia.org/wiki/Tyrann_Mathieu
      "Marshon Lattimore": { t: { add: ['WAS'] } }, // https://en.wikipedia.org/wiki/Marshon_Lattimore
      "Sauce Gardner": { t: { add: ['IND'] } }, // https://en.wikipedia.org/wiki/Sauce_Gardner
      "Trevon Diggs": { t: { add: ['GB', 'SEA'] } }, // https://en.wikipedia.org/wiki/Trevon_Diggs
      "Darius Slay": { t: { add: ['PIT'] }, a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Darius_Slay
      "Aqib Talib": { t: { remove: ['MIA'] } }, // https://en.wikipedia.org/wiki/Aqib_Talib
      "Malcolm Butler": { a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Malcolm_Butler
      "Eric Berry": { t: { remove: ['TEN'] } }, // https://en.wikipedia.org/wiki/Eric_Berry
      "Xavien Howard": { t: { add: ['IND'] } }, // https://en.wikipedia.org/wiki/Xavien_Howard
      "Kevin Byard": { t: { add: ['CHI', 'NE'] } }, // https://en.wikipedia.org/wiki/Kevin_Byard
      "Jordan Poyer": { t: { add: ['PHI'] } }, // https://en.wikipedia.org/wiki/Jordan_Poyer
      "Devon Witherspoon": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Super_Bowl_LX
      "Devin Hester": { t: { remove: ['NO'] } }, // https://en.wikipedia.org/wiki/Devin_Hester
      "David Patten": { t: { add: ['CLE'] } }, // https://en.wikipedia.org/wiki/David_Patten
      "Matt Cassel": { t: { add: ['DET'], remove: ['CHI'] }, a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Matt_Cassel
      "Donte Stallworth": { t: { remove: ['MIA'] }, a: { remove: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Donte_Stallworth
      "Stevan Ridley": { t: { add: ['ATL', 'PIT'], remove: ['STL'] } }, // https://en.wikipedia.org/wiki/Stevan_Ridley
      "Chris Hogan": { t: { add: ['NO'] } }, // https://en.wikipedia.org/wiki/Chris_Hogan_(American_football)
      "Martellus Bennett": { t: { remove: ['BAL'] }, a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Martellus_Bennett
      "Duron Harmon": { t: { add: ['LV', 'CHI', 'CLE'] } }, // https://en.wikipedia.org/wiki/Duron_Harmon
      "Jerod Mayo": { a: { add: ['DROY'] } }, // https://en.wikipedia.org/wiki/Jerod_Mayo
      "Dan Koppen": { t: { remove: ['CAR'] }, a: { add: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Dan_Koppen
      "Harrison Butker": { a: { remove: ['PRO_BOWL'] } }, // https://en.wikipedia.org/wiki/Harrison_Butker
      "Matt Prater": { t: { add: ['ATL', 'BUF'], remove: ['LAC'] } }, // https://en.wikipedia.org/wiki/Matt_Prater
      "Greg Zuerlein": { t: { add: ['NYJ'], remove: ['NYG'] } }, // https://en.wikipedia.org/wiki/Greg_Zuerlein
      "Younghoe Koo": { t: { add: ['NYG'] } }, // https://en.wikipedia.org/wiki/Younghoe_Koo
      "Marcus Allen": { a: { add: ['OPOY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Player_of_the_Year
      "Thurman Thomas": { a: { add: ['OPOY'] } }, // https://en.wikipedia.org/wiki/AP_NFL_Offensive_Player_of_the_Year
      "Ken Anderson": { a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_passing_yards_leaders
      "Daunte Culpepper": { a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_passing_yards_leaders
      "Santonio Holmes": { t: { add: ['CHI'] } }, // https://en.wikipedia.org/wiki/Santonio_Holmes
      "Matt Schaub": { a: { add: ['PASS_TITLE'] } }, // https://en.wikipedia.org/wiki/List_of_NFL_annual_passing_yards_leaders
      "Blaine Gabbert": { t: { add: ['KC'] } }, // https://en.wikipedia.org/wiki/Blaine_Gabbert
      "Marquez Valdes-Scantling": { t: { add: ['SF', 'PIT', 'LAC'] } }, // https://en.wikipedia.org/wiki/Marquez_Valdes-Scantling
      "Mecole Hardman": { t: { add: ['BUF'] } }, // https://en.wikipedia.org/wiki/Mecole_Hardman
      "Sam Darnold": { a: { add: ['SB_CHAMP'] } }, // https://en.wikipedia.org/wiki/Super_Bowl_LX
      "A.J. Brown": { t: { add: ['NE'] } }, // https://en.wikipedia.org/wiki/A._J._Brown
    },
  },
]
