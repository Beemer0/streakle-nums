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
      "Bobby Orr": { t: { add: ['CHI'] } }, // https://en.wikipedia.org/wiki/Bobby_Orr
      "Ray Bourque": { a: { add: ['CALDER'] } }, // https://en.wikipedia.org/wiki/Calder_Memorial_Trophy
      "Dominik Hasek": { t: { remove: ['COL'] } }, // https://en.wikipedia.org/wiki/Dominik_Ha%C5%A1ek
      "Mike Modano": { t: { remove: ['MIN'] } }, // https://en.wikipedia.org/wiki/Mike_Modano
      "Mike Vernon": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Mike_Vernon_(ice_hockey)
      "Chris Osgood": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Chris_Osgood
      "Olaf Kolzig": { t: { add: ['TBL'] } }, // https://en.wikipedia.org/wiki/Olaf_K%C3%B6lzig
      "Kirk McLean": { t: { add: ['NYR'], remove: ['COL'] } }, // https://en.wikipedia.org/wiki/Kirk_McLean
      "Artemi Panarin": { t: { add: ['LAK'] } }, // https://en.wikipedia.org/wiki/Artemi_Panarin
      "Blake Wheeler": { t: { add: ['NYR'] } }, // https://en.wikipedia.org/wiki/Blake_Wheeler
      "Jonathan Marchessault": { t: { add: ['CBJ', 'TBL'] } }, // https://en.wikipedia.org/wiki/Jonathan_Marchessault
      "William Karlsson": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/William_Karlsson
      "Tuukka Rask": { a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/2011_Stanley_Cup_Final
      "Henrik Lundqvist": { t: { remove: ['WSH'] } }, // https://en.wikipedia.org/wiki/Henrik_Lundqvist
      "Frederik Andersen": { t: { remove: ['OTT'] }, a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Frederik_Andersen
      "Sergei Bobrovsky": { t: { add: ['TOR'] } }, // https://api-web.nhle.com/v1/player/8475683/landing
      "Ben Bishop": { t: { add: ['STL'] } }, // https://en.wikipedia.org/wiki/Ben_Bishop
      "Corey Crawford": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Corey_Crawford
      "Robin Lehner": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Robin_Lehner
      "Shea Weber": { a: { remove: ['NORRIS'] } }, // https://en.wikipedia.org/wiki/James_Norris_Memorial_Trophy
      "John Carlson": { t: { add: ['ANA', 'TBL'] } }, // https://en.wikipedia.org/wiki/John_Carlson_(ice_hockey)
      "Jonathan Toews": { t: { add: ['WPG'] } }, // https://en.wikipedia.org/wiki/Jonathan_Toews
      "Brent Seabrook": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Brent_Seabrook
      "Marc-Edouard Vlasic": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Marc-%C3%89douard_Vlasic
      "Brent Burns": { t: { add: ['COL'] } }, // https://en.wikipedia.org/wiki/Brent_Burns
      "Ryan McDonagh": { t: { add: ['NSH'] } }, // https://en.wikipedia.org/wiki/Ryan_McDonagh
      "Marc Methot": { t: { remove: ['VGK'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Marc_Methot
      "Quinn Hughes": { t: { add: ['MIN'] } }, // https://en.wikipedia.org/wiki/Quinn_Hughes
      "Devon Toews": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Devon_Toews
      "Mattias Ekholm": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Mattias_Ekholm
      "Jared Spurgeon": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Jared_Spurgeon
      "Justin Faulk": { t: { add: ['DET'] } }, // https://en.wikipedia.org/wiki/Justin_Faulk
      "Ivan Provorov": { t: { remove: ['BOS'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Ivan_Provorov
      "Darnell Nurse": { t: { add: ['SJS'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Darnell_Nurse
      "Mikhail Sergachev": { t: { add: ['MTL'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Mikhail_Sergachev
      "Noah Hanifin": { a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/2026_Stanley_Cup_Final
      "Jaromir Jagr": { t: { add: ['CGY'] } }, // https://en.wikipedia.org/wiki/Jarom%C3%ADr_J%C3%A1gr
      "Joe Nieuwendyk": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Joe_Nieuwendyk
      "Pat Verbeek": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Pat_Verbeek
      "Brendan Morrison": { t: { add: ['CHI'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Brendan_Morrison
      "Dino Ciccarelli": { t: { add: ['DAL'], remove: ['MIN'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Dino_Ciccarelli (North Stars → DAL franchise)
      "Neal Broten": { t: { remove: ['MIN'] }, a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Neal_Broten
      "Joe Mullen": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Joe_Mullen
      "Geoff Sanderson": { t: { add: ['PHI', 'EDM'], remove: ['STL'] }, a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Geoff_Sanderson
      "Pat Quinn": { t: { add: ['CGY'] } }, // https://en.wikipedia.org/wiki/Pat_Quinn_(ice_hockey) (Atlanta Flames → CGY franchise)
      "Alex Semin": { a: { remove: ['SC_CHAMP', 'ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Alexander_Semin
      "Mike Green": { a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Mike_Green_(ice_hockey)
      "Lars Eller": { t: { add: ['OTT', 'FLA'] } }, // https://en.wikipedia.org/wiki/Lars_Eller
      "Evgeny Kuznetsov": { t: { add: ['CAR'] } }, // https://en.wikipedia.org/wiki/Evgeny_Kuznetsov
      "Jakub Vrana": { t: { add: ['NSH'] } }, // https://en.wikipedia.org/wiki/Jakub_Vr%C3%A1na
      "Andre Burakovsky": { t: { add: ['OTT'] } }, // https://api-web.nhle.com/v1/player/8477444/landing
      "Daniel Carr": { t: { add: ['NSH', 'WSH'], remove: ['STL'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Daniel_Carr_(ice_hockey)
      "Claude Giroux": { a: { remove: ['TED_LINDSAY'] } }, // https://en.wikipedia.org/wiki/Ted_Lindsay_Award
      "Sean Couturier": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/2012_National_Hockey_League_All-Star_Game
      "James van Riemsdyk": { t: { add: ['CBJ', 'DET'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/James_van_Riemsdyk
      "Corey Perry": { t: { add: ['LAK'] } }, // https://api-web.nhle.com/v1/player/8470621/landing
      "Ryan Kesler": { t: { remove: ['PHX'] }, a: { remove: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8470616/landing
      "Ryan Callahan": { t: { remove: ['OTT'] }, a: { remove: ['ALL_STAR'] } }, // https://api-web.nhle.com/v1/player/8471339/landing
      "Bryan Bickell": { t: { remove: ['TBL'] } }, // https://api-web.nhle.com/v1/player/8471254/landing
      "Kris Versteeg": { t: { add: ['TOR', 'PHI', 'CGY'], remove: ['COL'] } }, // https://api-web.nhle.com/v1/player/8471346/landing
      "Marcus Kruger": { t: { add: ['CAR'], remove: ['VGK', 'VAN'] } }, // https://api-web.nhle.com/v1/player/8475323/landing
      "Brandon Saad": { t: { add: ['VGK'] } }, // https://api-web.nhle.com/v1/player/8476438/landing
      "Brad Richards": { t: { add: ['DET'] } }, // https://api-web.nhle.com/v1/player/8467389/landing
      "Vincent Lecavalier": { t: { remove: ['NJD'] } }, // https://api-web.nhle.com/v1/player/8467329/landing
      "Dave Andreychuk": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Dave_Andreychuk
      "Ruslan Fedotenko": { t: { remove: ['PHX'] } }, // https://api-web.nhle.com/v1/player/8468172/landing
      "Nate Thompson": { t: { add: ['LAK', 'WPG'], remove: ['PHX'] }, a: { remove: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8470775/landing
      "Kevin Shattenkirk": { t: { add: ['BOS'] }, a: { add: ['ALL_STAR'] } }, // https://api-web.nhle.com/v1/player/8474031/landing
      "Ondrej Palat": { t: { add: ['NYI'] }, a: { remove: ['ALL_STAR'] } }, // https://api-web.nhle.com/v1/player/8476292/landing
      "Tyler Johnson": { t: { add: ['BOS'], remove: ['ARI'] }, a: { add: ['ALL_STAR'] } }, // https://api-web.nhle.com/v1/player/8474870/landing
      "Steven Stamkos": { t: { add: ['NSH'] } }, // https://api-web.nhle.com/v1/player/8474564/landing
      "Pat Maroon": { t: { add: ['ANA', 'BOS', 'CHI'] } }, // https://api-web.nhle.com/v1/player/8474034/landing
      "Blake Coleman": { t: { add: ['MIN'] } }, // https://api-web.nhle.com/v1/player/8476399/landing
      "Zach Bogosian": { t: { add: ['MIN'] } }, // https://en.wikipedia.org/wiki/Zach_Bogosian
      "Evander Kane": { t: { add: ['VAN'], remove: ['ANA'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Evander_Kane
      "Tomas Hertl": { a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Tom%C3%A1%C5%A1_Hertl
      "Martin Jones": { t: { add: ['SEA', 'TOR'] }, a: { add: ['SC_CHAMP', 'ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Martin_Jones_(ice_hockey)
      "Justin Williams": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Justin_Williams
      "Trevor Lewis": { t: { add: ['CGY'] } }, // https://en.wikipedia.org/wiki/Trevor_Lewis
      "Dwight King": { t: { remove: ['FLA'] } }, // https://en.wikipedia.org/wiki/Dwight_King
      "Colin Fraser": { t: { add: ['STL'], remove: ['PHI', 'CAR'] } }, // https://en.wikipedia.org/wiki/Colin_Fraser_(ice_hockey)
      "Jarret Stoll": { t: { remove: ['BOS'] } }, // https://en.wikipedia.org/wiki/Jarret_Stoll
      "Tanner Pearson": { t: { add: ['MTL', 'VGK', 'WPG', 'BUF'], remove: ['NJD', 'BOS', 'CAR'] } }, // https://en.wikipedia.org/wiki/Tanner_Pearson
      "Tyler Toffoli": { t: { add: ['WPG', 'SJS'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Tyler_Toffoli
      "Scott Parse": { a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/2012_Stanley_Cup_Final
      "Ryan Smyth": { t: { remove: ['MIN'] } }, // https://en.wikipedia.org/wiki/Ryan_Smyth
      "Derick Brassard": { t: { add: ['ARI', 'PHI'], remove: ['STL'] } }, // https://en.wikipedia.org/wiki/Derick_Brassard
      "Mats Zuccarello": { a: { remove: ['ALL_STAR'] }, t: { add: ['LAK'] } }, // https://en.wikipedia.org/wiki/Mats_Zuccarello
      "Chris Kreider": { t: { add: ['MTL'] } }, // https://api-web.nhle.com/v1/player/8475184/landing
      "Brendan Lemieux": { t: { add: ['PHI', 'CAR'] } }, // https://api-web.nhle.com/v1/player/8477962/landing
      "Kaapo Kakko": { t: { add: ['SEA'] } }, // https://api-web.nhle.com/v1/player/8481554/landing
      "Brady Tkachuk": { t: { add: ['FLA'] } }, // https://en.wikipedia.org/wiki/Brady_Tkachuk
      "Tim Stutzle": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/2022_National_Hockey_League_All-Star_Game
      "Josh Norris": { t: { add: ['BUF'] } }, // https://api-web.nhle.com/v1/player/8480064/landing
      "Mike Hoffman": { t: { add: ['SJS'] }, a: { remove: ['ALL_STAR'] } }, // https://api-web.nhle.com/v1/player/8474884/landing
      "Kyle Okposo": { t: { add: ['FLA'] }, a: { add: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8473449/landing
      "Brock Nelson": { t: { add: ['COL'] } }, // https://api-web.nhle.com/v1/player/8475754/landing
      "Anders Lee": { t: { add: ['UTA'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Anders_Lee
      "Josh Bailey": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Josh_Bailey
      "Ryan Pulock": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Ryan_Pulock
      "Andrew Ladd": { t: { remove: ['EDM'] }, a: { remove: ['ALL_STAR'] } }, // https://api-web.nhle.com/v1/player/8471217/landing
      "Ilya Kovalchuk": { t: { add: ['WSH'] } }, // https://api-web.nhle.com/v1/player/8469454/landing
      "Dany Heatley": { a: { add: ['CALDER'] } }, // https://api-web.nhle.com/v1/player/8468482/landing
      "Patrik Berglund": { t: { add: ['BUF'] } }, // https://api-web.nhle.com/v1/player/8473534/landing
      "David Perron": { t: { remove: ['BUF'] } }, // https://api-web.nhle.com/v1/player/8474102/landing
      "Colton Parayko": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Colton_Parayko
      "Jaden Schwartz": { t: { add: ['COL'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Jaden_Schwartz
      "Vince Dunn": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Vince_Dunn
      "Oskar Sundqvist": { t: { add: ['DET', 'MIN'] } }, // https://api-web.nhle.com/v1/player/8476897/landing
      "Sammy Blais": { t: { add: ['TOR', 'MTL'] } }, // https://api-web.nhle.com/v1/player/8478104/landing
      "Mackenzie MacEachern": { t: { add: ['CAR', 'VAN'], remove: ['ARI'] }, a: { remove: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8476907/landing
      "Michael Del Zotto": { t: { add: ['CBJ', 'OTT'] } }, // https://api-web.nhle.com/v1/player/8474584/landing
      "Ville Husso": { t: { add: ['ANA'] }, a: { remove: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8478024/landing
      "Joel Edmundson": { t: { add: ['TOR', 'LAK'] } }, // https://api-web.nhle.com/v1/player/8476441/landing
      "Robert Bortuzzo": { t: { add: ['NYI', 'UTA'], remove: ['COL'] } }, // https://api-web.nhle.com/v1/player/8474145/landing
      "Nico Sturm": { t: { add: ['FLA'], remove: ['ANA'] } }, // https://api-web.nhle.com/v1/player/8481477/landing
      "J.T. Compher": { t: { remove: ['BUF'] } }, // https://api-web.nhle.com/v1/player/8477456/landing
      "Nicolas Aube-Kubel": { t: { add: ['BUF', 'MIN'] } }, // https://api-web.nhle.com/v1/player/8477979/landing
      "Andrew Cogliano": { t: { add: ['SJS'], remove: ['NYR'] } }, // https://api-web.nhle.com/v1/player/8471699/landing
      "Samuel Girard": { t: { add: ['PIT'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Sam_Girard
      "Erik Johnson": { t: { add: ['BUF', 'PHI'] }, a: { add: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8473446/landing
      "Ryan Graves": { t: { add: ['PIT'], remove: ['NYR'] }, a: { remove: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8477435/landing
      "Bowen Byram": { t: { add: ['CHI'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Bowen_Byram
      "Brad Hunt": { t: { add: ['VGK', 'VAN'] }, a: { remove: ['SC_CHAMP'] } }, // https://api-web.nhle.com/v1/player/8476779/landing
      "Milan Lucic": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Milan_Lucic
      "Shawn Thornton": { t: { add: ['ANA'] } }, // https://en.wikipedia.org/wiki/Shawn_Thornton
      "Gregory Campbell": { t: { remove: ['EDM'] } }, // https://en.wikipedia.org/wiki/Gregory_Campbell_(ice_hockey)
      "Chris Kelly": { t: { add: ['ANA'], remove: ['CHI'] } }, // https://en.wikipedia.org/wiki/Chris_Kelly_(ice_hockey)
      "Torey Krug": { a: { remove: ['SC_CHAMP', 'ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Torey_Krug
      "Kevan Miller": { t: { remove: ['ARI'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Kevan_Miller
      "Johnny Boychuk": { t: { add: ['COL'] } }, // https://en.wikipedia.org/wiki/Johnny_Boychuk
      "Dennis Seidenberg": { t: { add: ['PHX', 'CAR'], remove: ['CGY'] } }, // https://en.wikipedia.org/wiki/Dennis_Seidenberg
      "Daniel Paille": { t: { add: ['NYR'] } }, // https://en.wikipedia.org/wiki/Daniel_Paille
      "Jeff Skinner": { t: { add: ['EDM', 'SJS'] } }, // https://en.wikipedia.org/wiki/Jeff_Skinner
      "Sebastian Aho": { a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/2026_Stanley_Cup_Final
      "Andrei Svechnikov": { a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/2026_Stanley_Cup_Final
      "Teuvo Teravainen": { a: { add: ['SC_CHAMP'], remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/2015_Stanley_Cup_Final
      "Jaccob Slavin": { a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/2026_Stanley_Cup_Final
      "Petr Mrazek": { t: { add: ['ANA'] } }, // https://en.wikipedia.org/wiki/Petr_Mr%C3%A1zek
      "Jordan Staal": { a: { add: ['CONN_SMYTHE'] } }, // https://en.wikipedia.org/wiki/Conn_Smythe_Trophy
      "Ron Hainsey": { t: { add: ['CBJ'] } }, // https://en.wikipedia.org/wiki/Ron_Hainsey
      "Lee Stempniak": { t: { add: ['WPG'] } }, // https://en.wikipedia.org/wiki/Lee_Stempniak
      "Nino Niederreiter": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Nino_Niederreiter
      "Antti Raanta": { t: { remove: ['PHX'] } }, // https://en.wikipedia.org/wiki/Antti_Raanta
      "Mikael Granlund": { t: { add: ['ANA'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Mikael_Granlund
      "Jason Zucker": { t: { add: ['NSH', 'BUF'], remove: ['NJD'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Jason_Zucker
      "Matt Dumba": { t: { add: ['TBL', 'DAL', 'PIT'], remove: ['PHX'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Matt_Dumba
      "Viktor Arvidsson": { t: { add: ['EDM', 'BOS', 'DET'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Viktor_Arvidsson
      "Filip Forsberg": { t: { remove: ['WSH'] } }, // https://en.wikipedia.org/wiki/Filip_Forsberg
      "Craig Smith": { t: { add: ['DAL', 'CHI', 'DET'] } }, // https://en.wikipedia.org/wiki/Craig_Smith_(ice_hockey)
      "Calle Jarnkrok": { t: { remove: ['DET'] } }, // https://en.wikipedia.org/wiki/Calle_J%C3%A4rnkrok
      "Sean Monahan": { t: { add: ['WPG', 'CBJ'], remove: ['OTT', 'NJD'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Sean_Monahan
      "Mikael Backlund": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Mikael_Backlund
      "Rasmus Andersson": { t: { add: ['VGK'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Rasmus_Andersson
      "David Rittich": { t: { add: ['WPG', 'NYI'] } }, // https://en.wikipedia.org/wiki/David_Rittich
      "Radko Gudas": { t: { add: ['ANA'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Radko_Gudas
      "Nikolaj Ehlers": { t: { add: ['CAR'] }, a: { add: ['SC_CHAMP'], remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Nikolaj_Ehlers
      "Pierre-Luc Dubois": { t: { add: ['WSH'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Pierre-Luc_Dubois
      "Nate Schmidt": { t: { add: ['UTA'] } }, // https://en.wikipedia.org/wiki/Nate_Schmidt
      "Dmitry Kulikov": { t: { add: ['EDM', 'PIT'] }, a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Dmitry_Kulikov_(ice_hockey)
      "Jack Roslovic": { t: { add: ['CAR', 'EDM', 'TOR'] } }, // https://en.wikipedia.org/wiki/Jack_Roslovic
      "Taylor Hall": { t: { add: ['CAR'] }, a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Taylor_Hall
      "Nico Hischier": { a: { remove: ['CALDER'] } }, // https://en.wikipedia.org/wiki/Calder_Memorial_Trophy
      "Vitek Vanecek": { t: { add: ['FLA', 'UTA'] }, a: { add: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/V%C3%ADtek_Van%C4%9B%C4%8Dek
      "Drew Stafford": { t: { remove: ['MIN'] } }, // https://en.wikipedia.org/wiki/Drew_Stafford
      "Tomas Tatar": { t: { add: ['COL', 'SEA'] }, a: { remove: ['SC_CHAMP', 'ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Tom%C3%A1%C5%A1_Tat%C3%A1r
      "Miles Wood": { t: { add: ['COL', 'CBJ'] } }, // https://en.wikipedia.org/wiki/Miles_Wood
      "Carter Hart": { t: { add: ['VGK'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Carter_Hart
      "Cam Atkinson": { t: { add: ['TBL'] } }, // https://en.wikipedia.org/wiki/Cam_Atkinson
      "Tony DeAngelo": { t: { add: ['NYI'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Tony_DeAngelo
      "Wade Redden": { t: { remove: ['COL'] } }, // https://en.wikipedia.org/wiki/Wade_Redden
      "John Klingberg": { t: { add: ['SJS'] } }, // https://en.wikipedia.org/wiki/John_Klingberg
      "Ilya Mikheyev": { t: { add: ['CHI', 'TBL'] } }, // https://en.wikipedia.org/wiki/Ilya_Mikheyev
      "David Kampf": { t: { add: ['VAN', 'WSH'] } }, // https://en.wikipedia.org/wiki/David_K%C3%A4mpf
      "Connor Brown": { t: { add: ['WSH', 'NJD'] } }, // https://en.wikipedia.org/wiki/Connor_Brown_(ice_hockey)
      "Dion Phaneuf": { a: { remove: ['NORRIS'] } }, // https://en.wikipedia.org/wiki/James_Norris_Memorial_Trophy
      "Leo Komarov": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/2016_National_Hockey_League_All-Star_Game
      "Tyler Bertuzzi": { t: { add: ['CHI'] } }, // https://en.wikipedia.org/wiki/Tyler_Bertuzzi
      "Kasperi Kapanen": { t: { add: ['EDM'] } }, // https://en.wikipedia.org/wiki/Kasperi_Kapanen
      "Nick Foligno": { t: { add: ['MIN'] } }, // https://en.wikipedia.org/wiki/Nick_Foligno
      "Conor Garland": { t: { add: ['CBJ'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Conor_Garland
      "J.T. Miller": { a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/J._T._Miller
      "Tyler Myers": { t: { add: ['DAL'] } }, // https://en.wikipedia.org/wiki/Tyler_Myers
      "Cody Hodgson": { t: { add: ['NSH'] } }, // https://en.wikipedia.org/wiki/Cody_Hodgson
      "Jannik Hansen": { t: { add: ['SJS'] } }, // https://en.wikipedia.org/wiki/Jannik_Hansen
      "Daniel Sprong": { t: { add: ['NJD'], remove: ['EDM'] } }, // https://en.wikipedia.org/wiki/Daniel_Sprong
      "Tyler Graovac": { t: { add: ['VAN'], remove: ['NYR', 'SEA'] } }, // https://en.wikipedia.org/wiki/Tyler_Graovac
      "Philipp Grubauer": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Philipp_Grubauer
      "Oliver Bjorkstrand": { t: { add: ['TBL', 'NYR'] } }, // https://en.wikipedia.org/wiki/Oliver_Bjorkstrand
      "Brandon Tanev": { t: { add: ['UTA'] }, a: { remove: ['SC_CHAMP'] } }, // https://en.wikipedia.org/wiki/Brandon_Tanev
      "Morgan Frost": { t: { add: ['CGY'] } }, // https://en.wikipedia.org/wiki/Morgan_Frost
      "Jakub Lauko": { t: { add: ['MIN'], remove: ['CAR'] } }, // https://en.wikipedia.org/wiki/Jakub_Lauko
      "Gustav Nyquist": { t: { add: ['MIN', 'WPG'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Gustav_Nyquist
      "Filip Zadina": { t: { add: ['SJS'], remove: ['WSH'] } }, // https://en.wikipedia.org/wiki/Filip_Zadina
      "Moritz Seider": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Moritz_Seider
      "Lucas Raymond": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Lucas_Raymond
      "Zack Kassian": { t: { add: ['ARI'] } }, // https://en.wikipedia.org/wiki/Zack_Kassian
      "Jesse Puljujarvi": { t: { add: ['PIT', 'FLA'] } }, // https://en.wikipedia.org/wiki/Jesse_Puljuj%C3%A4rvi
      "Tyson Barrie": { t: { add: ['CGY'] }, a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Tyson_Barrie
      "Kailer Yamamoto": { t: { add: ['SEA', 'UTA'], remove: ['DET'] } }, // https://en.wikipedia.org/wiki/Kailer_Yamamoto
      "Mike Smith": { t: { add: ['TBL'], remove: ['BUF'] } }, // https://en.wikipedia.org/wiki/Mike_Smith_(ice_hockey)
      "Stuart Skinner": { t: { add: ['PIT', 'WPG'] } }, // https://en.wikipedia.org/wiki/Stuart_Skinner
      "Zach Hyman": { a: { remove: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Zach_Hyman
      "Warren Foegele": { t: { add: ['LAK', 'OTT'] } }, // https://en.wikipedia.org/wiki/Warren_Foegele
      "Billy Smith": { t: { add: ['LAK'] } }, // https://en.wikipedia.org/wiki/Billy_Smith_(ice_hockey)
      "John Madden": { t: { add: ['FLA'] } }, // https://en.wikipedia.org/wiki/John_Madden_(ice_hockey)
      "Bobby Clarke": { a: { add: ['SELKE'] } }, // https://en.wikipedia.org/wiki/Frank_J._Selke_Trophy
      "Paul Stastny": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/Paul_Stastny
      "Max Pacioretty": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/2020_National_Hockey_League_All-Star_Game
      "Chandler Stephenson": { a: { add: ['ALL_STAR'] } }, // https://en.wikipedia.org/wiki/2023_National_Hockey_League_All-Star_Game
    },
  },
]
