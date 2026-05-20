import React, { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';

const TEAMS = {
  ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",
  CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",
  DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",
  KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",
  MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",
  PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",STL:"Rams",
  TB:"Buccaneers",TEN:"Titans",WAS:"Commanders",OAK:"Raiders",SD:"Chargers",
};

const AWARDS = {
  SB_CHAMP:"Super Bowl Champ",SB_MVP:"Super Bowl MVP",NFL_MVP:"NFL MVP",
  PRO_BOWL:"Pro Bowl",OPOY:"Offensive POY",DPOY:"Defensive POY",
  RUSH_TITLE:"Rushing Title",PASS_TITLE:"Passing Title",
  OROY:"Offensive ROY",DROY:"Defensive ROY",
};

const AWARD_BADGE = {
  SB_CHAMP:"SB",SB_MVP:"SB MVP",NFL_MVP:"MVP",PRO_BOWL:"PRO",
  OPOY:"OPOY",DPOY:"DPOY",RUSH_TITLE:"RUSH",PASS_TITLE:"PASS",
  OROY:"OROY",DROY:"DROY",
};

const NFL_LOGO = {
  ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',
  CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',
  DET:'det',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',
  KC:'kc',LAC:'lac',LAR:'lar',LV:'lv',MIA:'mia',
  MIN:'min',NE:'ne',NO:'no',NYG:'nyg',NYJ:'nyj',
  PHI:'phi',PIT:'pit',SEA:'sea',SF:'sf',STL:'stl',
  TB:'tb',TEN:'ten',WAS:'wsh',OAK:'oak',SD:'sd',
};

const PLAYERS = [
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
  {n:"Alex Smith",t:["SF","KC","WAS"],a:["PRO_BOWL"],f:65},
  {n:"Carson Palmer",t:["CIN","OAK","ARI"],a:["PRO_BOWL"],f:68},
  {n:"Andy Dalton",t:["CIN","DAL","CHI","NYG","BAL","CAR"],a:["PRO_BOWL"],f:60},
  {n:"Ryan Tannehill",t:["MIA","TEN"],a:["PRO_BOWL"],f:62},
  {n:"Jimmy Garoppolo",t:["NE","SF","LV"],a:[],f:52},
  {n:"Nick Foles",t:["PHI","STL","JAX","KC","CHI","IND"],a:["SB_CHAMP","SB_MVP"],f:55},
  {n:"Derek Carr",t:["OAK","LV","NO","ATL"],a:["PRO_BOWL"],f:62},
  {n:"Kyler Murray",t:["ARI"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Trevor Lawrence",t:["JAX"],a:["PRO_BOWL"],f:72},
  {n:"Tua Tagovailoa",t:["MIA"],a:["PRO_BOWL"],f:68},
  {n:"Baker Mayfield",t:["CLE","CAR","LAR","TB"],a:["SB_CHAMP"],f:58},
  {n:"Deshaun Watson",t:["HOU","CLE"],a:["PRO_BOWL"],f:65},
  {n:"C.J. Stroud",t:["HOU"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Vince Young",t:["TEN","PHI","GB"],a:["PRO_BOWL","OROY"],f:55},
  {n:"Sam Bradford",t:["STL","PHI","MIN","ARI"],a:["OROY"],f:48},
  {n:"Matt Hasselbeck",t:["GB","SEA","TEN","IND"],a:["PRO_BOWL"],f:65},
  {n:"Brad Johnson",t:["MIN","WAS","TB","DAL","NYJ","ATL"],a:["SB_CHAMP","SB_MVP"],f:48},
  {n:"Trent Dilfer",t:["TB","BAL","SEA","CLE","SF"],a:["SB_CHAMP","SB_MVP"],f:45},
  {n:"Mark Brunell",t:["GB","JAX","WAS","NO","NYJ"],a:["PRO_BOWL"],f:65},
  {n:"Kordell Stewart",t:["PIT","CHI","BAL"],a:["PRO_BOWL"],f:62},
  {n:"Jeff Garcia",t:["SF","CLE","DET","PHI","TB","OAK"],a:["PRO_BOWL"],f:52},
  {n:"Ryan Fitzpatrick",t:["TEN","CIN","BUF","NYJ","HOU","MIA","TB","WAS","PHI"],a:[],f:52},
  {n:"Josh McCown",t:["ARI","DET","OAK","CHI","TB","MIA","CAR","MIN","PHI","NYJ","HOU","CLE"],a:[],f:35},
  {n:"Geno Smith",t:["NYJ","NYG","LAC","SEA","GB"],a:["PRO_BOWL"],f:48},
  {n:"Case Keenum",t:["HOU","STL","MIA","MIN","DEN","WAS","CLE","BUF"],a:[],f:38},
  {n:"Brock Osweiler",t:["DEN","HOU","CLE","MIA"],a:["SB_CHAMP"],f:35},
  // RBs
  {n:"Emmitt Smith",t:["DAL","ARI"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:99},
  {n:"Barry Sanders",t:["DET"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:99},
  {n:"Adrian Peterson",t:["MIN","NO","ARI","WAS","DET","TEN"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:95},
  {n:"LaDainian Tomlinson",t:["SD","NYJ"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:96},
  {n:"Marshall Faulk",t:["IND","STL"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","OPOY","OROY"],f:94},
  {n:"Jerome Bettis",t:["STL","PIT"],a:["SB_CHAMP","PRO_BOWL"],f:88},
  {n:"Curtis Martin",t:["NE","NYJ"],a:["PRO_BOWL","RUSH_TITLE","OROY"],f:82},
  {n:"Edgerrin James",t:["IND","ARI","SEA","JAX"],a:["PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:85},
  {n:"Ricky Williams",t:["NO","MIA","BAL","HOU"],a:["RUSH_TITLE"],f:68},
  {n:"Priest Holmes",t:["BAL","KC"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Jamal Lewis",t:["BAL","CLE"],a:["SB_CHAMP","PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Shaun Alexander",t:["SEA","WAS"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Chris Johnson",t:["TEN","NYJ","ARI"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:75},
  {n:"Frank Gore",t:["SF","IND","MIA","BUF","NYJ"],a:["PRO_BOWL"],f:78},
  {n:"Steven Jackson",t:["STL","ATL","NE"],a:["PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Arian Foster",t:["HOU","MIA"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:72},
  {n:"Ray Rice",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Matt Forte",t:["CHI","NYJ"],a:["PRO_BOWL"],f:72},
  {n:"Maurice Jones-Drew",t:["JAX","OAK"],a:["PRO_BOWL","RUSH_TITLE"],f:68},
  {n:"Marshawn Lynch",t:["BUF","SEA","OAK"],a:["SB_CHAMP","PRO_BOWL","RUSH_TITLE"],f:88},
  {n:"Doug Martin",t:["TB","OAK"],a:["PRO_BOWL","RUSH_TITLE"],f:58},
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
  {n:"Joe Mixon",t:["CIN","HOU"],a:["PRO_BOWL"],f:68},
  {n:"Aaron Jones",t:["GB","MIN"],a:["PRO_BOWL"],f:65},
  {n:"James Conner",t:["PIT","ARI"],a:["PRO_BOWL"],f:58},
  {n:"Breece Hall",t:["NYJ"],a:["PRO_BOWL"],f:62},
  {n:"Bijan Robinson",t:["ATL"],a:["PRO_BOWL","OROY"],f:68},
  {n:"De'Von Achane",t:["MIA"],a:["PRO_BOWL"],f:65},
  {n:"Reggie Bush",t:["NO","MIA","DET","SF","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Corey Dillon",t:["CIN","NE"],a:["SB_CHAMP"],f:58},
  {n:"Willis McGahee",t:["BUF","BAL","DEN","CLE","MIA"],a:["PRO_BOWL"],f:55},
  {n:"Thomas Jones",t:["ARI","TB","CHI","NYJ","KC"],a:[],f:45},
  {n:"Larry Johnson",t:["KC","CIN","WAS","MIA"],a:["PRO_BOWL","RUSH_TITLE"],f:58},
  {n:"Clinton Portis",t:["DEN","WAS"],a:["PRO_BOWL"],f:68},
  {n:"Tiki Barber",t:["NYG"],a:["PRO_BOWL"],f:75},
  {n:"Brian Westbrook",t:["PHI","SF"],a:["PRO_BOWL"],f:72},
  {n:"Warrick Dunn",t:["TB","ATL"],a:["PRO_BOWL"],f:68},
  {n:"DeAngelo Williams",t:["CAR","PIT"],a:["PRO_BOWL"],f:58},
  {n:"Darren McFadden",t:["OAK","DAL","NE"],a:["PRO_BOWL","OROY"],f:62},
  {n:"Darren Sproles",t:["SD","NO","PHI"],a:["PRO_BOWL"],f:65},
  {n:"James White",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Jamaal Charles",t:["KC","DEN","CHI"],a:["PRO_BOWL"],f:72},
  {n:"David Johnson",t:["ARI","HOU"],a:["PRO_BOWL","OPOY"],f:68},
  {n:"Devonta Freeman",t:["ATL","NYG"],a:["PRO_BOWL"],f:55},
  {n:"Latavius Murray",t:["OAK","MIN","NO","BAL","DEN"],a:[],f:42},
  {n:"Jordan Howard",t:["CHI","PHI","MIA","NO"],a:["PRO_BOWL"],f:45},
  {n:"LeGarrette Blount",t:["TB","TEN","PIT","NE","PHI","DET"],a:["SB_CHAMP"],f:48},
  {n:"Dion Lewis",t:["PHI","CLE","NE","TEN"],a:["SB_CHAMP"],f:42},
  {n:"C.J. Spiller",t:["BUF","NO","NYJ","SEA","KC"],a:["PRO_BOWL"],f:52},
  {n:"Phillip Lindsay",t:["DEN","HOU","IND"],a:["PRO_BOWL"],f:42},
  {n:"Kenyan Drake",t:["MIA","ARI","LV","BAL"],a:[],f:40},
  {n:"Tony Pollard",t:["DAL","TEN"],a:["PRO_BOWL"],f:65},
  {n:"David Montgomery",t:["CHI","DET"],a:[],f:55},
  {n:"Miles Sanders",t:["PHI","CAR"],a:[],f:52},
  {n:"Peyton Barber",t:["TB","WAS","LV"],a:[],f:25},
  // WRs
  {n:"Jerry Rice",t:["SF","OAK","SEA"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY"],f:99},
  {n:"Randy Moss",t:["MIN","OAK","NE","TEN","SF"],a:["PRO_BOWL","OPOY","OROY"],f:97},
  {n:"Terrell Owens",t:["SF","PHI","DAL","BUF","CIN"],a:["PRO_BOWL","OPOY"],f:90},
  {n:"Larry Fitzgerald",t:["ARI"],a:["PRO_BOWL","OPOY"],f:92},
  {n:"Calvin Johnson",t:["DET"],a:["PRO_BOWL","OPOY"],f:94},
  {n:"Steve Smith Sr.",t:["CAR","BAL"],a:["PRO_BOWL","OPOY"],f:85},
  {n:"Andre Johnson",t:["HOU","IND","TEN","CLE","DET"],a:["PRO_BOWL","OPOY"],f:82},
  {n:"Marvin Harrison",t:["IND"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Hines Ward",t:["PIT"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:80},
  {n:"Reggie Wayne",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Torry Holt",t:["STL","JAX"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:78},
  {n:"Isaac Bruce",t:["STL","SF"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:78},
  {n:"Wes Welker",t:["MIA","NE","DEN","STL"],a:["SB_CHAMP","PRO_BOWL"],f:80},
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
  {n:"Brandin Cooks",t:["NO","NE","LAR","HOU","DAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Emmanuel Sanders",t:["PIT","DEN","SF","NO","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"T.Y. Hilton",t:["IND"],a:["PRO_BOWL"],f:70},
  {n:"Demaryius Thomas",t:["DEN","HOU","NYJ","NE"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Victor Cruz",t:["NYG"],a:["PRO_BOWL"],f:65},
  {n:"Julian Edelman",t:["NE"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:80},
  {n:"Anquan Boldin",t:["ARI","BAL","SF","DET","BUF","NO"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:72},
  {n:"Mike Wallace",t:["PIT","MIA","MIN","BAL","PHI","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Golden Tate",t:["SEA","DET","PHI","NYG","SF"],a:[],f:58},
  {n:"Vincent Jackson",t:["SD","TB"],a:["PRO_BOWL"],f:65},
  {n:"Plaxico Burress",t:["PIT","NYG","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Keyshawn Johnson",t:["NYJ","TB","DAL","CAR","ATL"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Santana Moss",t:["NYJ","WAS"],a:["PRO_BOWL"],f:48},
  {n:"Muhsin Muhammad",t:["CAR","CHI"],a:["PRO_BOWL"],f:60},
  {n:"Deion Branch",t:["NE","SEA"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:52},
  {n:"Diontae Johnson",t:["PIT","CAR","BAL"],a:["PRO_BOWL"],f:62},
  {n:"Jayden Reed",t:["GB"],a:["PRO_BOWL"],f:48},
  // TEs
  {n:"Rob Gronkowski",t:["NE","TB"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:95},
  {n:"Travis Kelce",t:["KC"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:97},
  {n:"Tony Gonzalez",t:["KC","ATL"],a:["PRO_BOWL"],f:94},
  {n:"Jason Witten",t:["DAL","LV","MIA"],a:["PRO_BOWL"],f:85},
  {n:"Greg Olsen",t:["CHI","CAR","SEA"],a:["PRO_BOWL"],f:75},
  {n:"Jimmy Graham",t:["NO","SEA","GB","CHI"],a:["PRO_BOWL"],f:80},
  {n:"Vernon Davis",t:["SF","DEN","WAS"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Zach Ertz",t:["PHI","ARI"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"George Kittle",t:["SF"],a:["PRO_BOWL","OPOY"],f:88},
  {n:"Mark Andrews",t:["BAL"],a:["PRO_BOWL"],f:80},
  {n:"Antonio Gates",t:["SD","LAC"],a:["PRO_BOWL"],f:82},
  {n:"Dallas Clark",t:["IND","TB"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Todd Heap",t:["BAL","ARI"],a:["PRO_BOWL"],f:52},
  {n:"Jeremy Shockey",t:["NYG","NO","CAR","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Alge Crumpler",t:["ATL","TEN","NE"],a:["PRO_BOWL"],f:48},
  {n:"Benjamin Watson",t:["NE","CLE","NO","BAL"],a:["SB_CHAMP"],f:42},
  {n:"Heath Miller",t:["PIT"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Owen Daniels",t:["HOU","DEN","BAL"],a:["SB_CHAMP","PRO_BOWL"],f:38},
  {n:"Julius Thomas",t:["DEN","JAX","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:45},
  {n:"Tyler Eifert",t:["CIN","JAX","NO"],a:["PRO_BOWL"],f:45},
  {n:"Jordan Reed",t:["WAS"],a:["PRO_BOWL"],f:50},
  {n:"Eric Ebron",t:["DET","IND","PIT"],a:["PRO_BOWL"],f:45},
  {n:"David Njoku",t:["CLE","KC"],a:["PRO_BOWL"],f:48},
  {n:"Kyle Pitts",t:["ATL"],a:["PRO_BOWL","OROY"],f:62},
  {n:"Pat Freiermuth",t:["PIT"],a:["PRO_BOWL"],f:45},
  {n:"Cole Kmet",t:["CHI"],a:["PRO_BOWL"],f:42},
  {n:"Sam LaPorta",t:["DET"],a:["PRO_BOWL","OROY"],f:58},
  {n:"Brock Bowers",t:["LV"],a:["OROY"],f:62},
  {n:"Hunter Henry",t:["SD","LAC","NE"],a:["PRO_BOWL"],f:55},
  {n:"Darren Waller",t:["BAL","OAK","LV","NYG"],a:["PRO_BOWL"],f:65},
  // OL
  {n:"Jonathan Ogden",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Walter Jones",t:["SEA"],a:["PRO_BOWL"],f:75},
  {n:"Orlando Pace",t:["STL","CHI"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Joe Thomas",t:["CLE"],a:["PRO_BOWL"],f:80},
  {n:"Trent Williams",t:["WAS","SF"],a:["PRO_BOWL"],f:78},
  {n:"Zack Martin",t:["DAL"],a:["PRO_BOWL"],f:75},
  {n:"Quenton Nelson",t:["IND"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Tyron Smith",t:["DAL"],a:["PRO_BOWL"],f:72},
  {n:"David Bakhtiari",t:["GB"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Lane Johnson",t:["PHI"],a:["SB_CHAMP","PRO_BOWL"],f:70},
  {n:"Andrew Whitworth",t:["CIN","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Marshal Yanda",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Maurkice Pouncey",t:["PIT"],a:["PRO_BOWL"],f:62},
  {n:"Alex Mack",t:["CLE","ATL","SF"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Laremy Tunsil",t:["MIA","HOU"],a:["PRO_BOWL"],f:65},
  // DL/Edge
  {n:"Reggie White",t:["PHI","GB","CAR"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:99},
  {n:"Bruce Smith",t:["BUF","WAS"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Michael Strahan",t:["NYG"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:88},
  {n:"Warren Sapp",t:["TB","OAK"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Aaron Donald",t:["STL","LAR"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:97},
  {n:"J.J. Watt",t:["HOU","ARI"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Khalil Mack",t:["OAK","CHI","LAC"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Von Miller",t:["DEN","LAR","BUF"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","DPOY"],f:88},
  {n:"Myles Garrett",t:["CLE"],a:["PRO_BOWL","DPOY"],f:85},
  {n:"Micah Parsons",t:["DAL"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Nick Bosa",t:["SF"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"T.J. Watt",t:["PIT"],a:["PRO_BOWL","DPOY"],f:88},
  {n:"Chris Jones",t:["KC"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Dwight Freeney",t:["IND","SD","ARI","ATL","SEA"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Julius Peppers",t:["CAR","CHI","GB"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Jared Allen",t:["KC","MIN","CHI","CAR"],a:["PRO_BOWL"],f:80},
  {n:"Jason Taylor",t:["MIA","WAS","NYJ"],a:["PRO_BOWL","DPOY"],f:82},
  {n:"DeMarcus Ware",t:["DAL","DEN"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Terrell Suggs",t:["BAL","ARI","KC"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:80},
  {n:"James Harrison",t:["PIT","CIN","NE"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:78},
  {n:"Ndamukong Suh",t:["DET","MIA","LAR","TB","PHI"],a:["SB_CHAMP","PRO_BOWL","DROY"],f:80},
  {n:"Geno Atkins",t:["CIN"],a:["PRO_BOWL"],f:70},
  {n:"Gerald McCoy",t:["TB","CAR","BAL"],a:["PRO_BOWL"],f:72},
  {n:"Cameron Jordan",t:["NO"],a:["PRO_BOWL"],f:78},
  {n:"Calais Campbell",t:["ARI","JAX","BAL","ATL","MIA"],a:["PRO_BOWL"],f:70},
  {n:"Maxx Crosby",t:["OAK","LV"],a:["PRO_BOWL"],f:75},
  {n:"Aidan Hutchinson",t:["DET"],a:["PRO_BOWL"],f:72},
  {n:"Richard Seymour",t:["NE","OAK"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Osi Umenyiora",t:["NYG","ATL"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Justin Tuck",t:["NYG","OAK"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Michael Bennett",t:["SEA","PHI","NE","DAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Carlos Dunlap",t:["CIN","SEA","KC"],a:["PRO_BOWL"],f:58},
  {n:"Frank Clark",t:["SEA","KC","DEN"],a:["SB_CHAMP"],f:55},
  {n:"DeForest Buckner",t:["SF","IND"],a:["PRO_BOWL"],f:68},
  {n:"Leonard Williams",t:["NYJ","NYG","SEA"],a:["PRO_BOWL"],f:65},
  {n:"Rashan Gary",t:["GB"],a:["PRO_BOWL"],f:60},
  // LBs
  {n:"Lawrence Taylor",t:["NYG"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","DPOY"],f:99},
  {n:"Ray Lewis",t:["BAL"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","DPOY"],f:99},
  {n:"Brian Urlacher",t:["CHI"],a:["PRO_BOWL","DPOY","DROY"],f:90},
  {n:"Derrick Brooks",t:["TB"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Junior Seau",t:["SD","MIA","NE"],a:["PRO_BOWL"],f:90},
  {n:"Patrick Willis",t:["SF"],a:["PRO_BOWL","DPOY","DROY"],f:82},
  {n:"Clay Matthews",t:["GB","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:80},
  {n:"Luke Kuechly",t:["CAR"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Bobby Wagner",t:["SEA","LAR","WAS"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Fred Warner",t:["SF"],a:["PRO_BOWL","DPOY"],f:72},
  {n:"Darius Leonard",t:["IND"],a:["PRO_BOWL","DPOY","DROY"],f:68},
  {n:"Roquan Smith",t:["CHI","BAL"],a:["PRO_BOWL"],f:72},
  {n:"Dont'a Hightower",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Lavonte David",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"C.J. Mosley",t:["BAL","NYJ"],a:["PRO_BOWL","DROY"],f:65},
  {n:"Elvis Dumervil",t:["DEN","BAL","SF","NO"],a:["PRO_BOWL"],f:65},
  {n:"Zach Thomas",t:["MIA","DAL","KC"],a:["PRO_BOWL"],f:80},
  {n:"Demario Davis",t:["NYJ","CLE","NO"],a:["PRO_BOWL"],f:62},
  {n:"Jordan Hicks",t:["PHI","ARI","MIN"],a:[],f:45},
  {n:"Tamba Hali",t:["KC"],a:["PRO_BOWL"],f:52},
  {n:"Thomas Davis",t:["CAR","LAC","WAS"],a:["PRO_BOWL"],f:65},
  // DBs
  {n:"Deion Sanders",t:["ATL","SF","DAL","WAS","BAL"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:99},
  {n:"Rod Woodson",t:["PIT","SF","BAL","OAK"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:95},
  {n:"Charles Woodson",t:["OAK","GB"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:90},
  {n:"Champ Bailey",t:["WAS","DEN"],a:["PRO_BOWL"],f:88},
  {n:"Ed Reed",t:["BAL","HOU","NYJ"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Troy Polamalu",t:["PIT"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Darrelle Revis",t:["NYJ","TB","NE","PIT","KC"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Patrick Peterson",t:["ARI","MIN","PIT"],a:["PRO_BOWL"],f:80},
  {n:"Richard Sherman",t:["SEA","SF"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:82},
  {n:"Earl Thomas",t:["SEA","BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Kam Chancellor",t:["SEA"],a:["SB_CHAMP","PRO_BOWL"],f:75},
  {n:"Jalen Ramsey",t:["JAX","LAR","MIA"],a:["PRO_BOWL"],f:80},
  {n:"Stephon Gilmore",t:["BUF","NE","CAR","IND","DAL"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:72},
  {n:"Minkah Fitzpatrick",t:["MIA","PIT"],a:["PRO_BOWL"],f:72},
  {n:"Tyrann Mathieu",t:["ARI","HOU","KC","NO","NE"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Harrison Smith",t:["MIN"],a:["PRO_BOWL"],f:70},
  {n:"Marshon Lattimore",t:["NO"],a:["PRO_BOWL","DROY"],f:70},
  {n:"Sauce Gardner",t:["NYJ"],a:["PRO_BOWL","DROY"],f:72},
  {n:"Trevon Diggs",t:["DAL"],a:["PRO_BOWL"],f:70},
  {n:"Darius Slay",t:["DET","PHI"],a:["PRO_BOWL"],f:68},
  {n:"Marlon Humphrey",t:["BAL"],a:["PRO_BOWL"],f:65},
  {n:"Kyle Hamilton",t:["BAL"],a:["PRO_BOWL"],f:68},
  {n:"Antoine Winfield Jr.",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Aqib Talib",t:["TB","NE","DEN","LAR","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Devin McCourty",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Malcolm Butler",t:["NE","TEN"],a:["SB_CHAMP"],f:62},
  {n:"Eric Berry",t:["KC","TEN"],a:["PRO_BOWL","DROY"],f:72},
  {n:"Xavien Howard",t:["MIA"],a:["PRO_BOWL"],f:68},
  {n:"Derwin James",t:["LAC"],a:["PRO_BOWL"],f:68},
  {n:"Budda Baker",t:["ARI"],a:["PRO_BOWL"],f:65},
  {n:"Kevin Byard",t:["TEN","PHI"],a:["PRO_BOWL"],f:62},
  {n:"Jordan Poyer",t:["CLE","BUF","MIA"],a:["PRO_BOWL"],f:60},
  {n:"Micah Hyde",t:["GB","BUF"],a:["PRO_BOWL"],f:60},
  {n:"Devon Witherspoon",t:["SEA"],a:["DROY"],f:55},
  {n:"Devin Hester",t:["CHI","ATL","BAL","SEA","NO"],a:["PRO_BOWL"],f:75},
  // Additional SB-only roster players
  {n:"Danny Amendola",t:["STL","NE","MIA","DET","HOU"],a:["SB_CHAMP"],f:52},
  {n:"David Givens",t:["NE","TEN"],a:["SB_CHAMP"],f:32},
  {n:"David Patten",t:["NYG","NE","WAS","NO"],a:["SB_CHAMP"],f:35},
  {n:"Troy Brown",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:42},
  {n:"Kevin Faulk",t:["NE"],a:["SB_CHAMP"],f:42},
  {n:"Matt Cassel",t:["NE","KC","MIN","BUF","DAL","TEN","CHI"],a:["SB_CHAMP"],f:42},
  {n:"Donte Stallworth",t:["NO","PHI","NE","CLE","BAL","WAS","MIA"],a:["SB_CHAMP"],f:35},
  {n:"BenJarvus Green-Ellis",t:["NE","CIN"],a:["SB_CHAMP"],f:38},
  {n:"Stevan Ridley",t:["NE","NYJ","STL"],a:["SB_CHAMP"],f:35},
  {n:"Rex Burkhead",t:["CIN","NE","HOU"],a:["SB_CHAMP"],f:38},
  {n:"Chris Hogan",t:["BUF","NE","CAR","NYJ"],a:["SB_CHAMP"],f:38},
  {n:"Martellus Bennett",t:["DAL","NYG","CHI","NE","GB","BAL"],a:["SB_CHAMP"],f:55},
  {n:"Aaron Hernandez",t:["NE"],a:["SB_CHAMP"],f:45},
  {n:"Rob Ninkovich",t:["NO","MIA","NE"],a:["SB_CHAMP"],f:40},
  {n:"Patrick Chung",t:["NE","PHI"],a:["SB_CHAMP"],f:45},
  {n:"Duron Harmon",t:["NE","DET","ATL"],a:["SB_CHAMP"],f:40},
  {n:"Brandon Spikes",t:["NE","BUF"],a:["SB_CHAMP"],f:35},
  {n:"Jerod Mayo",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Vince Wilfork",t:["NE","HOU"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Logan Mankins",t:["NE","TB"],a:["SB_CHAMP","PRO_BOWL"],f:60},
  {n:"Dan Koppen",t:["NE","DEN","CAR"],a:["SB_CHAMP"],f:35},
  {n:"Matt Light",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Chase Daniel",t:["NO","KC","PHI","CHI","DET","LAC"],a:["SB_CHAMP"],f:32},
  {n:"Justin Tucker",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Harrison Butker",t:["KC"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Sebastian Janikowski",t:["OAK","SEA"],a:["PRO_BOWL"],f:62},
  {n:"Matt Prater",t:["DEN","DET","ARI","LAC"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Robbie Gould",t:["CHI","NYG","SF"],a:["PRO_BOWL"],f:62},
  {n:"Greg Zuerlein",t:["STL","LAR","DAL","NYG"],a:["SB_CHAMP","PRO_BOWL"],f:55},
  {n:"Younghoe Koo",t:["LAC","ATL"],a:["PRO_BOWL"],f:55},
  {n:"Evan McPherson",t:["CIN"],a:["PRO_BOWL"],f:55},
  {n:"Graham Gano",t:["WAS","CAR","NYG"],a:["PRO_BOWL"],f:55},
];

const PUZZLES = [
  { rows: ["NE","DAL","NFL_MVP"],       cols: ["SB_CHAMP","GB","PRO_BOWL"] },
  { rows: ["SF","SB_MVP","DEN"],        cols: ["PIT","RUSH_TITLE","DPOY"] },
  { rows: ["BAL","SEA","DPOY"],         cols: ["SB_CHAMP","IND","OROY"] },
  { rows: ["NO","SB_CHAMP","STL"],      cols: ["NYG","PRO_BOWL","OPOY"] },
  { rows: ["KC","NFL_MVP","TB"],        cols: ["LAR","SB_MVP","PASS_TITLE"] },
  { rows: ["MIA","RUSH_TITLE","MIN"],   cols: ["PHI","PRO_BOWL","DROY"] },
  { rows: ["ATL","CAR","OPOY"],         cols: ["NFL_MVP","HOU","OROY"] },
  { rows: ["ARI","TEN","SB_CHAMP"],     cols: ["JAX","PRO_BOWL","DPOY"] },
  { rows: ["CLE","DROY","BUF"],         cols: ["RUSH_TITLE","DET","PRO_BOWL"] },
  { rows: ["OAK","WAS","SB_MVP"],       cols: ["NYJ","DPOY","PRO_BOWL"] },
  { rows: ["CIN","PASS_TITLE","SF"],    cols: ["NFL_MVP","GB","RUSH_TITLE"] },
  { rows: ["DEN","SB_MVP","NE"],        cols: ["BAL","PRO_BOWL","PASS_TITLE"] },
  { rows: ["SEA","OPOY","IND"],         cols: ["SB_CHAMP","NO","OROY"] },
  { rows: ["DAL","SB_MVP","LAR"],       cols: ["PIT","NFL_MVP","DPOY"] },
  { rows: ["MIN","TB","RUSH_TITLE"],    cols: ["PRO_BOWL","KC","SB_CHAMP"] },
  { rows: ["NYG","DROY","MIA"],         cols: ["PHI","SB_CHAMP","PRO_BOWL"] },
  { rows: ["SF","NFL_MVP","GB"],        cols: ["SB_MVP","DEN","PASS_TITLE"] },
  { rows: ["BAL","DPOY","NE"],          cols: ["SB_CHAMP","SEA","PRO_BOWL"] },
  { rows: ["STL","IND","NFL_MVP"],      cols: ["SB_CHAMP","CAR","OPOY"] },
  { rows: ["ATL","OROY","HOU"],         cols: ["PRO_BOWL","JAX","RUSH_TITLE"] },
  { rows: ["OAK","WAS","PRO_BOWL"],     cols: ["SB_CHAMP","CIN","DROY"] },
  { rows: ["BUF","DPOY","DET"],         cols: ["RUSH_TITLE","CLE","PRO_BOWL"] },
  { rows: ["TEN","ARI","SB_MVP"],       cols: ["NFL_MVP","NO","OPOY"] },
  { rows: ["NYJ","SB_CHAMP","TB"],      cols: ["CHI","PRO_BOWL","DPOY"] },
  { rows: ["GB","RUSH_TITLE","SF"],     cols: ["KC","SB_MVP","PASS_TITLE"] },
  { rows: ["LAR","NFL_MVP","BAL"],      cols: ["PIT","SB_CHAMP","PRO_BOWL"] },
  { rows: ["MIA","OROY","PHI"],         cols: ["DPOY","MIN","DROY"] },
  { rows: ["IND","OPOY","DEN"],         cols: ["SB_CHAMP","SEA","RUSH_TITLE"] },
  { rows: ["DAL","SB_MVP","NO"],        cols: ["NE","NFL_MVP","PRO_BOWL"] },
  { rows: ["NYG","ATL","SB_CHAMP"],     cols: ["CAR","PRO_BOWL","OPOY"] },
];

function getDailyPuzzle(dateStr) {
  const seedDate = dateStr ?? new Date().toLocaleDateString('en-CA')
  const seed = parseInt(seedDate.replace(/-/g, ''))
  return PUZZLES[seed % PUZZLES.length]
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

function isValid(player, criteria) {
  return player.t.includes(criteria) || player.a.includes(criteria);
}

function getScore(fame) {
  return Math.max(5, Math.round(100 - fame));
}

const css = `
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
.gridiron-grid{display:grid;grid-template-columns:90px repeat(3,110px);grid-template-rows:70px repeat(3,100px);gap:4px;padding:0 12px}
@media(max-width:480px){.gridiron-grid{grid-template-columns:72px repeat(3,88px);grid-template-rows:60px repeat(3,86px)}}
`;

export default function GridironGame() {
  const { streak } = useStreak('gridiron');
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)
  const puzzle = useMemo(() => getDailyPuzzle(puzzleDate), [puzzleDate])
  const [cells, setCells] = useState({});
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [guessesLeft, setGuessesLeft] = useState(9);
  const [shakeCell, setShakeCell] = useState(null);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [copied, setCopied] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!puzzleDate) return
    setCells({})
    setActiveCell(null)
    setQuery('')
    setSuggestions([])
    setPendingPlayer(null)
    setGuessesLeft(9)
    setShakeCell(null)
    setWon(false)
    setGameOver(false)
    setConfetti([])
    setCopied(false)
    setTotalScore(0)
  }, [puzzleDate])

  const rowHeaders = puzzle.rows;
  const colHeaders = puzzle.cols;
  const totalPossible = 9 * 95;

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({id:i,x:20+Math.random()*60,delay:Math.random()*600,color:['#4caf50','#C9A84C','#C9A84C','#e94560','#ffd700'][i%5],size:5+Math.random()*8}));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const getHeaderContent = (key) => {
    if (AWARDS[key]) return { badge: AWARD_BADGE[key], label: AWARDS[key], color: '#C9A84C', logoUrl: null };
    const abbr = NFL_LOGO[key];
    return { badge: null, label: TEAMS[key] || key, color: '#C9A84C', logoUrl: abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null };
  };

  const handleCellClick = (r, c) => {
    if (gameOver || won) return;
    const key = `${r}-${c}`;
    if (cells[key]) return;
    setActiveCell([r,c]);
    setQuery('');
    setSuggestions([]);
    setPendingPlayer(null);
    setTimeout(()=>inputRef.current?.focus(), 50);
  };

  const handleQuery = (val) => {
    setQuery(val);
    setPendingPlayer(null);
    if (val.length < 2) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    const matches = PLAYERS.filter(p => p.n.toLowerCase().includes(q)).slice(0, 8);
    setSuggestions(matches);
  };

  const handleSelect = (player) => {
    setPendingPlayer(player);
    setQuery(player.n);
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (!activeCell || !pendingPlayer) return;
    const [r, c] = activeCell;
    const key = `${r}-${c}`;
    const rowCrit = rowHeaders[r];
    const colCrit = colHeaders[c];
    const newGuesses = guessesLeft - 1;
    setGuessesLeft(newGuesses);

    const usedNames = Object.values(cells).map(v => v.player.n);
    const alreadyUsed = usedNames.includes(pendingPlayer.n);
    const valid = !alreadyUsed && isValid(pendingPlayer, rowCrit) && isValid(pendingPlayer, colCrit);

    if (valid) {
      const score = getScore(pendingPlayer.f);
      const newCells = {...cells, [key]: {player: pendingPlayer, score}};
      setCells(newCells);
      setTotalScore(s => s + score);
      setActiveCell(null);
      setQuery('');
      setPendingPlayer(null);
      setSuggestions([]);
      if (Object.keys(newCells).length === 9) {
        saveResult({ game: 'gridiron', completed: true, score: totalScore + score });
        setWon(true);
        spawnConfetti();
      } else if (newGuesses === 0) {
        saveResult({ game: 'gridiron', completed: false, score: totalScore });
        setGameOver(true);
      }
    } else {
      setShakeCell(key);
      setTimeout(()=>setShakeCell(null), 500);
      setPendingPlayer(null);
      setQuery('');
      if (newGuesses === 0) {
        setActiveCell(null);
        saveResult({ game: 'gridiron', completed: false, score: totalScore });
        setGameOver(true);
      }
    }
  };

  const handleShare = async () => {
    const grid = Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>cells[`${r}-${c}`]?'✅':'⬜').join('')).join('\n');
    const filled = Object.keys(cells).length;
    const text = `GRIDIRON by Streakle 🏈 — ${formatDate()}\nScore: ${totalScore} | ${filled}/9 cells\n${grid}\n\nPlay at: playstreakle.com/gridiron`;
    try {
      if (navigator.share) await navigator.share({text});
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:0,paddingBottom:40,color:'#F5F0E8',position:'relative',overflow:'hidden'}}>
      <style>{css}</style>

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      <UserMenu />
      <div style={{width:'100%',display:'flex',alignItems:'center',padding:'12px 16px 0',minHeight:44}}>
        <a href="/" style={{color:'#C9A84C',textDecoration:'none',fontSize:13,fontWeight:600}}>← Back</a>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:30,fontWeight:900,letterSpacing:2,color:'#fff'}}>GRIDIRON</div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#C9A84C',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px'}}>
          📅 Archive
        </button>
      </div>

      <div style={{fontSize:13,color:'#7A6E5F',marginBottom:8,marginTop:6}}>{formatDate()}</div>

      {showHow&&(
        <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:10,padding:16,maxWidth:340,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#C9A84C'}}>How to play</b><br/>
          Fill the 3×3 grid with NFL players. Each player must satisfy <b>both</b> the row and column criteria.<br/><br/>
          Rows and columns can be <b>NFL teams</b> (player played for that team) or <b>awards</b> (player won that award).<br/><br/>
          Each player can only be used <b>once</b>. You have <b>9 guesses</b> — one per cell.<br/><br/>
          🏆 Rarer answers = higher score. Max score: ~855.
        </div>
      )}

      <div style={{display:'flex',gap:24,marginBottom:12,fontSize:14}}>
        <div style={{color:'#C9A84C',fontWeight:700}}>Score: {totalScore}</div>
        <div style={{color:guessesLeft<=3?'#e94560':'#C9A84C',fontWeight:700}}>
          {won?'Complete!':gameOver?'Game over':`${guessesLeft} guess${guessesLeft!==1?'es':''} left`}
        </div>
      </div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {/* Grid */}
      <div style={{overflowX:'auto',width:'100%',display:'flex',justifyContent:'center'}}>
        <div className="gridiron-grid">
          
          <div style={{background:'transparent'}}/>

          {colHeaders.map((col,ci)=>{
            const {badge,label,color,logoUrl}=getHeaderContent(col);
            return (
              <div key={ci} style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {logoUrl ? <img src={logoUrl} alt={label} width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/> : <div style={{background:'#C9A84C',color:'#0F0E0C',borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:800,letterSpacing:0.5}}>{badge}</div>}
                <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{label}</div>
              </div>
            );
          })}

          {rowHeaders.map((row,ri)=>(
            <React.Fragment key={`row-${ri}`}>
              <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {(()=>{const{badge,label,color,logoUrl}=getHeaderContent(row);return(<>{logoUrl?<img src={logoUrl} alt={label} width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/>:<div style={{background:'#C9A84C',color:'#0F0E0C',borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:800,letterSpacing:0.5}}>{badge}</div>}<div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{label}</div></>);})()}
              </div>
              {colHeaders.map((col,ci)=>{
                const key=`${ri}-${ci}`;
                const filled=cells[key];
                const isActive=activeCell&&activeCell[0]===ri&&activeCell[1]===ci;
                const isShaking=shakeCell===key;
                return (
                  <div key={key} onClick={()=>handleCellClick(ri,ci)} style={{
                    background:filled?'#1a3a2a':isActive?'#2C2418':'#1C1A16',
                    border:`2px solid ${filled?'#4caf50':isActive?'#C9A84C':'#2C2820'}`,
                    borderRadius:8,cursor:filled||gameOver||won?'default':'pointer',
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    padding:6,textAlign:'center',userSelect:'none',
                    animation:isShaking?'shake 0.45s ease':filled?'cellReveal 0.35s ease':'none',
                    transition:'background 0.2s,border-color 0.2s',
                  }}>
                    {filled?(
                      <>
                        <div style={{fontSize:10,fontWeight:700,color:'#4caf50',marginBottom:2}}>+{filled.score}</div>
                        <div style={{fontSize:11,fontWeight:700,color:'#fff',lineHeight:1.3}}>{filled.player.n}</div>
                      </>
                    ):isActive?(
                      <div style={{fontSize:11,color:'#C9A84C'}}>Type below ↓</div>
                    ):(
                      <div style={{fontSize:20,opacity:0.2}}>?</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Search */}
      {activeCell&&!won&&!gameOver&&(
        <div style={{marginTop:16,width:'100%',maxWidth:340,padding:'0 12px',boxSizing:'border-box',animation:'slideUp 0.3s ease'}}>
          <div style={{fontSize:12,color:'#7A6E5F',marginBottom:6,textAlign:'center'}}>
            {getHeaderContent(rowHeaders[activeCell[0]]).label} × {getHeaderContent(colHeaders[activeCell[1]]).label}
          </div>
          <input ref={inputRef} value={query} onChange={e=>handleQuery(e.target.value)} placeholder="Search NFL player..."
            style={{width:'100%',boxSizing:'border-box',background:'#1C1A16',border:`2px solid ${pendingPlayer?'#4caf50':'#C9A84C'}`,borderRadius:8,color:'#fff',fontSize:15,padding:'10px 14px',outline:'none'}}
          />
          {suggestions.length>0&&(
            <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,marginTop:4,overflow:'hidden'}}>
              {suggestions.map((p,i)=>(
                <div key={i} onClick={()=>handleSelect(p)} style={{
                  padding:'10px 14px',cursor:'pointer',fontSize:13,
                  borderBottom:i<suggestions.length-1?'1px solid #2C2820':'none',
                  background:pendingPlayer?.n===p.n?'#1a3a2a':'transparent',
                  transition:'background 0.15s',
                }}
                  onMouseOver={e=>e.currentTarget.style.background='#2C2418'}
                  onMouseOut={e=>e.currentTarget.style.background=pendingPlayer?.n===p.n?'#1a3a2a':'transparent'}
                >
                  <span style={{color:'#F5F0E8',fontWeight:600}}>{p.n}</span>
                </div>
              ))}
            </div>
          )}
          {query.length>=2&&suggestions.length===0&&!pendingPlayer&&(
            <div style={{color:'#aaa',fontSize:12,textAlign:'center',marginTop:8}}>No player found</div>
          )}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={()=>{setActiveCell(null);setQuery('');setSuggestions([]);setPendingPlayer(null);}} style={{flex:1,background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:12,padding:'8px'}}>Cancel</button>
            <button onClick={handleSubmit} disabled={!pendingPlayer} style={{flex:2,background:pendingPlayer?'#4caf50':'#1C1A16',border:'none',borderRadius:6,color:pendingPlayer?'#fff':'#555',cursor:pendingPlayer?'pointer':'default',fontSize:13,fontWeight:700,padding:'8px',transition:'background 0.2s'}}>
              {pendingPlayer?`Submit "${pendingPlayer.n}"`:'Select a player first'}
            </button>
          </div>
        </div>
      )}

      {(won||gameOver)&&(
        <div style={{textAlign:'center',marginTop:20,animation:'slideUp 0.5s ease'}}>
          {won&&<div style={{fontSize:22,fontWeight:700,color:'#4caf50',marginBottom:6}}>🎉 Board Complete!</div>}
          {gameOver&&!won&&<div style={{fontSize:20,fontWeight:700,color:'#e94560',marginBottom:6}}>Game Over!</div>}
          <div style={{fontSize:16,color:'#C9A84C',fontWeight:700,marginBottom:4}}>Final Score: {totalScore} / {totalPossible}</div>
          <div style={{fontSize:13,color:'#aaa',marginBottom:16}}>{Object.keys(cells).length}/9 cells filled</div>
          <div style={{position:'relative',display:'inline-block'}}>
            <button onClick={handleShare} style={{background:'#C9A84C',color:'#0F0E0C',border:'none',borderRadius:8,padding:'10px 28px',fontSize:15,fontWeight:700,cursor:'pointer'}}
              onMouseOver={e=>e.currentTarget.style.background='#D4B45A'}
              onMouseOut={e=>e.currentTarget.style.background='#C9A84C'}>
              📋 Share result
            </button>
            {copied&&<div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>Copied!</div>}
          </div>
        </div>
      )}

      <div style={{marginTop:32,fontSize:12,color:'#5A5040',textAlign:'center'}}>
        <a href="/privacy" style={{color:'#5A5040',textDecoration:'none'}}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="gridiron"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  );
}