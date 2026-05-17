import { useState, useRef, useEffect, useMemo } from "react";

// ─── PLAYER DATABASE (1000 players) ───────────────────────────────────────────
// teams: array of team abbreviations
// awards: array of award codes
// fame: 1-100 (higher = more famous = lower score)
const TEAMS = {
  ARI:"Cardinals",ARZ:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",
  CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",
  DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",
  JAX:"Jaguars",KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",
  MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",
  NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",
  TB:"Buccaneers",TEN:"Titans",WAS:"Commanders",SD:"Chargers",STL:"Rams",
  OAK:"Raiders",HOU2:"Oilers",
};

const AWARDS = {
  SB_CHAMP:"Super Bowl Champion",
  SB_MVP:"Super Bowl MVP",
  NFL_MVP:"NFL MVP",
  PRO_BOWL:"Pro Bowl",
  OPOY:"Offensive Player of the Year",
  DPOY:"Defensive Player of the Year",
  RUSH_TITLE:"Rushing Title",
  PASS_TITLE:"Passing Title",
  OROY:"Offensive Rookie of the Year",
  DROY:"Defensive Rookie of the Year",
};

const PLAYERS = [
  // ── QBs ──
  {n:"Tom Brady",t:["NE","TB"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:99},
  {n:"Peyton Manning",t:["IND","DEN"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:98},
  {n:"Aaron Rodgers",t:["GB","NYJ"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY"],f:97},
  {n:"Patrick Mahomes",t:["KC"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:99},
  {n:"Joe Montana",t:["SF","KC"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL"],f:99},
  {n:"Brett Favre",t:["GB","MIN","NYJ","ATL"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","PASS_TITLE"],f:97},
  {n:"Drew Brees",t:["SD","NO"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:96},
  {n:"Dan Marino",t:["MIA"],a:["PRO_BOWL","PASS_TITLE","OPOY"],f:97},
  {n:"John Elway",t:["DEN"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","NFL_MVP"],f:97},
  {n:"Steve Young",t:["SF","TB"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","PASS_TITLE"],f:96},
  {n:"Joe Flacco",t:["BAL","DEN","NYJ","PHI","CLE","IND","MIN"],a:["SB_CHAMP","SB_MVP"],f:55},
  {n:"Russell Wilson",t:["SEA","DEN","PIT"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Ben Roethlisberger",t:["PIT"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:88},
  {n:"Eli Manning",t:["NYG"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:85},
  {n:"Troy Aikman",t:["DAL"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:92},
  {n:"Steve McNair",t:["TEN","BAL"],a:["NFL_MVP","PRO_BOWL"],f:78},
  {n:"Kurt Warner",t:["STL","NYG","ARI"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:88},
  {n:"Donovan McNabb",t:["PHI","WAS"],a:["PRO_BOWL"],f:78},
  {n:"Michael Vick",t:["ATL","PHI","NYJ","PIT"],a:["PRO_BOWL"],f:82},
  {n:"Daunte Culpepper",t:["MIN","MIA","OAK","DET","CAR"],a:["PRO_BOWL","PASS_TITLE"],f:62},
  {n:"Matt Ryan",t:["ATL","IND"],a:["NFL_MVP","PRO_BOWL","OPOY"],f:75},
  {n:"Cam Newton",t:["CAR","NE"],a:["NFL_MVP","PRO_BOWL","OROY","OPOY"],f:82},
  {n:"Josh Allen",t:["BUF"],a:["PRO_BOWL","OPOY"],f:90},
  {n:"Lamar Jackson",t:["BAL"],a:["NFL_MVP","PRO_BOWL","OPOY"],f:92},
  {n:"Justin Herbert",t:["LAC"],a:["PRO_BOWL","OROY"],f:78},
  {n:"Joe Burrow",t:["CIN"],a:["PRO_BOWL"],f:82},
  {n:"Jalen Hurts",t:["PHI"],a:["PRO_BOWL","OPOY"],f:85},
  {n:"Dak Prescott",t:["DAL"],a:["PRO_BOWL","OROY"],f:80},
  {n:"Kirk Cousins",t:["WAS","MIN","ATL"],a:["PRO_BOWL"],f:65},
  {n:"Matthew Stafford",t:["DET","LAR"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:72},
  {n:"Philip Rivers",t:["SD","LAC","IND"],a:["PRO_BOWL","PASS_TITLE"],f:80},
  {n:"Tony Romo",t:["DAL"],a:["PRO_BOWL"],f:78},
  {n:"Mark Sanchez",t:["NYJ","PHI","DEN","WAS","CHI"],a:[],f:38},
  {n:"Chad Pennington",t:["NYJ","MIA"],a:["PRO_BOWL"],f:52},
  {n:"Trent Green",t:["WAS","STL","KC","MIA"],a:["PRO_BOWL"],f:45},
  {n:"Jake Delhomme",t:["NO","CAR","CLE","HOU"],a:["PRO_BOWL"],f:42},
  {n:"Brad Johnson",t:["MIN","WAS","TB","DAL","NYJ","ATL"],a:["SB_CHAMP","SB_MVP"],f:48},
  {n:"Trent Dilfer",t:["TB","BAL","SEA","CLE","SF"],a:["SB_CHAMP","SB_MVP"],f:45},
  {n:"Jeff Garcia",t:["SF","CLE","DET","PHI","TB","OAK"],a:["PRO_BOWL"],f:52},
  {n:"Kyle Orton",t:["CHI","DEN","KC","DAL","BUF"],a:[],f:30},
  {n:"Alex Smith",t:["SF","KC","WAS"],a:["PRO_BOWL"],f:65},
  {n:"Carson Palmer",t:["CIN","OAK","ARI"],a:["PRO_BOWL"],f:68},
  {n:"Andy Dalton",t:["CIN","DAL","CHI","NYG","BAL","CAR"],a:["PRO_BOWL"],f:60},
  {n:"Ryan Tannehill",t:["MIA","TEN"],a:["PRO_BOWL"],f:62},
  {n:"Teddy Bridgewater",t:["MIN","NO","CAR","DEN","MIA","PHI"],a:[],f:42},
  {n:"Jimmy Garoppolo",t:["NE","SF","LV"],a:[],f:52},
  {n:"Geno Smith",t:["NYJ","NYG","LAC","SEA","GB"],a:["PRO_BOWL"],f:48},
  {n:"Nick Foles",t:["PHI","STL","JAX","KC","CHI","IND"],a:["SB_CHAMP","SB_MVP"],f:55},
  {n:"Case Keenum",t:["HOU","STL","MIA","MIN","DEN","WAS","CLE","BUF"],a:[],f:38},
  {n:"Sam Bradford",t:["STL","PHI","MIN","ARI"],a:["OROY"],f:48},
  {n:"Blaine Gabbert",t:["JAX","SF","ARI","TEN","MIA","TB"],a:[],f:28},
  {n:"Brock Osweiler",t:["DEN","HOU","CLE","MIA"],a:["SB_CHAMP"],f:35},
  {n:"Derek Carr",t:["OAK","LV","NO","ATL"],a:["PRO_BOWL"],f:62},
  {n:"Kyler Murray",t:["ARI"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Trevor Lawrence",t:["JAX"],a:["PRO_BOWL"],f:72},
  {n:"Tua Tagovailoa",t:["MIA"],a:["PRO_BOWL"],f:68},
  {n:"Mac Jones",t:["NE","JAX"],a:[],f:45},
  {n:"Daniel Jones",t:["NYG"],a:[],f:42},
  {n:"Sam Darnold",t:["NYJ","CAR","SF","MIN"],a:[],f:40},
  {n:"Baker Mayfield",t:["CLE","CAR","LAR","TB"],a:["SB_CHAMP"],f:58},
  {n:"Mitch Trubisky",t:["CHI","BUF","PIT"],a:[],f:38},
  {n:"Deshaun Watson",t:["HOU","CLE"],a:["PRO_BOWL"],f:65},
  {n:"C.J. Stroud",t:["HOU"],a:["PRO_BOWL","OROY"],f:72},

  // ── RBs ──
  {n:"Emmitt Smith",t:["DAL","ARI"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:99},
  {n:"Barry Sanders",t:["DET"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:99},
  {n:"Walter Payton",t:["CHI"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:99},
  {n:"Adrian Peterson",t:["MIN","NO","ARI","WAS","DET","TEN"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:95},
  {n:"LaDainian Tomlinson",t:["SD","NYJ"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:96},
  {n:"Eric Dickerson",t:["STL","IND","OAK","ATL"],a:["PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:92},
  {n:"Marshall Faulk",t:["IND","STL"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","OPOY","OROY"],f:94},
  {n:"Jerome Bettis",t:["STL","PIT"],a:["SB_CHAMP","PRO_BOWL"],f:88},
  {n:"Curtis Martin",t:["NE","NYJ"],a:["PRO_BOWL","RUSH_TITLE","OROY"],f:82},
  {n:"Edgerrin James",t:["IND","ARI","SEA","JAX"],a:["PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:85},
  {n:"Ricky Williams",t:["NO","MIA","BAL","HOU"],a:["RUSH_TITLE"],f:68},
  {n:"Priest Holmes",t:["BAL","KC"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Jamal Lewis",t:["BAL","CLE"],a:["SB_CHAMP","PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Clinton Portis",t:["DEN","WAS"],a:["PRO_BOWL"],f:68},
  {n:"Shaun Alexander",t:["SEA","WAS"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Tiki Barber",t:["NYG"],a:["PRO_BOWL"],f:75},
  {n:"Brian Westbrook",t:["PHI","SF"],a:["PRO_BOWL"],f:72},
  {n:"Chris Johnson",t:["TEN","NYJ","ARI"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:75},
  {n:"DeAngelo Williams",t:["CAR","PIT"],a:["PRO_BOWL"],f:58},
  {n:"Frank Gore",t:["SF","IND","MIA","BUF","NYJ"],a:["PRO_BOWL"],f:78},
  {n:"Steven Jackson",t:["STL","ATL","NE"],a:["PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Arian Foster",t:["HOU","MIA"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:72},
  {n:"Ray Rice",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Matt Forte",t:["CHI","NYJ"],a:["PRO_BOWL"],f:72},
  {n:"Maurice Jones-Drew",t:["JAX","OAK"],a:["PRO_BOWL","RUSH_TITLE"],f:68},
  {n:"Alfred Morris",t:["WAS","DAL","SF"],a:[],f:40},
  {n:"Marshawn Lynch",t:["BUF","SEA","OAK"],a:["SB_CHAMP","PRO_BOWL","RUSH_TITLE"],f:88},
  {n:"Doug Martin",t:["TB","OAK"],a:["PRO_BOWL","RUSH_TITLE"],f:58},
  {n:"Eddie Lacy",t:["GB","SEA"],a:["OROY"],f:55},
  {n:"Le'Veon Bell",t:["PIT","NYJ","KC","BAL"],a:["PRO_BOWL"],f:75},
  {n:"Todd Gurley",t:["STL","LAR","ATL"],a:["PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:78},
  {n:"Ezekiel Elliott",t:["DAL","NE"],a:["PRO_BOWL","RUSH_TITLE"],f:82},
  {n:"Leonard Fournette",t:["JAX","TB"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Kareem Hunt",t:["KC","CLE"],a:["PRO_BOWL","RUSH_TITLE","OROY"],f:65},
  {n:"Saquon Barkley",t:["NYG","PHI"],a:["PRO_BOWL","OPOY","OROY"],f:85},
  {n:"Derrick Henry",t:["TEN","NE","BAL"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:88},
  {n:"Alvin Kamara",t:["NO"],a:["PRO_BOWL","OROY"],f:82},
  {n:"Christian McCaffrey",t:["CAR","SF"],a:["PRO_BOWL","OPOY","RUSH_TITLE"],f:90},
  {n:"Nick Chubb",t:["CLE"],a:["PRO_BOWL"],f:78},
  {n:"Dalvin Cook",t:["MIN","NYJ","NYG","DAL"],a:["PRO_BOWL"],f:75},
  {n:"Josh Jacobs",t:["OAK","LV","GB"],a:["PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Jonathan Taylor",t:["IND"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Tony Pollard",t:["DAL","TEN"],a:["PRO_BOWL"],f:65},
  {n:"David Montgomery",t:["CHI","DET"],a:[],f:55},
  {n:"Miles Sanders",t:["PHI","CAR"],a:[],f:52},
  {n:"Joe Mixon",t:["CIN","HOU"],a:["PRO_BOWL"],f:68},
  {n:"Aaron Jones",t:["GB","MIN"],a:["PRO_BOWL"],f:65},
  {n:"James Conner",t:["PIT","ARI"],a:["PRO_BOWL"],f:58},
  {n:"Rashaad Penny",t:["SEA","PHI","HOU"],a:[],f:38},
  {n:"Dameon Pierce",t:["HOU"],a:[],f:40},
  {n:"Breece Hall",t:["NYJ"],a:["PRO_BOWL"],f:62},
  {n:"Bijan Robinson",t:["ATL"],a:["PRO_BOWL","OROY"],f:68},
  {n:"De'Von Achane",t:["MIA"],a:["PRO_BOWL"],f:65},
  {n:"Jahmyr Gibbs",t:["DET"],a:[],f:60},
  {n:"Jerome Harrison",t:["CLE","PHI","DET","STL"],a:[],f:28},
  {n:"Reggie Bush",t:["NO","MIA","DET","SF","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Kevin Faulk",t:["NE"],a:["SB_CHAMP"],f:48},
  {n:"Warrick Dunn",t:["TB","ATL"],a:["PRO_BOWL"],f:68},
  {n:"Corey Dillon",t:["CIN","NE"],a:["SB_CHAMP"],f:58},
  {n:"Willis McGahee",t:["BUF","BAL","DEN","CLE","MIA"],a:["PRO_BOWL"],f:55},
  {n:"Cedric Benson",t:["CHI","CIN","GB"],a:[],f:42},
  {n:"Thomas Jones",t:["ARI","TB","CHI","NYJ","KC"],a:[],f:45},
  {n:"Kevin Jones",t:["DET","CHI"],a:[],f:28},
  {n:"Larry Johnson",t:["KC","CIN","WAS","MIA"],a:["PRO_BOWL","RUSH_TITLE"],f:58},

  // ── WRs ──
  {n:"Jerry Rice",t:["SF","OAK","SEA"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY"],f:99},
  {n:"Randy Moss",t:["MIN","OAK","NE","TEN","SF"],a:["PRO_BOWL","OPOY","OROY"],f:97},
  {n:"Terrell Owens",t:["SF","PHI","DAL","BUF","CIN"],a:["PRO_BOWL","OPOY"],f:90},
  {n:"Larry Fitzgerald",t:["ARI"],a:["PRO_BOWL","OPOY"],f:92},
  {n:"Calvin Johnson",t:["DET"],a:["PRO_BOWL","OPOY"],f:94},
  {n:"Steve Smith Sr.",t:["CAR","BAL"],a:["PRO_BOWL","OPOY"],f:85},
  {n:"Andre Johnson",t:["HOU","IND","TEN","CLE","DET"],a:["PRO_BOWL","OPOY"],f:82},
  {n:"Marvin Harrison",t:["IND"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Cris Carter",t:["PHI","MIN","MIA"],a:["PRO_BOWL"],f:85},
  {n:"Tim Brown",t:["OAK","TB","NE"],a:["PRO_BOWL"],f:82},
  {n:"Hines Ward",t:["PIT"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:80},
  {n:"Reggie Wayne",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Anquan Boldin",t:["ARI","BAL","SF","DET","BUF","NO"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:72},
  {n:"Torry Holt",t:["STL","JAX"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:78},
  {n:"Isaac Bruce",t:["STL","SF"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:78},
  {n:"Wes Welker",t:["MIA","NE","DEN","STL"],a:["SB_CHAMP","PRO_BOWL"],f:80},
  {n:"Antonio Gates",t:["SD","LAC"],a:["PRO_BOWL"],f:82},
  {n:"Antonio Brown",t:["PIT","OAK","NE","TB"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:90},
  {n:"Julio Jones",t:["ATL","TEN","TB"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Odell Beckham Jr.",t:["NYG","CLE","LAR","BAL"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:85},
  {n:"Dez Bryant",t:["DAL","NO","CLE"],a:["PRO_BOWL"],f:75},
  {n:"A.J. Green",t:["CIN","ARI"],a:["PRO_BOWL"],f:80},
  {n:"DeAndre Hopkins",t:["HOU","ARI","TEN","NE","BUF"],a:["PRO_BOWL","OPOY"],f:85},
  {n:"Davante Adams",t:["GB","LV"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Stefon Diggs",t:["MIN","BUF","HOU"],a:["PRO_BOWL"],f:82},
  {n:"Tyreek Hill",t:["KC","MIA"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:90},
  {n:"Cooper Kupp",t:["LAR"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:85},
  {n:"Justin Jefferson",t:["MIN"],a:["PRO_BOWL","OPOY","OROY"],f:92},
  {n:"Ja'Marr Chase",t:["CIN"],a:["PRO_BOWL","OPOY","OROY"],f:88},
  {n:"CeeDee Lamb",t:["DAL"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Mike Evans",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Amari Cooper",t:["OAK","DAL","CLE","BUF","NO"],a:["PRO_BOWL","OROY"],f:75},
  {n:"Keenan Allen",t:["SD","LAC","CHI"],a:["PRO_BOWL"],f:78},
  {n:"Adam Thielen",t:["MIN","CAR"],a:["PRO_BOWL"],f:72},
  {n:"Tyler Lockett",t:["SEA"],a:["PRO_BOWL"],f:70},
  {n:"DK Metcalf",t:["SEA"],a:["PRO_BOWL"],f:78},
  {n:"Diontae Johnson",t:["PIT","CAR","BAL"],a:["PRO_BOWL"],f:62},
  {n:"Brandin Cooks",t:["NO","NE","LAR","HOU","DAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Emmanuel Sanders",t:["PIT","DEN","SF","NO","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"T.Y. Hilton",t:["IND"],a:["PRO_BOWL"],f:70},
  {n:"Golden Tate",t:["SEA","DET","PHI","NYG","SF"],a:[],f:58},
  {n:"Demaryius Thomas",t:["DEN","HOU","NYJ","NE"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Eric Decker",t:["DEN","NYJ","TEN","NE"],a:["SB_CHAMP"],f:55},
  {n:"Vincent Jackson",t:["SD","TB"],a:["PRO_BOWL"],f:65},
  {n:"Mike Wallace",t:["PIT","MIA","MIN","BAL","PHI","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Victor Cruz",t:["NYG"],a:["PRO_BOWL"],f:65},
  {n:"Julian Edelman",t:["NE"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:80},
  {n:"Danny Amendola",t:["STL","NE","MIA","DET","HOU"],a:["SB_CHAMP"],f:52},
  {n:"Chris Hogan",t:["BUF","NE","CAR","NYJ"],a:["SB_CHAMP"],f:38},
  {n:"Martellus Bennett",t:["DAL","NYG","CHI","NE","GB","BAL"],a:["SB_CHAMP"],f:55},
  {n:"Rob Gronkowski",t:["NE","TB"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:95},
  {n:"Travis Kelce",t:["KC"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:97},
  {n:"Tony Gonzalez",t:["KC","ATL"],a:["PRO_BOWL"],f:94},
  {n:"Jason Witten",t:["DAL","LV","MIA"],a:["PRO_BOWL"],f:85},
  {n:"Greg Olsen",t:["CHI","CAR","SEA"],a:["PRO_BOWL"],f:75},
  {n:"Jimmy Graham",t:["NO","SEA","GB","CHI"],a:["PRO_BOWL"],f:80},
  {n:"Vernon Davis",t:["SF","DEN","WAS"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Zach Ertz",t:["PHI","ARI"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"George Kittle",t:["SF"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Darren Waller",t:["BAL","OAK","LV","NYG"],a:["PRO_BOWL"],f:65},
  {n:"Mark Andrews",t:["BAL"],a:["PRO_BOWL"],f:80},
  {n:"Sam LaPorta",t:["DET"],a:["PRO_BOWL","OROY"],f:58},
  {n:"Brock Bowers",t:["LV"],a:["OROY"],f:62},

  // ── OL ──
  {n:"Orlando Pace",t:["STL","CHI"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Jonathan Ogden",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Walter Jones",t:["SEA"],a:["PRO_BOWL"],f:75},
  {n:"Larry Allen",t:["DAL","SF"],a:["SB_CHAMP","PRO_BOWL"],f:80},
  {n:"Will Shields",t:["KC"],a:["PRO_BOWL"],f:72},
  {n:"Alan Faneca",t:["PIT","NYJ","ARI"],a:["PRO_BOWL"],f:70},
  {n:"Steve Hutchinson",t:["SEA","MIN","TEN"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Matt Light",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Joe Thomas",t:["CLE"],a:["PRO_BOWL"],f:80},
  {n:"Trent Williams",t:["WAS","SF"],a:["PRO_BOWL"],f:78},
  {n:"Marshal Yanda",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Zack Martin",t:["DAL"],a:["PRO_BOWL"],f:75},
  {n:"Quenton Nelson",t:["IND"],a:["PRO_BOWL","DROY"],f:72},
  {n:"Laremy Tunsil",t:["MIA","HOU"],a:["PRO_BOWL"],f:65},
  {n:"Tyron Smith",t:["DAL"],a:["PRO_BOWL"],f:72},
  {n:"David Bakhtiari",t:["GB"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Lane Johnson",t:["PHI"],a:["SB_CHAMP","PRO_BOWL"],f:70},
  {n:"Andrew Whitworth",t:["CIN","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Mike Pouncey",t:["MIA","LAC"],a:["PRO_BOWL"],f:58},
  {n:"Maurkice Pouncey",t:["PIT"],a:["PRO_BOWL"],f:62},

  // ── DL / Edge ──
  {n:"Reggie White",t:["PHI","GB","CAR"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:99},
  {n:"Bruce Smith",t:["BUF","WAS"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Dwight Freeney",t:["IND","SD","ARI","ATL","SEA"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Julius Peppers",t:["CAR","CHI","GB","CAR"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Robert Mathis",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Jared Allen",t:["KC","MIN","CHI","CAR"],a:["PRO_BOWL"],f:80},
  {n:"Jason Taylor",t:["MIA","WAS","NYJ"],a:["PRO_BOWL","DPOY"],f:82},
  {n:"Michael Strahan",t:["NYG"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:88},
  {n:"Richard Seymour",t:["NE","OAK"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Warren Sapp",t:["TB","OAK"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Ndamukong Suh",t:["DET","MIA","LAR","TB","PHI","TB"],a:["SB_CHAMP","PRO_BOWL","DROY"],f:80},
  {n:"Geno Atkins",t:["CIN"],a:["PRO_BOWL"],f:70},
  {n:"Gerald McCoy",t:["TB","CAR","BAL"],a:["PRO_BOWL"],f:72},
  {n:"Aaron Donald",t:["STL","LAR"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:97},
  {n:"J.J. Watt",t:["HOU","ARI"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Khalil Mack",t:["OAK","CHI","LAC"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Von Miller",t:["DEN","LAR","BUF"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","DPOY"],f:88},
  {n:"Myles Garrett",t:["CLE"],a:["PRO_BOWL","DPOY"],f:85},
  {n:"Micah Parsons",t:["DAL"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Nick Bosa",t:["SF"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"T.J. Watt",t:["PIT"],a:["PRO_BOWL","DPOY"],f:88},
  {n:"Maxx Crosby",t:["OAK","LV"],a:["PRO_BOWL"],f:75},
  {n:"Chris Jones",t:["KC"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Aidan Hutchinson",t:["DET"],a:["PRO_BOWL"],f:72},
  {n:"Brian Burns",t:["CAR","NYG"],a:["PRO_BOWL"],f:62},
  {n:"Leonard Williams",t:["NYJ","NYG","SEA"],a:["PRO_BOWL"],f:65},
  {n:"DeForest Buckner",t:["SF","IND"],a:["PRO_BOWL"],f:68},
  {n:"Cameron Jordan",t:["NO"],a:["PRO_BOWL"],f:78},
  {n:"Frank Clark",t:["SEA","KC","DEN"],a:["SB_CHAMP"],f:55},
  {n:"Carlos Dunlap",t:["CIN","SEA","KC"],a:["PRO_BOWL"],f:58},
  {n:"Calais Campbell",t:["ARI","JAX","BAL","ATL","MIA"],a:["PRO_BOWL"],f:70},
  {n:"Michael Bennett",t:["SEA","PHI","NE","DAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Damon Harrison",t:["NYJ","NYG","DET","SEA"],a:["PRO_BOWL"],f:55},
  {n:"Sheldon Richardson",t:["NYJ","SEA","CLE","MIN","NYG"],a:["DROY"],f:52},

  // ── LBs ──
  {n:"Lawrence Taylor",t:["NYG"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","DPOY"],f:99},
  {n:"Ray Lewis",t:["BAL"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","DPOY"],f:99},
  {n:"Brian Urlacher",t:["CHI"],a:["PRO_BOWL","DPOY","DROY"],f:90},
  {n:"Derrick Brooks",t:["TB"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Junior Seau",t:["SD","MIA","NE"],a:["PRO_BOWL"],f:90},
  {n:"Zach Thomas",t:["MIA","DAL","KC"],a:["PRO_BOWL"],f:80},
  {n:"Patrick Willis",t:["SF"],a:["PRO_BOWL","DPOY","DROY"],f:82},
  {n:"Clay Matthews",t:["GB","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:80},
  {n:"DeMarcus Ware",t:["DAL","DEN"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Elvis Dumervil",t:["DEN","BAL","SF","NO"],a:["PRO_BOWL"],f:65},
  {n:"Terrell Suggs",t:["BAL","ARI","KC"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:80},
  {n:"James Harrison",t:["PIT","CIN","NE"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:78},
  {n:"Luke Kuechly",t:["CAR"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Bobby Wagner",t:["SEA","LAR","WAS"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Lavonte David",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Dont'a Hightower",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Deion Jones",t:["ATL","CAR"],a:[],f:50},
  {n:"Fred Warner",t:["SF"],a:["PRO_BOWL","DPOY"],f:72},
  {n:"Darius Leonard",t:["IND"],a:["PRO_BOWL","DPOY","DROY"],f:68},
  {n:"Roquan Smith",t:["CHI","BAL"],a:["PRO_BOWL"],f:72},
  {n:"Demario Davis",t:["NYJ","CLE","NO"],a:["PRO_BOWL"],f:62},
  {n:"C.J. Mosley",t:["BAL","NYJ"],a:["PRO_BOWL","DROY"],f:65},
  {n:"Kwon Alexander",t:["TB","SF","NO","NYJ","ARI"],a:["SB_CHAMP"],f:52},
  {n:"Zack Cunningham",t:["HOU","TEN","NYJ","CHI"],a:[],f:45},
  {n:"Jordan Hicks",t:["PHI","ARI","MIN"],a:[],f:45},
  {n:"Mychal Kendricks",t:["PHI","CLE","SEA"],a:[],f:42},

  // ── DBs ──
  {n:"Ronnie Lott",t:["SF","OAK","NYJ","KC"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:97},
  {n:"Deion Sanders",t:["ATL","SF","DAL","WAS","BAL"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:99},
  {n:"Rod Woodson",t:["PIT","SF","BAL","OAK"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:95},
  {n:"Charles Woodson",t:["OAK","GB","OAK"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:90},
  {n:"Champ Bailey",t:["WAS","DEN"],a:["PRO_BOWL"],f:88},
  {n:"Ed Reed",t:["BAL","HOU","NYJ"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Troy Polamalu",t:["PIT"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Darrelle Revis",t:["NYJ","TB","NE","PIT","KC","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Patrick Peterson",t:["ARI","MIN","PIT"],a:["PRO_BOWL"],f:80},
  {n:"Richard Sherman",t:["SEA","SF"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:82},
  {n:"Earl Thomas",t:["SEA","BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Kam Chancellor",t:["SEA"],a:["SB_CHAMP","PRO_BOWL"],f:75},
  {n:"Eric Berry",t:["KC","TEN"],a:["PRO_BOWL","DROY"],f:72},
  {n:"Malcolm Butler",t:["NE","TEN"],a:["SB_CHAMP"],f:62},
  {n:"Marshon Lattimore",t:["NO"],a:["PRO_BOWL","DROY"],f:70},
  {n:"Jalen Ramsey",t:["JAX","LAR","MIA"],a:["PRO_BOWL"],f:80},
  {n:"Stephon Gilmore",t:["BUF","NE","CAR","IND","DAL"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:72},
  {n:"Xavien Howard",t:["MIA"],a:["PRO_BOWL"],f:68},
  {n:"Minkah Fitzpatrick",t:["MIA","PIT"],a:["PRO_BOWL"],f:72},
  {n:"Derwin James",t:["LAC"],a:["PRO_BOWL"],f:68},
  {n:"Budda Baker",t:["ARI"],a:["PRO_BOWL"],f:65},
  {n:"Kevin Byard",t:["TEN","PHI"],a:["PRO_BOWL"],f:62},
  {n:"Jamal Adams",t:["NYJ","SEA","LAR"],a:["PRO_BOWL"],f:65},
  {n:"Antoine Winfield Jr.",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Kyle Hamilton",t:["BAL"],a:["PRO_BOWL"],f:68},
  {n:"Devon Witherspoon",t:["SEA"],a:["DROY"],f:55},
  {n:"Sauce Gardner",t:["NYJ"],a:["PRO_BOWL","DROY"],f:72},
  {n:"Tariq Woolen",t:["SEA"],a:["PRO_BOWL"],f:58},
  {n:"Chidobe Awuzie",t:["DAL","CIN","MIN"],a:[],f:45},
  {n:"Trevon Diggs",t:["DAL"],a:["PRO_BOWL"],f:70},
  {n:"Darius Slay",t:["DET","PHI"],a:["PRO_BOWL"],f:68},
  {n:"Byron Jones",t:["DAL","MIA"],a:["PRO_BOWL"],f:58},
  {n:"Adoree Jackson",t:["TEN","NYG"],a:[],f:48},
  {n:"Tre'Davious White",t:["BUF","LAR"],a:["PRO_BOWL"],f:62},
  {n:"Marlon Humphrey",t:["BAL"],a:["PRO_BOWL"],f:65},
  {n:"Aqib Talib",t:["TB","NE","DEN","LAR","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Tyrann Mathieu",t:["ARI","HOU","KC","NO","NE"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Harrison Smith",t:["MIN"],a:["PRO_BOWL"],f:70},
  {n:"Landon Collins",t:["NYG","WAS","ARI"],a:["PRO_BOWL"],f:62},
  {n:"Jabrill Peppers",t:["CLE","NYG","NE","ATL"],a:[],f:48},
  {n:"Marcus Williams",t:["NO","BAL"],a:["PRO_BOWL"],f:58},
  {n:"Jordan Poyer",t:["CLE","BUF","MIA"],a:["PRO_BOWL"],f:60},
  {n:"Micah Hyde",t:["GB","BUF"],a:["PRO_BOWL"],f:60},
  {n:"Devin McCourty",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Duron Harmon",t:["NE","DET","ATL"],a:["SB_CHAMP"],f:40},
  {n:"Patrick Chung",t:["NE","PHI"],a:["SB_CHAMP"],f:45},
  {n:"Devin Hester",t:["CHI","ATL","BAL","SEA","NO"],a:["PRO_BOWL"],f:75},

  // ── Kickers / Specialists ──
  {n:"Adam Vinatieri",t:["NE","IND"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Morten Andersen",t:["NO","ATL","NYG","KC","MIN"],a:["PRO_BOWL"],f:75},
  {n:"Jason Elam",t:["DEN","ATL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"John Kasay",t:["SEA","CAR","NO","NYG"],a:["PRO_BOWL"],f:58},
  {n:"Matt Stover",t:["CLE","BAL","IND"],a:["SB_CHAMP","PRO_BOWL"],f:60},
  {n:"David Akers",t:["PHI","SF","ATL","DET","WAS"],a:["PRO_BOWL"],f:58},
  {n:"Sebastian Janikowski",t:["OAK","SEA"],a:["PRO_BOWL"],f:62},
  {n:"Justin Tucker",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Harrison Butker",t:["KC"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Robbie Gould",t:["CHI","NYG","SF"],a:["PRO_BOWL"],f:62},
  {n:"Matt Prater",t:["DEN","DET","ARI","LAC"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Graham Gano",t:["WAS","CAR","NYG"],a:["PRO_BOWL"],f:55},
  {n:"Greg Zuerlein",t:["STL","LAR","DAL","NYG"],a:["SB_CHAMP","PRO_BOWL"],f:55},
  {n:"Younghoe Koo",t:["LAC","ATL"],a:["PRO_BOWL"],f:55},
  {n:"Tyler Bass",t:["BUF"],a:[],f:45},
  {n:"Evan McPherson",t:["CIN"],a:["PRO_BOWL"],f:55},

  // ── More players for team coverage ──
  {n:"Jacoby Brissett",t:["NE","IND","MIA","CLE","WAS","NE","ATL"],a:[],f:38},
  {n:"Josh McCown",t:["ARI","DET","OAK","CHI","TB","MIA","CAR","MIN","PHI","NYJ","HOU","CLE"],a:[],f:35},
  {n:"Ryan Fitzpatrick",t:["TEN","CIN","BUF","NYJ","HOU","MIA","TB","WAS","PHI"],a:[],f:52},
  {n:"EJ Manuel",t:["BUF","OAK"],a:[],f:28},
  {n:"Tyrod Taylor",t:["BAL","BUF","CLE","LAC","NYG","HOU"],a:[],f:42},
  {n:"Chase Daniel",t:["NO","KC","PHI","CHI","DET","LAC"],a:["SB_CHAMP"],f:32},
  {n:"AJ McCarron",t:["CIN","BUF","OAK","ATL","HOU"],a:[],f:32},
  {n:"Brandon Weeden",t:["CLE","DAL","HOU","TEN","MIN"],a:[],f:28},
  {n:"Jason Campbell",t:["WAS","OAK","CHI","CLE","NO"],a:[],f:32},
  {n:"Seneca Wallace",t:["SEA","CLE","SF","GB","NO"],a:[],f:28},
  {n:"Matt Cassel",t:["NE","KC","MIN","BUF","DAL","TEN","CHI"],a:["SB_CHAMP"],f:42},
  {n:"Drew Stanton",t:["DET","NYJ","IND","ARI"],a:[],f:28},
  {n:"Colt McCoy",t:["CLE","SF","WAS","NYG","ARI"],a:[],f:32},
  {n:"Charlie Batch",t:["DET","PIT"],a:["SB_CHAMP"],f:30},
  {n:"Josh Freeman",t:["TB","MIN","NYG","IND"],a:[],f:38},
  {n:"Christian Ponder",t:["MIN","OAK","SF","DEN"],a:[],f:30},
  {n:"Tavita Pritchard",t:["NYG"],a:[],f:18},
  {n:"Kordell Stewart",t:["PIT","CHI","BAL"],a:["PRO_BOWL"],f:62},
  {n:"Vinny Testaverde",t:["TB","CLE","BAL","NYJ","DAL","NE","PIT","CAR","MIN"],a:[],f:52},
  {n:"Trent Dilfer",t:["TB","BAL","SEA","CLE","SF"],a:["SB_CHAMP","SB_MVP"],f:45},
  {n:"Tommy Maddox",t:["LAR","DEN","NYG","PIT"],a:[],f:30},
  {n:"Neil O'Donnell",t:["PIT","NYJ","CIN","TEN"],a:[],f:38},
  {n:"Elvis Grbac",t:["SF","KC","BAL"],a:["PRO_BOWL"],f:38},
  {n:"Rodney Peete",t:["DAL","PHI","WAS","OAK","CAR","SF"],a:[],f:32},
  {n:"Quincy Carter",t:["DAL","NYJ"],a:[],f:28},
  {n:"Joey Harrington",t:["DET","MIA","ATL","NO"],a:[],f:32},
  {n:"Rex Grossman",t:["CHI","HOU","WAS"],a:["PRO_BOWL"],f:38},
  {n:"David Garrard",t:["JAX","NYJ"],a:["PRO_BOWL"],f:42},
  {n:"Charlie Frye",t:["CLE","SEA","OAK"],a:[],f:22},
  {n:"Brodie Croyle",t:["KC"],a:[],f:18},
  {n:"Luke McCown",t:["CLE","TB","JAX","NO","ATL"],a:[],f:22},
  {n:"Shaun Hill",t:["DAL","WAS","SF","DET","STL","MIN"],a:[],f:28},
  {n:"Tyler Thigpen",t:["KC","MIA","BUF"],a:[],f:20},
  {n:"John Skelton",t:["ARI"],a:[],f:18},
  {n:"Dan Orlovsky",t:["DET","HOU","TB","IND","NE"],a:[],f:28},
  {n:"Patrick Ramsey",t:["WAS","NYJ","DEN"],a:[],f:22},
  {n:"Marques Tuiasosopo",t:["OAK","NYJ"],a:[],f:18},
  {n:"Sage Rosenfels",t:["WAS","MIA","HOU","MIN","NYG"],a:[],f:25},
  {n:"Tim Hasselbeck",t:["NYG","WAS","BUF","ARI","NE"],a:[],f:18},
  {n:"Matt Hasselbeck",t:["GB","SEA","TEN","IND"],a:["PRO_BOWL"],f:65},
  {n:"Seneca Wallace",t:["SEA","CLE"],a:[],f:22},
  {n:"Charlie Whitehurst",t:["SD","SEA","TEN","IND","CHI"],a:[],f:20},
  {n:"Clipboard Jesus",t:["SEA","CHI","CLE"],a:[],f:15},
  {n:"Kevin Kolb",t:["PHI","ARI","BUF"],a:[],f:28},
  {n:"Vince Young",t:["TEN","PHI","GB"],a:["PRO_BOWL","OROY"],f:55},

  // ── More RBs ──
  {n:"Duce Staley",t:["PHI","PIT"],a:[],f:42},
  {n:"Stephen Davis",t:["WAS","CAR","STL"],a:["PRO_BOWL"],f:48},
  {n:"Garrison Hearst",t:["ARI","CIN","SF","DEN"],a:["PRO_BOWL"],f:48},
  {n:"Robert Smith",t:["MIN"],a:["PRO_BOWL","RUSH_TITLE"],f:52},
  {n:"Ahman Green",t:["SEA","GB","HOU"],a:["PRO_BOWL","RUSH_TITLE"],f:62},
  {n:"Fred Taylor",t:["JAX","NE"],a:["PRO_BOWL"],f:58},
  {n:"Charlie Garner",t:["PHI","GB","SF","OAK","TB"],a:["PRO_BOWL"],f:48},
  {n:"Anthony Thomas",t:["CHI","DAL","NE"],a:[],f:30},
  {n:"James Stewart",t:["JAX","DET"],a:[],f:35},
  {n:"Mike Anderson",t:["DEN","BAL"],a:["OROY"],f:38},
  {n:"Quentin Griffin",t:["DEN","HOU"],a:[],f:22},
  {n:"Ron Dayne",t:["NYG","DEN","HOU"],a:["OROY"],f:38},
  {n:"Lamar Smith",t:["SEA","NO","MIA","CAR"],a:[],f:28},
  {n:"DeShaun Foster",t:["CAR","SF"],a:["SB_CHAMP"],f:30},
  {n:"Correll Buckhalter",t:["PHI","DEN"],a:["SB_CHAMP"],f:32},
  {n:"Kevan Barlow",t:["SF","NYJ"],a:[],f:22},
  {n:"Rudi Johnson",t:["CIN","DET"],a:["RUSH_TITLE"],f:42},
  {n:"Kevin Jones",t:["DET","CHI"],a:[],f:25},
  {n:"Willie Parker",t:["PIT"],a:["SB_CHAMP"],f:42},
  {n:"Vernand Morency",t:["HOU","GB"],a:[],f:18},
  {n:"Ronnie Brown",t:["MIA","ARI","PHI","SD"],a:["PRO_BOWL"],f:52},
  {n:"Carnell Williams",t:["TB"],a:["OROY"],f:38},
  {n:"Frank Gore",t:["SF","IND","MIA","BUF","NYJ"],a:["PRO_BOWL"],f:75},
  {n:"Laurence Maroney",t:["NE","DEN","STL"],a:["SB_CHAMP"],f:32},
  {n:"Dominic Rhodes",t:["IND","OAK","BAL"],a:["SB_CHAMP"],f:35},
  {n:"Joseph Addai",t:["IND"],a:["SB_CHAMP","OROY"],f:38},
  {n:"LenDale White",t:["TEN","SEA"],a:[],f:35},
  {n:"Brandon Jacobs",t:["NYG","SF"],a:["SB_CHAMP"],f:48},
  {n:"Ahmad Bradshaw",t:["NYG","IND"],a:["SB_CHAMP"],f:48},
  {n:"Peyton Hillis",t:["DEN","CLE","KC","NYG","TB"],a:["PRO_BOWL"],f:45},
  {n:"BenJarvus Green-Ellis",t:["NE","CIN"],a:["SB_CHAMP"],f:38},
  {n:"Ryan Torain",t:["DEN","WAS","ARI"],a:[],f:18},
  {n:"Marshawn Lynch",t:["BUF","SEA","OAK"],a:["SB_CHAMP","PRO_BOWL","RUSH_TITLE"],f:88},
  {n:"Donald Brown",t:["IND","SD"],a:[],f:25},
  {n:"Felix Jones",t:["DAL","PHI","PIT"],a:["SB_CHAMP"],f:38},
  {n:"Shonn Greene",t:["NYJ","TEN","ARI"],a:[],f:32},
  {n:"Ryan Grant",t:["GB","IND"],a:["SB_CHAMP"],f:38},
  {n:"James Starks",t:["GB"],a:["SB_CHAMP"],f:32},
  {n:"Chris Ivory",t:["NO","NYJ","JAX","BUF","ATL"],a:["SB_CHAMP"],f:42},
  {n:"Alex Green",t:["GB","NYJ"],a:[],f:20},
  {n:"C.J. Spiller",t:["BUF","NO","NYJ","SEA","KC"],a:["PRO_BOWL"],f:52},
  {n:"Dion Lewis",t:["PHI","CLE","NE","TEN"],a:["SB_CHAMP"],f:42},
  {n:"James White",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Rex Burkhead",t:["CIN","NE","HOU"],a:["SB_CHAMP"],f:38},
  {n:"Mike Gillislee",t:["BUF","NE","NO"],a:["SB_CHAMP"],f:32},
  {n:"Jerick McKinnon",t:["MIN","SF","KC"],a:["SB_CHAMP"],f:38},
  {n:"Giovani Bernard",t:["CIN","TB"],a:["SB_CHAMP"],f:42},
  {n:"Kenyan Drake",t:["MIA","ARI","LV","BAL"],a:[],f:40},
  {n:"Tarik Cohen",t:["CHI"],a:[],f:38},
  {n:"Nyheim Hines",t:["IND","BUF"],a:[],f:35},
  {n:"Phillip Lindsay",t:["DEN","HOU","IND"],a:["PRO_BOWL"],f:42},
  {n:"David Johnson",t:["ARI","HOU"],a:["PRO_BOWL","OPOY"],f:68},
  {n:"Tevin Coleman",t:["ATL","SF","NYJ","NE"],a:["SB_CHAMP"],f:45},
  {n:"Devonta Freeman",t:["ATL","NYG"],a:["PRO_BOWL"],f:55},
  {n:"Latavius Murray",t:["OAK","MIN","NO","BAL","DEN"],a:[],f:42},
  {n:"Spencer Ware",t:["SEA","KC"],a:["SB_CHAMP"],f:32},
  {n:"West Kareem",t:["CIN","CLE","TEN","SF"],a:[],f:22},
  {n:"Isaiah Crowell",t:["CLE","NYJ"],a:[],f:35},
  {n:"Duke Johnson",t:["CLE","HOU","MIA"],a:[],f:38},
  {n:"Jordan Howard",t:["CHI","PHI","MIA","NO"],a:["PRO_BOWL"],f:45},
  {n:"Bilal Powell",t:["NYJ"],a:[],f:32},
  {n:"Chris Thompson",t:["WAS","JAX"],a:["PRO_BOWL"],f:38},
  {n:"Jamaal Charles",t:["KC","DEN","CHI"],a:["PRO_BOWL"],f:72},
  {n:"Peyton Barber",t:["TB","WAS","LV"],a:[],f:25},
  {n:"Alfred Blue",t:["HOU","JAX"],a:[],f:22},
  {n:"Darren McFadden",t:["OAK","DAL","NE"],a:["PRO_BOWL","OROY"],f:62},
  {n:"Darren Sproles",t:["SD","NO","PHI"],a:["PRO_BOWL"],f:65},
  {n:"Stevan Ridley",t:["NE","NYJ","STL"],a:["SB_CHAMP"],f:35},
  {n:"LeGarrette Blount",t:["TB","TEN","PIT","NE","PHI","DET"],a:["SB_CHAMP"],f:48},
  {n:"Jonathan Grimes",t:["HOU"],a:[],f:15},
  {n:"Denard Robinson",t:["JAX","NE"],a:[],f:20},
  {n:"Bishop Sankey",t:["TEN","CHI"],a:[],f:18},
  {n:"Andre Brown",t:["NYG","HOU","GB"],a:["SB_CHAMP"],f:25},

  // ── More WRs/TEs ──
  {n:"Peerless Price",t:["BUF","ATL","DAL","NE"],a:[],f:35},
  {n:"Plaxico Burress",t:["PIT","NYG","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Laveranues Coles",t:["NYJ","WAS","CIN"],a:[],f:38},
  {n:"David Patten",t:["NYG","NE","WAS","NO"],a:["SB_CHAMP"],f:35},
  {n:"Troy Brown",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:42},
  {n:"Deion Branch",t:["NE","SEA"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:52},
  {n:"Dedric Ward",t:["NYJ","MIA","DAL","NE","DET"],a:["SB_CHAMP"],f:22},
  {n:"Kevin Faulk",t:["NE"],a:["SB_CHAMP"],f:42},
  {n:"Jabar Gaffney",t:["HOU","NE","WAS","DEN","PHI"],a:["SB_CHAMP"],f:30},
  {n:"Reche Caldwell",t:["SD","NE","WAS"],a:[],f:22},
  {n:"Doug Gabriel",t:["OAK","NE"],a:[],f:18},
  {n:"David Givens",t:["NE","TEN"],a:["SB_CHAMP"],f:32},
  {n:"Ashley Lelie",t:["DEN","ATL","DAL"],a:[],f:22},
  {n:"David Terrell",t:["CHI"],a:[],f:15},
  {n:"Kevin Curtis",t:["STL","PHI"],a:[],f:28},
  {n:"Mark Clayton",t:["BAL","STL"],a:[],f:22},
  {n:"Santana Moss",t:["NYJ","WAS"],a:["PRO_BOWL"],f:48},
  {n:"Darrell Jackson",t:["SEA","SF","DEN"],a:["PRO_BOWL"],f:42},
  {n:"Bobby Engram",t:["CHI","SEA","KC","NE"],a:["PRO_BOWL"],f:38},
  {n:"Donte Stallworth",t:["NO","PHI","NE","CLE","BAL","WAS","MIA"],a:["SB_CHAMP"],f:35},
  {n:"Bethel Johnson",t:["NE","NO"],a:["SB_CHAMP"],f:20},
  {n:"Kelley Washington",t:["CIN","TEN","NE"],a:[],f:18},
  {n:"D.J. Hackett",t:["SEA","CAR"],a:[],f:18},
  {n:"Brandon Lloyd",t:["SF","WAS","CHI","DEN","STL","NE"],a:["PRO_BOWL"],f:45},
  {n:"Derek Hagan",t:["MIA","NYG","BAL"],a:["SB_CHAMP"],f:18},
  {n:"Sam Aiken",t:["BUF","NE","WAS","CAR"],a:["SB_CHAMP"],f:18},
  {n:"Bam Childress",t:["WAS"],a:[],f:12},
  {n:"P.K. Sam",t:["NE","CHI","SF","TEN"],a:[],f:15},
  {n:"James Thrash",t:["PHI","WAS"],a:["SB_CHAMP"],f:18},
  {n:"Kassim Osgood",t:["SD","JAX","DET","SF","NO"],a:[],f:20},
  {n:"Freddie Mitchell",t:["PHI"],a:[],f:20},
  {n:"Todd Pinkston",t:["PHI"],a:[],f:18},
  {n:"Charles Rogers",t:["DET"],a:[],f:18},
  {n:"Roy Williams",t:["DET","DAL","CHI"],a:["PRO_BOWL"],f:52},
  {n:"Nate Burleson",t:["MIN","SEA","DET","SF"],a:[],f:42},
  {n:"Lee Evans",t:["BUF","BAL"],a:["PRO_BOWL"],f:48},
  {n:"Michael Clayton",t:["TB","NYG"],a:["OROY"],f:32},
  {n:"Drew Bennett",t:["TEN","STL"],a:["PRO_BOWL"],f:38},
  {n:"Chris Chambers",t:["MIA","SD","KC"],a:["PRO_BOWL"],f:48},
  {n:"Lamont Jordan",t:["NYJ","OAK","MIA","NE"],a:["PRO_BOWL"],f:38},
  {n:"Keary Colbert",t:["CAR","DEN","SEA"],a:[],f:20},
  {n:"Eric Moulds",t:["BUF","HOU","TEN","NE"],a:["PRO_BOWL"],f:52},
  {n:"Javon Walker",t:["GB","DEN","OAK"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Terry Glenn",t:["NE","GB","DAL"],a:["SB_CHAMP","PRO_BOWL"],f:48},
  {n:"Ed McCaffrey",t:["NYG","SF","DEN"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Rod Smith",t:["DEN"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Marcus Nash",t:["DEN","TEN","MIA"],a:["SB_CHAMP"],f:22},
  {n:"Travis Taylor",t:["BAL","MIN"],a:[],f:25},
  {n:"Justin McCareins",t:["TEN","NYJ"],a:[],f:20},
  {n:"Eddie Kennison",t:["STL","NO","CHI","KC"],a:[],f:30},
  {n:"Kevin Kasper",t:["ARI","CHI"],a:[],f:15},
  {n:"Freddie Jones",t:["ARI","SD","CAR"],a:[],f:20},
  {n:"Marcus Robinson",t:["CHI","BAL","MIN","STL"],a:[],f:30},
  {n:"Marty Booker",t:["CHI","MIA","NO"],a:["PRO_BOWL"],f:42},
  {n:"Chris Baker",t:["NYJ","BUF"],a:[],f:18},
  {n:"Troy Walters",t:["MIN","IND","DEN","ARI","STL","JAX"],a:["SB_CHAMP"],f:22},
  {n:"Ricky Proehl",t:["ARI","CHI","STL","CAR","SEA"],a:["SB_CHAMP"],f:35},
  {n:"Isaac Bruce",t:["STL","SF"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:78},
  {n:"Az-Zahir Hakim",t:["STL","DET","SD","NO"],a:["SB_CHAMP"],f:28},
  {n:"Dez White",t:["CHI","ATL","JAX"],a:[],f:18},
  {n:"Terry Holt",t:["STL","JAX"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:75},
  {n:"Keith Poole",t:["NO","ATL","SD","ARI"],a:[],f:18},
  {n:"Patrick Jeffers",t:["CAR","DAL","DEN"],a:["PRO_BOWL"],f:32},
  {n:"Joe Horn",t:["KC","NO","ATL"],a:["PRO_BOWL"],f:52},
  {n:"Derrick Mason",t:["TEN","BAL","NYJ","HOU"],a:["PRO_BOWL"],f:52},
  {n:"Kevin Johnson",t:["BAL","JAX","NO","CLE","DET"],a:[],f:22},
  {n:"Yancey Thigpen",t:["PIT","TEN"],a:["PRO_BOWL"],f:35},
  {n:"Quinn Early",t:["NO","SD","BUF","NYJ"],a:[],f:25},
  {n:"O.J. McDuffie",t:["MIA"],a:["PRO_BOWL"],f:38},
  {n:"Muhsin Muhammad",t:["CAR","CHI"],a:["PRO_BOWL"],f:60},
  {n:"Patrick Johnson",t:["BAL"],a:[],f:15},
  {n:"Marcus Harris",t:["NO","NYJ"],a:[],f:12},
  {n:"Curtis Conway",t:["CHI","SD","SF","NYJ"],a:["PRO_BOWL"],f:40},
  {n:"Johnnie Morton",t:["DET","KC","SF"],a:["PRO_BOWL"],f:42},
  {n:"Carl Pickens",t:["CIN","TEN"],a:["PRO_BOWL"],f:48},
  {n:"Darnay Scott",t:["CIN","DAL"],a:[],f:28},
  {n:"Keyshawn Johnson",t:["NYJ","TB","DAL","CAR","ATL"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Wayne Chrebet",t:["NYJ"],a:[],f:42},
  {n:"Sean Dawkins",t:["IND","NO","SEA","NE"],a:[],f:22},
  {n:"Marvin Harrison",t:["IND"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Jerome Pathon",t:["IND","NO","SEA"],a:["SB_CHAMP"],f:22},
  {n:"Ike Hilliard",t:["NYG","TB"],a:["SB_CHAMP"],f:30},
  {n:"Amaz Toomer",t:["NYG"],a:["SB_CHAMP","PRO_BOWL"],f:40},
  {n:"Joe Jurevicius",t:["NYG","TB","SEA","CLE"],a:["SB_CHAMP"],f:32},
  {n:"Visanthe Shiancoe",t:["NYG","MIN","TB"],a:["SB_CHAMP","PRO_BOWL"],f:38},
  {n:"Jeremy Shockey",t:["NYG","NO","CAR","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"L.J. Smith",t:["PHI","BAL","NE"],a:[],f:25},
  {n:"Christian Fauria",t:["SEA","NE","WAS","CAR"],a:["SB_CHAMP"],f:22},
  {n:"Dan Graham",t:["NE","DEN"],a:["SB_CHAMP"],f:25},
  {n:"David Martin",t:["GB","MIA"],a:[],f:15},
  {n:"Randy McMichael",t:["MIA","STL","SD"],a:["PRO_BOWL"],f:35},
  {n:"Kyle Brady",t:["NYJ","JAX","NE"],a:[],f:22},
  {n:"Ben Troupe",t:["TEN"],a:[],f:15},
  {n:"Alge Crumpler",t:["ATL","TEN","NE"],a:["PRO_BOWL"],f:48},
  {n:"Jeb Putzier",t:["DEN","HOU","JAX"],a:["SB_CHAMP"],f:20},
  {n:"Nate Lawrie",t:["NYJ","CLE"],a:[],f:12},
  {n:"Todd Heap",t:["BAL","ARI"],a:["PRO_BOWL"],f:52},
  {n:"Benjamin Watson",t:["NE","CLE","NO","BAL"],a:["SB_CHAMP"],f:42},
  {n:"Heath Miller",t:["PIT"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Kellen Winslow II",t:["CLE","TB","SEA","NE"],a:["PRO_BOWL"],f:60},
  {n:"Desmond Clark",t:["DEN","CHI"],a:[],f:25},
  {n:"Marcus Pollard",t:["IND","DET","SEA","ATL"],a:["SB_CHAMP"],f:28},
  {n:"Dallas Clark",t:["IND","TB"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Jake Scott",t:["HOU","IND","SD"],a:[],f:15},
  {n:"Daniel Graham",t:["NE","DEN"],a:["SB_CHAMP"],f:25},
  {n:"Courtney Anderson",t:["OAK","ATL"],a:[],f:15},
  {n:"Tony Scheffler",t:["DEN","DET"],a:[],f:28},
  {n:"Owen Daniels",t:["HOU","DEN","BAL"],a:["SB_CHAMP","PRO_BOWL"],f:38},
  {n:"John Carlson",t:["SEA","MIN"],a:["OROY"],f:30},
  {n:"Chris Cooley",t:["WAS"],a:["PRO_BOWL"],f:45},
  {n:"Bo Scaife",t:["TEN","CIN"],a:[],f:22},
  {n:"David Thomas",t:["NE","NO"],a:["SB_CHAMP"],f:15},
  {n:"Leonard Pope",t:["ARI","KC"],a:[],f:15},
  {n:"Anthony Fasano",t:["DAL","MIA","KC","TEN"],a:[],f:25},
  {n:"Joel Dreessen",t:["NYJ","DEN","HOU"],a:[],f:18},
  {n:"Jermaine Gresham",t:["CIN","ARI"],a:["PRO_BOWL"],f:42},
  {n:"Aaron Hernandez",t:["NE"],a:["SB_CHAMP"],f:45},
  {n:"Lance Kendricks",t:["STL","LAR","GB","NE"],a:["SB_CHAMP"],f:28},
  {n:"Coby Fleener",t:["IND","NO"],a:[],f:32},
  {n:"Dwayne Allen",t:["IND","NE"],a:["SB_CHAMP"],f:35},
  {n:"Michael Hoomanawanui",t:["STL","NE","NO"],a:["SB_CHAMP"],f:18},
  {n:"Tim Wright",t:["TB","NE","DET","CAR"],a:["SB_CHAMP"],f:20},
  {n:"Will Tye",t:["NYG","JAX"],a:[],f:18},
  {n:"Julius Thomas",t:["DEN","JAX","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Jacob Tamme",t:["IND","DEN","ATL"],a:["SB_CHAMP"],f:28},
  {n:"Clay Harbor",t:["PHI","JAX","NE","BUF","CAR"],a:["SB_CHAMP"],f:15},
  {n:"Michael Roberts",t:["DET","WAS"],a:[],f:15},
  {n:"Tyler Eifert",t:["CIN","JAX","NO"],a:["PRO_BOWL"],f:45},
  {n:"Jordan Reed",t:["WAS"],a:["PRO_BOWL"],f:50},
  {n:"CJ Fiedorowicz",t:["HOU"],a:[],f:22},
  {n:"Vance McDonald",t:["SF","PIT"],a:[],f:28},
  {n:"Eric Ebron",t:["DET","IND","PIT"],a:["PRO_BOWL"],f:45},
  {n:"David Njoku",t:["CLE","KC"],a:["PRO_BOWL"],f:48},
  {n:"O.J. Howard",t:["TB","BUF","HOU"],a:["SB_CHAMP"],f:38},
  {n:"Ian Thomas",t:["CAR"],a:[],f:22},
  {n:"Cole Kmet",t:["CHI"],a:["PRO_BOWL"],f:42},
  {n:"Pat Freiermuth",t:["PIT"],a:["PRO_BOWL"],f:45},
  {n:"Kyle Pitts",t:["ATL"],a:["PRO_BOWL","OROY"],f:62},
  {n:"Dalton Schultz",t:["DAL","HOU"],a:["PRO_BOWL"],f:45},
  {n:"Hunter Henry",t:["SD","LAC","NE"],a:["PRO_BOWL"],f:55},
  {n:"Dan Arnold",t:["ARI","CAR","NYJ","JAX","ATL"],a:[],f:22},

  // ── More DL/LB/DB ──
  {n:"La'Roi Glover",t:["OAK","NO","DAL","STL","SF"],a:["PRO_BOWL"],f:55},
  {n:"Shaun Rogers",t:["DET","CLE","NO"],a:["PRO_BOWL"],f:52},
  {n:"Corey Simon",t:["PHI","IND"],a:["SB_CHAMP"],f:38},
  {n:"Kevin Williams",t:["MIN"],a:["PRO_BOWL"],f:58},
  {n:"Tommie Harris",t:["CHI"],a:["PRO_BOWL"],f:50},
  {n:"Marcus Stroud",t:["JAX","BUF"],a:["PRO_BOWL"],f:48},
  {n:"Kris Jenkins",t:["CAR","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Pat Williams",t:["BUF","MIN"],a:["PRO_BOWL"],f:45},
  {n:"Kyle Vanden Bosch",t:["ARI","TEN","DET","KC"],a:["PRO_BOWL"],f:45},
  {n:"Bertrand Berry",t:["IND","HOU","ARI"],a:[],f:32},
  {n:"Patrick Kerney",t:["ATL","SEA"],a:["PRO_BOWL"],f:48},
  {n:"Charles Grant",t:["NO","OAK"],a:["SB_CHAMP"],f:38},
  {n:"Aaron Kampman",t:["GB"],a:["PRO_BOWL"],f:42},
  {n:"Will Smith",t:["NO"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Tamba Hali",t:["KC"],a:["PRO_BOWL"],f:52},
  {n:"Shaun Ellis",t:["NYJ","NE"],a:["PRO_BOWL"],f:48},
  {n:"Jason Babin",t:["HOU","TEN","SEA","PHI","JAX","ATL","NYJ"],a:["PRO_BOWL"],f:42},
  {n:"Antwan Odom",t:["TEN","CIN","SEA"],a:[],f:25},
  {n:"Osi Umenyiora",t:["NYG","ATL"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Justin Tuck",t:["NYG","OAK"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Corey Webster",t:["NYG"],a:["SB_CHAMP"],f:38},
  {n:"Aaron Ross",t:["NYG","JAX"],a:["SB_CHAMP"],f:32},
  {n:"Kevin Boss",t:["NYG","OAK"],a:["SB_CHAMP"],f:28},
  {n:"Rocky Bernard",t:["SEA","NYG"],a:["SB_CHAMP"],f:28},
  {n:"Fred Robbins",t:["MIN","NYG","STL"],a:["SB_CHAMP"],f:30},
  {n:"Antonio Pierce",t:["WAS","NYG"],a:["SB_CHAMP"],f:38},
  {n:"Chase Blackburn",t:["NYG","CAR"],a:["SB_CHAMP"],f:28},
  {n:"Mathias Kiwanuka",t:["NYG"],a:["SB_CHAMP","PRO_BOWL"],f:40},
  {n:"Danny Clark",t:["JAX","OAK","NYG"],a:[],f:22},
  {n:"Kawika Mitchell",t:["BUF","NYG","KC"],a:["SB_CHAMP"],f:28},
  {n:"Nick Collins",t:["GB"],a:["SB_CHAMP","PRO_BOWL"],f:48},
  {n:"Tramon Williams",t:["GB","ARI","CLE"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Sam Shields",t:["GB","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:42},
  {n:"Charles Woodson",t:["OAK","GB"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:90},
  {n:"Morgan Burnett",t:["GB","PIT","CLE"],a:["SB_CHAMP"],f:32},
  {n:"Jarrett Bush",t:["GB","NO"],a:["SB_CHAMP"],f:22},
  {n:"B.J. Raji",t:["GB"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Ryan Pickett",t:["STL","GB"],a:["SB_CHAMP"],f:32},
  {n:"Cullen Jenkins",t:["GB","PHI","NYG","CAR"],a:["SB_CHAMP"],f:32},
  {n:"Howard Green",t:["NO","HOU","JAX","GB","DEN"],a:["SB_CHAMP"],f:18},
  {n:"Anthony Hargrove",t:["TEN","DET","NO","GB","STL"],a:["SB_CHAMP"],f:20},
  {n:"Kenny Clark",t:["GB"],a:["PRO_BOWL"],f:58},
  {n:"Rashan Gary",t:["GB"],a:["PRO_BOWL"],f:60},
  {n:"Jaire Alexander",t:["GB"],a:["PRO_BOWL"],f:65},
  {n:"Eric Stokes",t:["GB"],a:[],f:38},
  {n:"De'Vondre Campbell",t:["ATL","ARI","GB","SF"],a:["PRO_BOWL"],f:50},
  {n:"Quay Walker",t:["GB"],a:[],f:38},
  {n:"Devonte Wyatt",t:["GB"],a:[],f:30},
  {n:"Romeo Doubs",t:["GB"],a:[],f:38},
  {n:"Christian Watson",t:["GB"],a:[],f:40},
  {n:"Dontayvion Wicks",t:["GB"],a:[],f:30},
  {n:"Tucker Kraft",t:["GB"],a:[],f:28},
  {n:"Jayden Reed",t:["GB"],a:["PRO_BOWL"],f:48},

  // ── Covering remaining NFL teams with key players ──
  // Jacksonville Jaguars
  {n:"Fred Taylor",t:["JAX","NE"],a:["PRO_BOWL"],f:58},
  {n:"Jimmy Smith",t:["JAX"],a:["PRO_BOWL"],f:65},
  {n:"Keenan McCardell",t:["CLE","JAX","TB","WAS","SD"],a:["SB_CHAMP","PRO_BOWL"],f:55},
  {n:"Mark Brunell",t:["GB","JAX","WAS","NO","NYJ"],a:["PRO_BOWL"],f:65},
  {n:"Tony Boselli",t:["JAX"],a:["PRO_BOWL"],f:65},
  {n:"Rashean Mathis",t:["JAX","ATL"],a:["PRO_BOWL"],f:62},
  {n:"Paul Posluszny",t:["BUF","JAX"],a:["PRO_BOWL"],f:50},
  {n:"Josh Scobee",t:["JAX","PIT","NO","NE"],a:[],f:35},
  {n:"Justin Blackmon",t:["JAX"],a:[],f:28},
  {n:"Marcedes Lewis",t:["JAX","GB"],a:["PRO_BOWL"],f:48},
  {n:"Roy Miller",t:["TB","JAX","KC"],a:[],f:20},

  // Houston Texans
  {n:"Andre Johnson",t:["HOU","IND","TEN","CLE","DET"],a:["PRO_BOWL","OPOY"],f:82},
  {n:"Arian Foster",t:["HOU","MIA"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:72},
  {n:"Owen Daniels",t:["HOU","DEN","BAL"],a:["SB_CHAMP","PRO_BOWL"],f:38},
  {n:"Mario Williams",t:["HOU","BUF","MIA"],a:["PRO_BOWL","DROY"],f:72},
  {n:"Kareem Jackson",t:["HOU","DEN","LAC"],a:["PRO_BOWL"],f:48},
  {n:"DeAndre Hopkins",t:["HOU","ARI","TEN","NE","BUF"],a:["PRO_BOWL","OPOY"],f:85},
  {n:"Watt J.J.",t:["HOU","ARI"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Johnathan Joseph",t:["CIN","HOU","ARI"],a:["PRO_BOWL"],f:48},
  {n:"Brian Cushing",t:["HOU"],a:["PRO_BOWL","DROY"],f:55},
  {n:"Connor Barwin",t:["HOU","PHI","LAR","NE"],a:["PRO_BOWL"],f:48},
  {n:"Duane Brown",t:["HOU","SEA","NYJ"],a:["PRO_BOWL"],f:55},

  // Cleveland Browns
  {n:"Joe Thomas",t:["CLE"],a:["PRO_BOWL"],f:80},
  {n:"Josh Gordon",t:["CLE","NE","SEA","NYJ"],a:["PRO_BOWL"],f:62},
  {n:"Braylon Edwards",t:["CLE","SF","NYJ","NE","SEA"],a:["PRO_BOWL"],f:55},
  {n:"Kellen Winslow II",t:["CLE","TB","SEA","NE"],a:["PRO_BOWL"],f:60},
  {n:"Phil Dawson",t:["CLE","SF","ARI"],a:["PRO_BOWL"],f:52},
  {n:"Peyton Hillis",t:["DEN","CLE","KC","NYG","TB"],a:["PRO_BOWL"],f:45},
  {n:"Jabaal Sheard",t:["CLE","PIT","NE","IND"],a:[],f:35},
  {n:"Joe Haden",t:["CLE","PIT"],a:["PRO_BOWL"],f:62},
  {n:"T.J. Ward",t:["CLE","DEN","TB"],a:["SB_CHAMP","PRO_BOWL"],f:50},
  {n:"Alex Mack",t:["CLE","ATL","SF"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Travis Benjamin",t:["CLE","SD","LAC","SF"],a:[],f:32},

  // Arizona Cardinals
  {n:"Anquan Boldin",t:["ARI","BAL","SF","DET","BUF","NO"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:72},
  {n:"Larry Fitzgerald",t:["ARI"],a:["PRO_BOWL","OPOY"],f:92},
  {n:"Kurt Warner",t:["STL","NYG","ARI"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:88},
  {n:"Edgerrin James",t:["IND","ARI","SEA","JAX"],a:["PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:85},
  {n:"Michael Adams",t:["NO","ARI","WAS"],a:[],f:20},
  {n:"Adrian Wilson",t:["ARI"],a:["PRO_BOWL"],f:55},
  {n:"Antrel Rolle",t:["ARI","NYG"],a:["SB_CHAMP","PRO_BOWL"],f:48},
  {n:"Bertrand Berry",t:["IND","HOU","ARI"],a:[],f:32},
  {n:"Darnell Dockett",t:["ARI","SF"],a:["PRO_BOWL"],f:52},
  {n:"Patrick Peterson",t:["ARI","MIN","PIT"],a:["PRO_BOWL"],f:80},
  {n:"Tyrann Mathieu",t:["ARI","HOU","KC","NO","NE"],a:["SB_CHAMP","PRO_BOWL"],f:72},

  // Tennessee Titans
  {n:"Steve McNair",t:["TEN","BAL"],a:["NFL_MVP","PRO_BOWL"],f:78},
  {n:"Eddie George",t:["TEN","DAL"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Derrick Mason",t:["TEN","BAL","NYJ","HOU"],a:["PRO_BOWL"],f:52},
  {n:"Chris Johnson",t:["TEN","NYJ","ARI"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:75},
  {n:"Keith Bulluck",t:["TEN"],a:["PRO_BOWL"],f:52},
  {n:"Jevon Kearse",t:["TEN","PHI"],a:["PRO_BOWL","DROY"],f:68},
  {n:"Kevin Dyson",t:["TEN","CAR","HOU"],a:[],f:32},
  {n:"Frank Wycheck",t:["WAS","TEN"],a:[],f:35},
  {n:"Michael Roos",t:["TEN"],a:["PRO_BOWL"],f:40},
  {n:"Kyle Vanden Bosch",t:["ARI","TEN","DET","KC"],a:["PRO_BOWL"],f:45},
  {n:"Cortland Finnegan",t:["TEN","STL","MIA","JAX"],a:["PRO_BOWL"],f:45},

  // Indianapolis Colts  
  {n:"Peyton Manning",t:["IND","DEN"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:98},
  {n:"Marvin Harrison",t:["IND"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Reggie Wayne",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Dallas Clark",t:["IND","TB"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Dwight Freeney",t:["IND","SD","ARI","ATL","SEA"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Robert Mathis",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Gary Brackett",t:["IND"],a:["SB_CHAMP"],f:32},
  {n:"Bob Sanders",t:["IND"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:65},
  {n:"Antoine Bethea",t:["IND","SF","ARI","NO"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Jeff Saturday",t:["IND","GB"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Tarik Glenn",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:38},

  // Carolina Panthers
  {n:"Cam Newton",t:["CAR","NE"],a:["NFL_MVP","PRO_BOWL","OROY","OPOY"],f:82},
  {n:"Steve Smith Sr.",t:["CAR","BAL"],a:["PRO_BOWL","OPOY"],f:85},
  {n:"Julius Peppers",t:["CAR","CHI","GB"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Jake Delhomme",t:["NO","CAR","CLE","HOU"],a:["PRO_BOWL"],f:42},
  {n:"Luke Kuechly",t:["CAR"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Thomas Davis",t:["CAR","LAC","WAS"],a:["PRO_BOWL"],f:65},
  {n:"Ryan Kalil",t:["CAR"],a:["PRO_BOWL"],f:52},
  {n:"Jordan Gross",t:["CAR"],a:["PRO_BOWL"],f:45},
  {n:"Mike Tolbert",t:["SD","CAR","BUF"],a:["PRO_BOWL"],f:40},
  {n:"Jonathan Stewart",t:["CAR","NYG"],a:[],f:50},
  {n:"Greg Olsen",t:["CHI","CAR","SEA"],a:["PRO_BOWL"],f:75},

  // Atlanta Falcons
  {n:"Matt Ryan",t:["ATL","IND"],a:["NFL_MVP","PRO_BOWL","OPOY"],f:75},
  {n:"Julio Jones",t:["ATL","TEN","TB"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Michael Turner",t:["SD","ATL"],a:["PRO_BOWL","RUSH_TITLE"],f:62},
  {n:"Roddy White",t:["ATL"],a:["PRO_BOWL"],f:65},
  {n:"Tony Gonzalez",t:["KC","ATL"],a:["PRO_BOWL"],f:94},
  {n:"John Abraham",t:["NYJ","ATL","ARI"],a:["PRO_BOWL","DPOY"],f:68},
  {n:"Deion Sanders",t:["ATL","SF","DAL","WAS","BAL"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:99},
  {n:"Jamal Anderson",t:["ATL"],a:["PRO_BOWL"],f:52},
  {n:"Warrick Dunn",t:["TB","ATL"],a:["PRO_BOWL"],f:68},
  {n:"Alge Crumpler",t:["ATL","TEN","NE"],a:["PRO_BOWL"],f:48},
  {n:"Todd McClure",t:["ATL"],a:["PRO_BOWL"],f:38},
];

// ─── DAILY PUZZLES ────────────────────────────────────────────────────────────
const PUZZLES = [
  { rows: ["NE","DAL","GB"], cols: ["SB_CHAMP","NFL_MVP","PRO_BOWL"] },
  { rows: ["SF","PIT","DEN"], cols: ["SB_MVP","RUSH_TITLE","DPOY"] },
  { rows: ["BAL","SEA","IND"], cols: ["SB_CHAMP","DPOY","OROY"] },
  { rows: ["NO","NYG","STL"], cols: ["SB_MVP","PRO_BOWL","OPOY"] },
  { rows: ["KC","LAR","TB"], cols: ["SB_CHAMP","NFL_MVP","PASS_TITLE"] },
  { rows: ["MIA","PHI","MIN"], cols: ["PRO_BOWL","RUSH_TITLE","DROY"] },
  { rows: ["ATL","CAR","HOU"], cols: ["NFL_MVP","OPOY","OROY"] },
  { rows: ["ARI","TEN","JAX"], cols: ["SB_CHAMP","PRO_BOWL","DPOY"] },
  { rows: ["CLE","DET","BUF"], cols: ["RUSH_TITLE","PRO_BOWL","DROY"] },
  { rows: ["OAK","WAS","NYJ"], cols: ["SB_CHAMP","DPOY","PRO_BOWL"] },
  { rows: ["CIN","GB","SF"], cols: ["NFL_MVP","SB_CHAMP","RUSH_TITLE"] },
  { rows: ["DEN","BAL","NE"], cols: ["SB_MVP","PRO_BOWL","PASS_TITLE"] },
  { rows: ["SEA","NO","IND"], cols: ["SB_CHAMP","OPOY","OROY"] },
  { rows: ["DAL","PIT","LAR"], cols: ["SB_MVP","NFL_MVP","DPOY"] },
  { rows: ["MIN","TB","KC"], cols: ["PRO_BOWL","RUSH_TITLE","SB_CHAMP"] },
  { rows: ["NYG","PHI","MIA"], cols: ["SB_CHAMP","DROY","PRO_BOWL"] },
  { rows: ["SF","DEN","GB"], cols: ["SB_MVP","NFL_MVP","PASS_TITLE"] },
  { rows: ["BAL","SEA","NE"], cols: ["SB_CHAMP","DPOY","PRO_BOWL"] },
  { rows: ["STL","IND","CAR"], cols: ["SB_CHAMP","NFL_MVP","OPOY"] },
  { rows: ["ATL","JAX","HOU"], cols: ["PRO_BOWL","RUSH_TITLE","OROY"] },
  { rows: ["OAK","WAS","CIN"], cols: ["SB_CHAMP","PRO_BOWL","DROY"] },
  { rows: ["BUF","CLE","DET"], cols: ["RUSH_TITLE","PRO_BOWL","DPOY"] },
  { rows: ["TEN","ARI","NO"], cols: ["NFL_MVP","SB_MVP","OPOY"] },
  { rows: ["NYJ","CHI","TB"], cols: ["SB_CHAMP","PRO_BOWL","DPOY"] },
  { rows: ["GB","KC","SF"], cols: ["SB_MVP","RUSH_TITLE","PASS_TITLE"] },
  { rows: ["LAR","PIT","BAL"], cols: ["SB_CHAMP","NFL_MVP","PRO_BOWL"] },
  { rows: ["MIA","MIN","PHI"], cols: ["DPOY","OROY","DROY"] },
  { rows: ["IND","SEA","DEN"], cols: ["SB_CHAMP","OPOY","RUSH_TITLE"] },
  { rows: ["DAL","NE","NO"], cols: ["SB_MVP","NFL_MVP","PRO_BOWL"] },
  { rows: ["NYG","ATL","CAR"], cols: ["SB_CHAMP","PRO_BOWL","OPOY"] },
];

function getDailyPuzzle() {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return PUZZLES[seed % PUZZLES.length];
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Validate: player played for team OR won award
function isValid(player, criteria) {
  return player.t.includes(criteria) || player.a.includes(criteria);
}

// Get score from fame (lower fame = higher score)
function getScore(fame) {
  return Math.max(5, Math.round(100 - fame));
}

const css = `
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}
`;

export default function GridironGame() {
  const [puzzle] = useState(() => getDailyPuzzle());
  const [cells, setCells] = useState({}); // key "r-c" -> {player, score}
  const [activeCell, setActiveCell] = useState(null); // [r,c]
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [guessesLeft, setGuessesLeft] = useState(9);
  const [shakeCell, setShakeCell] = useState(null);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [copied, setCopied] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const inputRef = useRef(null);

  const rowHeaders = puzzle.rows;
  const colHeaders = puzzle.cols;

  const spawnConfetti = () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 600,
      color: ['#4caf50','#f5a623','#aaaaff','#e94560','#ffd700'][i % 5],
      size: 5 + Math.random() * 8
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 1600);
  };

  const handleCellClick = (r, c) => {
    if (gameOver || won) return;
    const key = `${r}-${c}`;
    if (cells[key]) return; // already filled
    setActiveCell([r, c]);
    setQuery('');
    setSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleQuery = (val) => {
    setQuery(val);
    if (val.length < 2) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    const [r, c] = activeCell || [0, 0];
    const rowCrit = rowHeaders[r];
    const colCrit = colHeaders[c];
    const matches = PLAYERS.filter(p =>
      p.n.toLowerCase().includes(q) &&
      isValid(p, rowCrit) &&
      isValid(p, colCrit)
    ).slice(0, 6);
    setSuggestions(matches);
  };

  const handleSelect = (player) => {
    if (!activeCell) return;
    const [r, c] = activeCell;
    const key = `${r}-${c}`;
    const rowCrit = rowHeaders[r];
    const colCrit = colHeaders[c];

    if (!isValid(player, rowCrit) || !isValid(player, colCrit)) {
      setShakeCell(key);
      setTimeout(() => setShakeCell(null), 500);
      return;
    }

    // Check not already used
    const usedNames = Object.values(cells).map(v => v.player.n);
    if (usedNames.includes(player.n)) {
      setShakeCell(key);
      setTimeout(() => setShakeCell(null), 500);
      return;
    }

    const score = getScore(player.f);
    const newCells = { ...cells, [key]: { player, score } };
    const newScore = totalScore + score;
    const newGuesses = guessesLeft - 1;

    setCells(newCells);
    setTotalScore(newScore);
    setGuessesLeft(newGuesses);
    setActiveCell(null);
    setQuery('');
    setSuggestions([]);

    if (Object.keys(newCells).length === 9) {
      setWon(true);
      spawnConfetti();
    } else if (newGuesses === 0) {
      setGameOver(true);
    }
  };

  const handleShare = async () => {
    const rows = rowHeaders.map(r => TEAMS[r] || r);
    const cols = colHeaders.map(c => AWARDS[c] || c);
    const grid = Array.from({ length: 3 }, (_, r) =>
      Array.from({ length: 3 }, (_, c) => cells[`${r}-${c}`] ? '✅' : '⬜').join('')
    ).join('\n');
    const filled = Object.keys(cells).length;
    const text = `GRIDIRON by Streakle 🏈 — ${formatDate()}\nScore: ${totalScore} | ${filled}/9 cells\n${grid}\n\nPlay at: playstreakle.com/gridiron`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const totalPossible = 9 * 95;

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, paddingBottom: 40, fontFamily: "'Segoe UI', sans-serif", color: '#e0e0e0', position: 'relative', overflow: 'hidden' }}>
      <style>{css}</style>

      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '28%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `confetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <a href="/" style={{ position: 'absolute', left: 16, top: 24, color: '#aaaaff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 2, color: '#fff' }}>GRIDIRON</div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: '#f5a623', textTransform: 'uppercase', marginTop: -4 }}>by Streakle</div>
        </div>
        <button onClick={() => setShowHow(!showHow)} style={{ background: 'none', border: '1px solid #4a4a8a', borderRadius: 6, color: '#aaaaff', cursor: 'pointer', fontSize: 13, padding: '3px 10px', marginLeft: 8 }}>
          How to play
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 8, marginTop: 6 }}>{formatDate()}</div>

      {showHow && (
        <div style={{ background: '#0f1535', border: '1px solid #4a4a8a', borderRadius: 10, padding: 16, maxWidth: 340, marginBottom: 12, fontSize: 13, lineHeight: 1.65, color: '#ccc', animation: 'slideUp 0.3s ease' }}>
          <b style={{ color: '#aaaaff' }}>How to play</b><br />
          Fill the 3×3 grid with NFL players. Each player must satisfy <b>both</b> the row and column criteria.<br /><br />
          Row/column criteria are either an <b>NFL team</b> (player played for that team) or an <b>award</b> (player won that award).<br /><br />
          Each player can only be used <b>once</b>. You have <b>9 guesses</b> total — one per cell.<br /><br />
          🏆 Rarer answers = higher score. Max score: 900.
        </div>
      )}

      {/* Score + guesses */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, fontSize: 14 }}>
        <div style={{ color: '#f5a623', fontWeight: 700 }}>Score: {totalScore}</div>
        <div style={{ color: guessesLeft <= 3 ? '#e94560' : '#aaaaff', fontWeight: 700 }}>
          {won ? 'Complete!' : gameOver ? 'Game over' : `${guessesLeft} guess${guessesLeft !== 1 ? 'es' : ''} left`}
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(3, 110px)', gridTemplateRows: '70px repeat(3, 100px)', gap: 4, padding: '0 12px' }}>
          
          {/* Top-left empty */}
          <div style={{ background: 'transparent' }} />

          {/* Column headers */}
          {colHeaders.map((col, ci) => (
            <div key={ci} style={{
              background: '#0f1535', border: '1px solid #2a2a6a', borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '4px 6px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18 }}>{col === 'SB_CHAMP' ? '🏆' : col === 'SB_MVP' ? '🎖️' : col === 'NFL_MVP' ? '🏅' : col === 'PRO_BOWL' ? '⭐' : col === 'OPOY' ? '🔥' : col === 'DPOY' ? '🛡️' : col === 'RUSH_TITLE' ? '🏃' : col === 'PASS_TITLE' ? '🎯' : col === 'OROY' ? '🌟' : '🔰'}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#aaaaff', lineHeight: 1.2 }}>{AWARDS[col]}</div>
            </div>
          ))}

          {/* Rows */}
          {rowHeaders.map((row, ri) => (
            <>
              {/* Row header */}
              <div key={`row-${ri}`} style={{
                background: '#0f1535', border: '1px solid #2a2a6a', borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '4px 6px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20 }}>🏈</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#f5a623', lineHeight: 1.2 }}>{TEAMS[row]}</div>
              </div>

              {/* Cells */}
              {colHeaders.map((col, ci) => {
                const key = `${ri}-${ci}`;
                const filled = cells[key];
                const isActive = activeCell && activeCell[0] === ri && activeCell[1] === ci;
                const isShaking = shakeCell === key;

                return (
                  <div key={key} onClick={() => handleCellClick(ri, ci)} style={{
                    background: filled ? '#1a3a2a' : isActive ? '#1e2d4a' : '#16213e',
                    border: `2px solid ${filled ? '#4caf50' : isActive ? '#f5a623' : '#0f3460'}`,
                    borderRadius: 8, cursor: filled || gameOver || won ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 6, textAlign: 'center', userSelect: 'none',
                    animation: isShaking ? 'shake 0.45s ease' : filled ? 'cellReveal 0.35s ease' : 'none',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}>
                    {filled ? (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#4caf50', marginBottom: 2 }}>+{filled.score}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{filled.player.n}</div>
                      </>
                    ) : isActive ? (
                      <div style={{ fontSize: 11, color: '#f5a623' }}>Type below ↓</div>
                    ) : (
                      <div style={{ fontSize: 20, opacity: 0.2 }}>?</div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Search input */}
      {activeCell && !won && !gameOver && (
        <div style={{ marginTop: 16, width: '100%', maxWidth: 340, padding: '0 12px', boxSizing: 'border-box', animation: 'slideUp 0.3s ease' }}>
          <div style={{ fontSize: 12, color: '#6666aa', marginBottom: 6, textAlign: 'center' }}>
            {TEAMS[rowHeaders[activeCell[0]]]} × {AWARDS[colHeaders[activeCell[1]]]}
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="Search NFL player..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#16213e', border: '2px solid #f5a623', borderRadius: 8,
              color: '#fff', fontSize: 15, padding: '10px 14px', outline: 'none',
            }}
          />
          {suggestions.length > 0 && (
            <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
              {suggestions.map((p, i) => (
                <div key={i} onClick={() => handleSelect(p)} style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                  borderBottom: i < suggestions.length - 1 ? '1px solid #0f3460' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseOver={e => e.currentTarget.style.background = '#1e2d4a'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{p.n}</span>
                  <span style={{ color: '#f5a623', fontSize: 11, fontWeight: 700 }}>+{getScore(p.f)}</span>
                </div>
              ))}
            </div>
          )}
          {query.length >= 2 && suggestions.length === 0 && (
            <div style={{ color: '#e94560', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              No matching player found for this cell
            </div>
          )}
          <button onClick={() => { setActiveCell(null); setQuery(''); setSuggestions([]); }} style={{
            marginTop: 8, background: 'none', border: '1px solid #4a4a8a', borderRadius: 6,
            color: '#aaaaff', cursor: 'pointer', fontSize: 12, padding: '4px 12px', width: '100%',
          }}>Cancel</button>
        </div>
      )}

      {/* Win/Game over */}
      {(won || gameOver) && (
        <div style={{ textAlign: 'center', marginTop: 20, animation: 'slideUp 0.5s ease' }}>
          {won && <div style={{ fontSize: 22, fontWeight: 700, color: '#4caf50', marginBottom: 6 }}>🎉 Board Complete!</div>}
          {gameOver && !won && <div style={{ fontSize: 20, fontWeight: 700, color: '#e94560', marginBottom: 6 }}>Game Over!</div>}
          <div style={{ fontSize: 16, color: '#f5a623', fontWeight: 700, marginBottom: 4 }}>
            Final Score: {totalScore} / {totalPossible}
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
            {Object.keys(cells).length}/9 cells filled
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={handleShare} style={{ background: '#4a4a8a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#6666bb'}
              onMouseOut={e => e.currentTarget.style.background = '#4a4a8a'}>
              📋 Share result
            </button>
            {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'copied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 12, color: '#4a4a8a', textAlign: 'center' }}>
        <a href="/privacy" style={{ color: '#4a4a8a', textDecoration: 'none' }}>Privacy Policy / Politique de confidentialité</a>
      </div>
    </div>
  );
}