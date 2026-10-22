// Verified corrections to ./data.js (which never changes), as dated batches.
// A batch changes grid generation only from its `from` date, so boards already
// dealt never change: pick a day no time zone has reached when it ships (2+
// days after the push). Answer checking uses every batch, staying lenient on
// boards dealt from older data (see answerEras / answerTimeline in
// ../grid/engine.js). Add a NEW batch for new fixes; never edit a shipped one.
// corrections: { [name]: { [field]: { add: [...], remove: [...] } } } — p promotions, w weight classes, a achievements.
export const BATCHES = [
  {
    from: '2026-10-25',
    note: 'Full fact-check: every tag of every answer checked by one agent and confirmed by a second, independent one, against the source noted (2026-10-22).',
    corrections: {
      "Jon Jones": { a: { add: ['SUB_WIN', 'MULTI_CHAMP'] } }, // https://en.wikipedia.org/wiki/Jon_Jones
      "Fedor Emelianenko": { a: { add: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Fedor_Emelianenko
      "Cain Velasquez": { p: { add: ['STRIKEFORCE'] } }, // https://en.wikipedia.org/wiki/Cain_Velasquez
      "Junior dos Santos": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Junior_dos_Santos
      "Francis Ngannou": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Francis_Ngannou
      "Alistair Overeem": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Alistair_Overeem
      "Mirko Cro Cop": { p: { add: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Mirko_Filipovi%C4%87
      "Ryan Bader": { a: { add: ['SUB_WIN', 'TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Ryan_Bader
      "Derrick Lewis": { p: { add: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Derrick_Lewis_(fighter)
      "Randy Couture": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Randy_Couture
      "Bas Rutten": { a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/UFC_Hall_of_Fame
      "Cheick Kongo": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Cheick_Kongo
      "Vitor Belfort": { p: { add: ['STRIKEFORCE'] }, a: { add: ['SUB_WIN', 'HOF'] } }, // https://en.wikipedia.org/wiki/Vitor_Belfort
      "Chuck Liddell": { p: { add: ['PRIDE'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Chuck_Liddell
      "Tito Ortiz": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Tito_Ortiz
      "Wanderlei Silva": { w: { add: ['HW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Wanderlei_Silva
      "Quinton Jackson": { p: { add: ['BELLATOR'] }, w: { add: ['HW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Rampage_Jackson
      "Shogun Rua": { a: { add: ['SUB_WIN', 'HOF'] }, w: { add: ['HW'] } }, // https://en.wikipedia.org/wiki/Maur%C3%ADcio_Rua
      "Lyoto Machida": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Lyoto_Machida
      "Forrest Griffin": { a: { add: ['KO_WIN', 'SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Forrest_Griffin
      "Rashad Evans": { w: { add: ['HW', 'MW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Rashad_Evans
      "Glover Teixeira": { p: { add: ['WEC'] } }, // https://en.wikipedia.org/wiki/Glover_Teixeira
      "Jan Blachowicz": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Jan_B%C5%82achowicz
      "Dan Henderson": { p: { remove: ['BELLATOR'] }, w: { add: ['HW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Dan_Henderson
      "Gegard Mousasi": { p: { add: ['PRIDE'] } }, // https://en.wikipedia.org/wiki/Gegard_Mousasi
      "Brian Stann": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Brian_Stann
      "Alex Pereira": { w: { add: ['HW'] } }, // https://en.wikipedia.org/wiki/Alex_Pereira
      "Ken Shamrock": { p: { add: ['BELLATOR'] }, a: { add: ['SUB_WIN', 'KO_WIN'] } }, // https://en.wikipedia.org/wiki/Ken_Shamrock
      "Georges St-Pierre": { a: { add: ['KO_WIN', 'SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Georges_St-Pierre
      "Michael Bisping": { w: { add: ['LHW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Michael_Bisping
      "Chris Weidman": { w: { add: ['LHW'] }, a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/Chris_Weidman
      "Luke Rockhold": { w: { add: ['LHW'] } }, // https://en.wikipedia.org/wiki/Luke_Rockhold
      "Robert Whittaker": { w: { add: ['LHW'] } }, // https://en.wikipedia.org/wiki/Robert_Whittaker_(fighter)
      "Israel Adesanya": { a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/UFC_Hall_of_Fame
      "Sean Strickland": { w: { add: ['LHW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Sean_Strickland
      "Nate Marquardt": { p: { remove: ['PRIDE'] }, a: { add: ['CHAMPION'] } }, // https://en.wikipedia.org/wiki/Nate_Marquardt
      "Rich Franklin": { p: { remove: ['ONE'] }, w: { add: ['LHW'] }, a: { add: ['SUB_WIN', 'HOF'] } }, // https://en.wikipedia.org/wiki/Rich_Franklin
      "Demian Maia": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Demian_Maia
      "Paulo Costa": { w: { add: ['LHW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Paulo_Costa
      "Jacare Souza": { p: { remove: ['BELLATOR'] }, w: { add: ['LHW'] } }, // https://en.wikipedia.org/wiki/Ronaldo_Souza
      "Yoel Romero": { p: { add: ['STRIKEFORCE'] }, w: { add: ['LHW'] }, a: { remove: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Yoel_Romero
      "Frank Shamrock": { p: { add: ['WEC'] }, w: { add: ['LHW'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Frank_Shamrock
      "Matt Hughes": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Matt_Hughes_(fighter)
      "Robbie Lawler": { p: { add: ['PRIDE'], remove: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Robbie_Lawler
      "Tyron Woodley": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Tyron_Woodley
      "Kamaru Usman": { w: { add: ['MW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Kamaru_Usman
      "Leon Edwards": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Leon_Edwards
      "Colby Covington": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Colby_Covington
      "Jorge Masvidal": { p: { add: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Jorge_Masvidal
      "Nick Diaz": { p: { add: ['WEC'] }, w: { add: ['MW'] }, a: { add: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Nick_Diaz
      "Carlos Condit": { a: { add: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/List_of_WEC_champions
      "Matt Serra": { w: { add: ['LW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Matt_Serra
      "Johny Hendricks": { p: { add: ['WEC'] }, w: { add: ['MW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Johny_Hendricks
      "Stephen Thompson": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Stephen_Thompson_(fighter)
      "Belal Muhammad": { p: { add: ['BELLATOR'] }, a: { add: ['KO_WIN', 'SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Belal_Muhammad
      "Douglas Lima": { w: { add: ['MW'] }, a: { remove: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Douglas_Lima
      "Ben Askren": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Ben_Askren
      "Donald Cerrone": { a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/UFC_Hall_of_Fame
      "Royce Gracie": { p: { add: ['PRIDE', 'BELLATOR'] }, w: { add: ['LHW'], remove: ['WW', 'LW'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Royce_Gracie
      "Khabib Nurmagomedov": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Khabib_Nurmagomedov
      "Conor McGregor": { w: { add: ['WW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Conor_McGregor
      "BJ Penn": { w: { add: ['FW'] }, a: { add: ['KO_WIN', 'TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/B.J._Penn
      "Islam Makhachev": { w: { add: ['WW'] }, a: { add: ['MULTI_CHAMP', 'KO_WIN'] } }, // https://en.wikipedia.org/wiki/UFC_322
      "Eddie Alvarez": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Eddie_Alvarez
      "Michael Chandler": { p: { add: ['STRIKEFORCE'] }, w: { add: ['WW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Michael_Chandler
      "Dustin Poirier": { p: { add: ['WEC'] } }, // https://en.wikipedia.org/wiki/Dustin_Poirier
      "Tony Ferguson": { w: { add: ['WW'] } }, // https://en.wikipedia.org/wiki/Tony_Ferguson
      "Justin Gaethje": { a: { add: ['CHAMPION', 'SUB_WIN'] } }, // https://en.wikipedia.org/wiki/UFC_Freedom_250
      "Nate Diaz": { p: { add: ['STRIKEFORCE'] } }, // https://en.wikipedia.org/wiki/Strikeforce:_Shamrock_vs._Gracie
      "Frankie Edgar": { a: { add: ['KO_WIN', 'SUB_WIN', 'HOF'] } }, // https://en.wikipedia.org/wiki/Frankie_Edgar
      "Benson Henderson": { w: { add: ['WW'], remove: ['FW'] } }, // https://en.wikipedia.org/wiki/Benson_Henderson
      "Gilbert Melendez": { p: { add: ['PRIDE', 'WEC'] }, w: { add: ['FW'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Gilbert_Melendez
      "Patricio Pitbull": { p: { add: ['UFC'] }, w: { add: ['BW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Patr%C3%ADcio_Pitbull
      "Jim Miller": { w: { add: ['WW'] } }, // https://en.wikipedia.org/wiki/Jim_Miller_(fighter)
      "Jose Aldo": { w: { add: ['BW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Jos%C3%A9_Aldo
      "Max Holloway": { w: { add: ['WW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Max_Holloway
      "Alex Volkanovski": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Alexander_Volkanovski
      "Ilia Topuria": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Ilia_Topuria
      "Brian Ortega": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Brian_Ortega
      "Calvin Kattar": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Calvin_Kattar
      "Cub Swanson": { w: { add: ['BW'] }, a: { add: ['SUB_WIN', 'HOF'] } }, // https://en.wikipedia.org/wiki/Cub_Swanson
      "Dominick Cruz": { w: { add: ['FW'] }, a: { add: ['KO_WIN', 'SUB_WIN', 'HOF'] } }, // https://en.wikipedia.org/wiki/Dominick_Cruz
      "TJ Dillashaw": { w: { add: ['FLY'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/T.J._Dillashaw
      "Aljamain Sterling": { w: { add: ['FW'] } }, // https://en.wikipedia.org/wiki/Aljamain_Sterling
      "Sean O'Malley": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Sean_O%27Malley_(fighter)
      "Cody Garbrandt": { w: { add: ['FLY'] } }, // https://en.wikipedia.org/wiki/Cody_Garbrandt
      "Henry Cejudo": { a: { remove: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Henry_Cejudo
      "Merab Dvalishvili": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Merab_Dvalishvili
      "Bibiano Fernandes": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Bibiano_Fernandes
      "Demetrious Johnson": { a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/Demetrious_Johnson
      "Brandon Moreno": { a: { remove: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Brandon_Moreno
      "Deiveson Figueiredo": { a: { remove: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Deiveson_Figueiredo
      "Adriano Moraes": { w: { add: ['BW'] } }, // https://en.wikipedia.org/wiki/Adriano_Moraes_(fighter)
      "Ronda Rousey": { a: { add: ['KO_WIN'] }, w: { add: ['WFW'] } }, // https://en.wikipedia.org/wiki/Ronda_Rousey
      "Amanda Nunes": { p: { add: ['STRIKEFORCE'] }, a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/Amanda_Nunes
      "Holly Holm": { p: { add: ['BELLATOR'] } }, // https://en.wikipedia.org/wiki/Holly_Holm
      "Miesha Tate": { w: { add: ['WFly'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Miesha_Tate
      "Raquel Pennington": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Raquel_Pennington
      "Cris Cyborg": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Cris_Cyborg
      "Megan Anderson": { p: { remove: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Megan_Anderson_(fighter)
      "Alexa Grasso": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Alexa_Grasso
      "Rose Namajunas": { w: { add: ['WFly'] } }, // https://en.wikipedia.org/wiki/Rose_Namajunas
      "Zhang Weili": { w: { add: ['WFly'] }, a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/Zhang_Weili
      "Joanna Jedrzejczyk": { a: { add: ['HOF', 'SUB_WIN'] }, w: { add: ['WFly'] } }, // https://en.wikipedia.org/wiki/UFC_Hall_of_Fame
      "Angela Lee": { a: { add: ['KO_WIN'] }, w: { remove: ['WFly'] } }, // https://en.wikipedia.org/wiki/Angela_Lee
      "Carla Esparza": { p: { add: ['BELLATOR'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Carla_Esparza
      "Tatiana Suarez": { w: { add: ['WFly'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Tatiana_Suarez
      "Antonio Rodrigo Nogueira": { a: { remove: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Ant%C3%B4nio_Rodrigo_Nogueira
      "Andrei Arlovski": { p: { add: ['ONE'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Andrei_Arlovski
      "Brock Lesnar": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Brock_Lesnar
      "Frank Mir": { p: { add: ['BELLATOR'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Frank_Mir
      "Tim Sylvia": { p: { add: ['ONE'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Tim_Sylvia
      "Shane Carwin": { p: { add: ['WEC'] }, a: { add: ['SUB_WIN'], remove: ['CHAMPION'] } }, // https://en.wikipedia.org/wiki/Shane_Carwin
      "Kevin Randleman": { p: { add: ['STRIKEFORCE'] }, a: { add: ['HOF'] } }, // https://en.wikipedia.org/wiki/Kevin_Randleman
      "Roy Nelson": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Roy_Nelson_(fighter)
      "Pedro Rizzo": { p: { add: ['PRIDE'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Pedro_Rizzo
      "Jai Herbert": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Jai_Herbert
      "Antonio Rogerio Nogueira": { w: { remove: ['MW'] } }, // https://en.wikipedia.org/wiki/Ant%C3%B4nio_Rog%C3%A9rio_Nogueira
      "Keith Jardine": { p: { add: ['STRIKEFORCE'], remove: ['WEC'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Keith_Jardine
      "Thiago Silva": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Thiago_Silva_(fighter)
      "Ovince Saint Preux": { p: { add: ['STRIKEFORCE'] }, w: { add: ['HW'] } }, // https://en.wikipedia.org/wiki/Ovince_Saint_Preux
      "Chael Sonnen": { p: { add: ['WEC'], remove: ['STRIKEFORCE'] }, w: { add: ['HW'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Chael_Sonnen
      "Kazushi Sakuraba": { w: { add: ['LHW'], remove: ['WW'] }, a: { remove: ['CHAMPION'] } }, // https://en.wikipedia.org/wiki/Kazushi_Sakuraba
      "Yushin Okami": { p: { add: ['ONE'] }, w: { add: ['LHW', 'WW'] } }, // https://en.wikipedia.org/wiki/Yushin_Okami
      "Tim Kennedy": { p: { add: ['WEC'] }, w: { add: ['LHW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Tim_Kennedy_(fighter)
      "Mark Munoz": { p: { add: ['WEC'] }, w: { add: ['LHW'] } }, // https://en.wikipedia.org/wiki/Mark_Mu%C3%B1oz
      "Alan Belcher": { w: { add: ['LHW'] } }, // https://en.wikipedia.org/wiki/Alan_Belcher
      "Rory MacDonald": { w: { add: ['MW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Rory_MacDonald_(fighter)
      "Jake Shields": { p: { remove: ['BELLATOR', 'PRIDE'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Jake_Shields
      "Diego Sanchez": { w: { add: ['MW', 'FW'] } }, // https://en.wikipedia.org/wiki/The_Ultimate_Fighter_1
      "Lorenz Larkin": { w: { add: ['LHW'] } }, // https://en.wikipedia.org/wiki/Lorenz_Larkin
      "Edson Barboza": { w: { add: ['FW'], remove: ['WW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Edson_Barboza
      "Kevin Holland": { p: { add: ['BELLATOR'] } }, // https://en.wikipedia.org/wiki/Kevin_Holland
      "Vicente Luque": { w: { add: ['MW'] } }, // https://en.wikipedia.org/wiki/UFC_327
      "Gray Maynard": { p: { remove: ['WEC'] }, w: { add: ['FW'] }, a: { remove: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Gray_Maynard
      "Shinya Aoki": { p: { add: ['PRIDE', 'STRIKEFORCE'] }, w: { add: ['FW'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Shinya_Aoki
      "Paul Felder": { w: { add: ['WW'] } }, // https://en.wikipedia.org/wiki/Paul_Felder
      "Drew Dober": { p: { add: ['BELLATOR'] }, w: { add: ['WW'] } }, // https://en.wikipedia.org/wiki/Drew_Dober
      "Jalin Turner": { p: { add: ['BELLATOR'] }, w: { add: ['WW'] } }, // https://en.wikipedia.org/wiki/Jalin_Turner
      "Movsar Evloev": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Movsar_Evloev
      "Giga Chikadze": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Giga_Chikadze
      "Sodiq Yusuff": { w: { add: ['LW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/UFC_Fight_Night:_Burns_vs._Morales
      "Renan Barao": { w: { add: ['FW'] }, a: { remove: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/UFC_Fight_Night:_Almeida_vs._Garbrandt
      "John Lineker": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/John_Lineker
      "Raphael Assuncao": { p: { add: ['WEC'], remove: ['STRIKEFORCE'] }, w: { add: ['FW'] } }, // https://en.wikipedia.org/wiki/Raphael_Assun%C3%A7%C3%A3o
      "Marlon Vera": { w: { add: ['FW'] } }, // https://en.wikipedia.org/wiki/UFC_Fight_Night:_Whittaker_vs._Brunson
      "Jimmie Rivera": { p: { add: ['BELLATOR'] }, w: { add: ['FW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Jimmie_Rivera
      "Ian McCall": { w: { add: ['BW'] } }, // https://en.wikipedia.org/wiki/WEC_38
      "Tim Elliott": { w: { add: ['BW'] } }, // https://en.wikipedia.org/wiki/UFC_219
      "Kai Kara-France": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Kai_Kara-France
      "Manel Kape": { w: { remove: ['FW'] } }, // https://en.wikipedia.org/wiki/Manel_Kape
      "Matheus Nicolau": { w: { add: ['BW'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/UFC_Fight_Night:_Belfort_vs._Henderson_3
      "Julianna Pena": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Julianna_Pe%C3%B1a
      "Germaine de Randamie": { p: { add: ['STRIKEFORCE'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Strikeforce:_Diaz_vs._Cyborg
      "Cat Zingano": { p: { add: ['BELLATOR'] }, w: { add: ['WFW'] } }, // https://en.wikipedia.org/wiki/Cat_Zingano
      "Sara McMann": { p: { add: ['BELLATOR'], remove: ['STRIKEFORCE'] }, w: { add: ['WFW'] } }, // https://en.wikipedia.org/wiki/Sara_McMann
      "Liz Carmouche": { p: { add: ['STRIKEFORCE'] }, w: { add: ['WFly'] }, a: { add: ['TITLE_DEF'] } }, // https://en.wikipedia.org/wiki/Liz_Carmouche
      "Jessica Eye": { p: { add: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Jessica_Eye
      "Aspen Ladd": { p: { add: ['BELLATOR'] }, w: { add: ['WFW'] } }, // https://en.wikipedia.org/wiki/Bellator_Champions_Series_2
      "Cynthia Calvillo": { a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Cynthia_Calvillo
      "Viviane Araujo": { w: { add: ['WBW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Viviane_Ara%C3%BAjo_(fighter)
      "Mackenzie Dern": { a: { add: ['CHAMPION'] } }, // https://en.wikipedia.org/wiki/Mackenzie_Dern
      "Karolina Kowalkiewicz": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Karolina_Kowalkiewicz
      "Paige VanZant": { w: { add: ['WFly'] } }, // https://en.wikipedia.org/wiki/Paige_VanZant
      "Aung La N Sang": { p: { add: ['BELLATOR'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Bellator_68
      "Christian Lee": { w: { add: ['FW'] } }, // https://en.wikipedia.org/wiki/Christian_Lee_(fighter)
      "Stamp Fairtex": { w: { remove: ['WFly', 'WFW'] } }, // https://en.wikipedia.org/wiki/Stamp_Fairtex
      "Ok Rae Yoon": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Ok_Rae-yoon
      "Thanh Le": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Thanh_Le
      "Mark Coleman": { w: { add: ['LHW'] }, a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Mark_Coleman
      "Don Frye": { a: { remove: ['CHAMPION'] } }, // https://en.wikipedia.org/wiki/Don_Frye
      "Pat Miletich": { w: { add: ['MW'] }, a: { add: ['SUB_WIN', 'KO_WIN'] } }, // https://en.wikipedia.org/wiki/Pat_Miletich
      "Sean Sherk": { p: { add: ['PRIDE'] }, a: { add: ['KO_WIN'] } }, // https://en.wikipedia.org/wiki/Pride_Bushido_2
      "Jens Pulver": { p: { add: ['ONE'] }, w: { add: ['BW'] }, a: { add: ['SUB_WIN', 'HOF'] } }, // https://en.wikipedia.org/wiki/Jens_Pulver
      "Kyoji Horiguchi": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Kyoji_Horiguchi
      "Michael Page": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Michael_Page_(fighter)
      "Gina Carano": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Gina_Carano
      "Sarah Kaufman": { a: { add: ['SUB_WIN'] } }, // https://en.wikipedia.org/wiki/Sarah_Kaufman
    },
  },
]
