import React, { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import AwardIcon from './AwardIcon';
import { clickableProps } from './a11y';
import { useSeo, PAGE_SEO } from './seo';

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
  {n:"Aaron Rodgers",t:["GB","NYJ","PIT"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL"],f:97},
  {n:"Patrick Mahomes",t:["KC"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:99},
  {n:"Joe Montana",t:["SF","KC"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL"],f:99},
  {n:"Brett Favre",t:["GB","MIN","NYJ","ATL"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","PASS_TITLE"],f:97},
  {n:"Drew Brees",t:["SD","NO"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","OPOY","PASS_TITLE"],f:96},
  {n:"Dan Marino",t:["MIA"],a:["PRO_BOWL","PASS_TITLE","OPOY","NFL_MVP"],f:97},
  {n:"John Elway",t:["DEN"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","NFL_MVP"],f:97},
  {n:"Steve Young",t:["SF","TB"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","PASS_TITLE"],f:96},
  {n:"Joe Flacco",t:["BAL","DEN","NYJ","CLE","IND","MIN","CIN"],a:["SB_CHAMP","SB_MVP"],f:55},
  {n:"Russell Wilson",t:["SEA","DEN","PIT","NYG"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Ben Roethlisberger",t:["PIT"],a:["SB_CHAMP","PRO_BOWL"],f:88},
  {n:"Eli Manning",t:["NYG"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:85},
  {n:"Troy Aikman",t:["DAL"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:92},
  {n:"Steve McNair",t:["TEN","BAL"],a:["NFL_MVP","PRO_BOWL"],f:78},
  {n:"Kurt Warner",t:["STL","NYG","ARI"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","PASS_TITLE"],f:88},
  {n:"Donovan McNabb",t:["PHI","WAS"],a:["PRO_BOWL"],f:78},
  {n:"Michael Vick",t:["ATL","PHI","NYJ","PIT"],a:["PRO_BOWL"],f:82},
  {n:"Matt Ryan",t:["ATL","IND"],a:["NFL_MVP","PRO_BOWL","OPOY","OROY"],f:75},
  {n:"Cam Newton",t:["CAR","NE"],a:["NFL_MVP","PRO_BOWL","OROY","OPOY"],f:82},
  {n:"Josh Allen",t:["BUF"],a:["PRO_BOWL","NFL_MVP"],f:90},
  {n:"Lamar Jackson",t:["BAL"],a:["NFL_MVP","PRO_BOWL"],f:92},
  {n:"Justin Herbert",t:["LAC"],a:["PRO_BOWL","OROY"],f:78},
  {n:"Joe Burrow",t:["CIN"],a:["PRO_BOWL"],f:82},
  {n:"Jalen Hurts",t:["PHI"],a:["PRO_BOWL","SB_CHAMP","SB_MVP"],f:85},
  {n:"Dak Prescott",t:["DAL"],a:["PRO_BOWL","OROY"],f:80},
  {n:"Kirk Cousins",t:["WAS","MIN","ATL"],a:["PRO_BOWL"],f:65},
  {n:"Matthew Stafford",t:["DET","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Philip Rivers",t:["SD","LAC","IND"],a:["PRO_BOWL","PASS_TITLE"],f:80},
  {n:"Tony Romo",t:["DAL"],a:["PRO_BOWL"],f:78},
  {n:"Alex Smith",t:["SF","KC","WAS"],a:["PRO_BOWL"],f:65},
  {n:"Carson Palmer",t:["CIN","OAK","ARI"],a:["PRO_BOWL"],f:68},
  {n:"Andy Dalton",t:["CIN","DAL","CHI","NYG","BAL","CAR"],a:["PRO_BOWL"],f:60},
  {n:"Ryan Tannehill",t:["MIA","TEN"],a:[],f:62},
  {n:"Jimmy Garoppolo",t:["NE","SF","LV"],a:[],f:52},
  {n:"Nick Foles",t:["PHI","STL","JAX","KC","CHI","IND"],a:["SB_CHAMP","SB_MVP"],f:55},
  {n:"Derek Carr",t:["OAK","LV","NO","ATL"],a:["PRO_BOWL"],f:62},
  {n:"Kyler Murray",t:["ARI"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Trevor Lawrence",t:["JAX"],a:["PRO_BOWL"],f:72},
  {n:"Tua Tagovailoa",t:["MIA"],a:["PRO_BOWL"],f:68},
  {n:"Baker Mayfield",t:["CLE","CAR","LAR","TB"],a:[],f:58},
  {n:"Deshaun Watson",t:["HOU","CLE"],a:["PRO_BOWL"],f:65},
  {n:"C.J. Stroud",t:["HOU"],a:["PRO_BOWL","OROY"],f:72},
  {n:"Vince Young",t:["TEN","PHI"],a:["PRO_BOWL","OROY"],f:55},
  {n:"Sam Bradford",t:["STL","PHI","MIN","ARI"],a:["OROY"],f:48},
  {n:"Matt Hasselbeck",t:["GB","SEA","TEN","IND"],a:["PRO_BOWL"],f:65},
  {n:"Brad Johnson",t:["MIN","WAS","TB","DAL","NYJ","ATL"],a:["SB_CHAMP","SB_MVP"],f:48},
  {n:"Trent Dilfer",t:["TB","BAL","SEA","CLE","SF"],a:["SB_CHAMP","SB_MVP"],f:45},
  {n:"Mark Brunell",t:["GB","JAX","WAS","NO","NYJ"],a:["PRO_BOWL"],f:65},
  {n:"Kordell Stewart",t:["PIT","CHI","BAL"],a:["PRO_BOWL"],f:62},
  {n:"Jeff Garcia",t:["SF","CLE","DET","PHI","TB","OAK"],a:["PRO_BOWL"],f:52},
  {n:"Ryan Fitzpatrick",t:["TEN","CIN","BUF","NYJ","HOU","MIA","TB","WAS","PHI"],a:[],f:52},
  {n:"Josh McCown",t:["ARI","DET","OAK","CHI","TB","MIA","CAR","MIN","PHI","NYJ","HOU","CLE"],a:[],f:35},
  {n:"Geno Smith",t:["NYJ","NYG","LAC","SEA","LV"],a:["PRO_BOWL"],f:48},
  {n:"Case Keenum",t:["HOU","STL","MIN","DEN","WAS","CLE","BUF","LAR"],a:[],f:38},
  {n:"Brock Osweiler",t:["DEN","HOU","CLE","MIA"],a:["SB_CHAMP"],f:35},
  // RBs
  {n:"Emmitt Smith",t:["DAL","ARI"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL","RUSH_TITLE"],f:99},
  {n:"Barry Sanders",t:["DET"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:99},
  {n:"Adrian Peterson",t:["MIN","NO","ARI","WAS","DET","TEN","SEA"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:95},
  {n:"LaDainian Tomlinson",t:["SD","NYJ"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:96},
  {n:"Marshall Faulk",t:["IND","STL"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","OPOY","OROY"],f:94},
  {n:"Jerome Bettis",t:["STL","PIT"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:88},
  {n:"Curtis Martin",t:["NE","NYJ"],a:["PRO_BOWL","RUSH_TITLE","OROY"],f:82},
  {n:"Edgerrin James",t:["IND","ARI","SEA","JAX"],a:["PRO_BOWL","RUSH_TITLE","OROY"],f:85},
  {n:"Ricky Williams",t:["NO","MIA","BAL","HOU"],a:["RUSH_TITLE","PRO_BOWL"],f:68},
  {n:"Priest Holmes",t:["BAL","KC"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Jamal Lewis",t:["BAL","CLE"],a:["SB_CHAMP","PRO_BOWL","RUSH_TITLE","OPOY"],f:72},
  {n:"Shaun Alexander",t:["SEA","WAS"],a:["NFL_MVP","PRO_BOWL","RUSH_TITLE","OPOY"],f:78},
  {n:"Chris Johnson",t:["TEN","NYJ","ARI"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:75},
  {n:"Frank Gore",t:["SF","IND","MIA","BUF","NYJ"],a:["PRO_BOWL"],f:78},
  {n:"Steven Jackson",t:["STL","ATL","NE"],a:["PRO_BOWL"],f:72},
  {n:"Arian Foster",t:["HOU","MIA"],a:["PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Ray Rice",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Matt Forte",t:["CHI","NYJ"],a:["PRO_BOWL"],f:72},
  {n:"Maurice Jones-Drew",t:["JAX","OAK"],a:["PRO_BOWL","RUSH_TITLE"],f:68},
  {n:"Marshawn Lynch",t:["BUF","SEA","OAK"],a:["SB_CHAMP","PRO_BOWL"],f:88},
  {n:"Doug Martin",t:["TB","OAK"],a:["PRO_BOWL"],f:58},
  {n:"Le'Veon Bell",t:["PIT","NYJ","KC","BAL"],a:["PRO_BOWL"],f:75},
  {n:"Todd Gurley",t:["STL","LAR","ATL"],a:["PRO_BOWL","RUSH_TITLE","OPOY","OROY"],f:78},
  {n:"Ezekiel Elliott",t:["DAL","NE"],a:["PRO_BOWL","RUSH_TITLE"],f:82},
  {n:"Leonard Fournette",t:["JAX","TB"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Kareem Hunt",t:["KC","CLE"],a:["PRO_BOWL","RUSH_TITLE"],f:65},
  {n:"Saquon Barkley",t:["NYG","PHI"],a:["PRO_BOWL","OPOY","OROY","RUSH_TITLE","SB_CHAMP"],f:85},
  {n:"Derrick Henry",t:["TEN","BAL"],a:["PRO_BOWL","RUSH_TITLE","OPOY"],f:88},
  {n:"Alvin Kamara",t:["NO"],a:["PRO_BOWL","OROY"],f:82},
  {n:"Christian McCaffrey",t:["CAR","SF"],a:["PRO_BOWL","OPOY","RUSH_TITLE"],f:90},
  {n:"Nick Chubb",t:["CLE"],a:["PRO_BOWL"],f:78},
  {n:"Dalvin Cook",t:["MIN","NYJ","DAL","BAL"],a:["PRO_BOWL"],f:75},
  {n:"Josh Jacobs",t:["OAK","LV","GB"],a:["PRO_BOWL","RUSH_TITLE"],f:72},
  {n:"Jonathan Taylor",t:["IND"],a:["PRO_BOWL","RUSH_TITLE"],f:78},
  {n:"Joe Mixon",t:["CIN","HOU"],a:["PRO_BOWL"],f:68},
  {n:"Aaron Jones",t:["GB","MIN"],a:["PRO_BOWL"],f:65},
  {n:"James Conner",t:["PIT","ARI"],a:["PRO_BOWL"],f:58},
  {n:"Breece Hall",t:["NYJ"],a:[],f:62},
  {n:"Bijan Robinson",t:["ATL"],a:["PRO_BOWL"],f:68},
  {n:"De'Von Achane",t:["MIA"],a:[],f:65},
  {n:"Reggie Bush",t:["NO","MIA","DET","SF","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Corey Dillon",t:["CIN","NE"],a:["SB_CHAMP"],f:58},
  {n:"Willis McGahee",t:["BUF","BAL","DEN","CLE","MIA"],a:["PRO_BOWL"],f:55},
  {n:"Thomas Jones",t:["ARI","TB","CHI","NYJ","KC"],a:[],f:45},
  {n:"Larry Johnson",t:["KC","CIN","WAS","MIA"],a:["PRO_BOWL"],f:58},
  {n:"Clinton Portis",t:["DEN","WAS"],a:["PRO_BOWL"],f:68},
  {n:"Tiki Barber",t:["NYG"],a:["PRO_BOWL"],f:75},
  {n:"Brian Westbrook",t:["PHI","SF"],a:["PRO_BOWL"],f:72},
  {n:"Warrick Dunn",t:["TB","ATL"],a:["PRO_BOWL","OROY"],f:68},
  {n:"DeAngelo Williams",t:["CAR","PIT"],a:["PRO_BOWL"],f:58},
  {n:"Darren McFadden",t:["OAK","DAL","NE"],a:[],f:62},
  {n:"Darren Sproles",t:["SD","NO","PHI"],a:["PRO_BOWL"],f:65},
  {n:"James White",t:["NE"],a:["SB_CHAMP"],f:52},
  {n:"Jamaal Charles",t:["KC","DEN","JAX"],a:["PRO_BOWL"],f:72},
  {n:"David Johnson",t:["ARI","HOU"],a:["PRO_BOWL"],f:68},
  {n:"Devonta Freeman",t:["ATL","NYG"],a:["PRO_BOWL"],f:55},
  {n:"Latavius Murray",t:["OAK","MIN","NO","BAL","DEN"],a:["PRO_BOWL"],f:42},
  {n:"Jordan Howard",t:["CHI","PHI","MIA","NO"],a:["PRO_BOWL"],f:45},
  {n:"LeGarrette Blount",t:["TB","TEN","PIT","NE","PHI","DET"],a:["SB_CHAMP"],f:48},
  {n:"Dion Lewis",t:["PHI","CLE","NE","TEN"],a:["SB_CHAMP"],f:42},
  {n:"C.J. Spiller",t:["BUF","NO","NYJ","SEA","KC"],a:["PRO_BOWL"],f:52},
  {n:"Phillip Lindsay",t:["DEN","HOU","IND"],a:["PRO_BOWL"],f:42},
  {n:"Kenyan Drake",t:["MIA","ARI","LV","BAL"],a:[],f:40},
  {n:"Tony Pollard",t:["DAL","TEN"],a:["PRO_BOWL"],f:65},
  {n:"David Montgomery",t:["CHI","DET"],a:[],f:55},
  {n:"Miles Sanders",t:["PHI","CAR"],a:["PRO_BOWL"],f:52},
  {n:"Peyton Barber",t:["TB","WAS","LV"],a:[],f:25},
  // WRs
  {n:"Jerry Rice",t:["SF","OAK","SEA"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","OPOY"],f:99},
  {n:"Randy Moss",t:["MIN","OAK","NE","TEN","SF"],a:["PRO_BOWL","OROY"],f:97},
  {n:"Terrell Owens",t:["SF","PHI","DAL","BUF","CIN"],a:["PRO_BOWL"],f:90},
  {n:"Larry Fitzgerald",t:["ARI"],a:["PRO_BOWL"],f:92},
  {n:"Calvin Johnson",t:["DET"],a:["PRO_BOWL"],f:94},
  {n:"Steve Smith Sr.",t:["CAR","BAL"],a:["PRO_BOWL"],f:85},
  {n:"Andre Johnson",t:["HOU","IND","TEN","CLE","DET"],a:["PRO_BOWL"],f:82},
  {n:"Marvin Harrison",t:["IND"],a:["PRO_BOWL"],f:88},
  {n:"Hines Ward",t:["PIT"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:80},
  {n:"Reggie Wayne",t:["IND"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Torry Holt",t:["STL","JAX"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Isaac Bruce",t:["STL","SF"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Wes Welker",t:["MIA","NE","DEN","STL"],a:["PRO_BOWL"],f:80},
  {n:"Antonio Brown",t:["PIT","OAK","NE","TB"],a:["SB_CHAMP","PRO_BOWL"],f:90},
  {n:"Julio Jones",t:["ATL","TEN","TB","PHI"],a:["PRO_BOWL"],f:88},
  {n:"Odell Beckham Jr.",t:["NYG","CLE","LAR","BAL"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:85},
  {n:"Dez Bryant",t:["DAL","NO","CLE"],a:["PRO_BOWL"],f:75},
  {n:"A.J. Green",t:["CIN","ARI"],a:["PRO_BOWL"],f:80},
  {n:"DeAndre Hopkins",t:["HOU","ARI","TEN","KC","BAL"],a:["PRO_BOWL"],f:85},
  {n:"Davante Adams",t:["GB","LV","NYJ","LAR"],a:["PRO_BOWL"],f:88},
  {n:"Stefon Diggs",t:["MIN","BUF","HOU","NE"],a:["PRO_BOWL"],f:82},
  {n:"Tyreek Hill",t:["KC","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:90},
  {n:"Cooper Kupp",t:["LAR","SEA"],a:["SB_CHAMP","PRO_BOWL","OPOY"],f:85},
  {n:"Justin Jefferson",t:["MIN"],a:["PRO_BOWL","OPOY"],f:92},
  {n:"Ja'Marr Chase",t:["CIN"],a:["PRO_BOWL","OPOY","OROY"],f:88},
  {n:"CeeDee Lamb",t:["DAL"],a:["PRO_BOWL"],f:88},
  {n:"Mike Evans",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Amari Cooper",t:["OAK","DAL","CLE","BUF","NO"],a:["PRO_BOWL"],f:75},
  {n:"Keenan Allen",t:["SD","LAC","CHI"],a:["PRO_BOWL"],f:78},
  {n:"Adam Thielen",t:["MIN","CAR"],a:["PRO_BOWL"],f:72},
  {n:"Tyler Lockett",t:["SEA","TEN"],a:["PRO_BOWL"],f:70},
  {n:"DK Metcalf",t:["SEA","PIT"],a:["PRO_BOWL"],f:78},
  {n:"Brandin Cooks",t:["NO","NE","LAR","HOU","DAL"],a:["PRO_BOWL"],f:65},
  {n:"Emmanuel Sanders",t:["PIT","DEN","SF","NO","BUF"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"T.Y. Hilton",t:["IND"],a:["PRO_BOWL"],f:70},
  {n:"Demaryius Thomas",t:["DEN","HOU","NYJ","NE"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Victor Cruz",t:["NYG"],a:["PRO_BOWL","SB_CHAMP"],f:65},
  {n:"Julian Edelman",t:["NE"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:80},
  {n:"Anquan Boldin",t:["ARI","BAL","SF","DET","BUF","NO"],a:["SB_CHAMP","PRO_BOWL","OROY"],f:72},
  {n:"Mike Wallace",t:["PIT","MIA","MIN","BAL","PHI","BUF"],a:["PRO_BOWL"],f:65},
  {n:"Golden Tate",t:["SEA","DET","PHI","NYG","SF"],a:["SB_CHAMP"],f:58},
  {n:"Vincent Jackson",t:["SD","TB"],a:["PRO_BOWL"],f:65},
  {n:"Plaxico Burress",t:["PIT","NYG","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Keyshawn Johnson",t:["NYJ","TB","DAL","CAR","ATL"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Santana Moss",t:["NYJ","WAS"],a:["PRO_BOWL"],f:48},
  {n:"Muhsin Muhammad",t:["CAR","CHI"],a:["PRO_BOWL"],f:60},
  {n:"Deion Branch",t:["NE","SEA"],a:["SB_CHAMP","SB_MVP","PRO_BOWL"],f:52},
  {n:"Diontae Johnson",t:["PIT","CAR","BAL"],a:["PRO_BOWL"],f:62},
  {n:"Jayden Reed",t:["GB"],a:[],f:48},
  // TEs
  {n:"Rob Gronkowski",t:["NE","TB"],a:["SB_CHAMP","PRO_BOWL"],f:95},
  {n:"Travis Kelce",t:["KC"],a:["SB_CHAMP","PRO_BOWL"],f:97},
  {n:"Tony Gonzalez",t:["KC","ATL"],a:["PRO_BOWL"],f:94},
  {n:"Jason Witten",t:["DAL","LV","MIA"],a:["PRO_BOWL"],f:85},
  {n:"Greg Olsen",t:["CHI","CAR","SEA"],a:["PRO_BOWL"],f:75},
  {n:"Jimmy Graham",t:["NO","SEA","GB","CHI"],a:["PRO_BOWL"],f:80},
  {n:"Vernon Davis",t:["SF","DEN","WAS"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Zach Ertz",t:["PHI","ARI"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"George Kittle",t:["SF"],a:["PRO_BOWL"],f:88},
  {n:"Mark Andrews",t:["BAL"],a:["PRO_BOWL"],f:80},
  {n:"Antonio Gates",t:["SD","LAC"],a:["PRO_BOWL"],f:82},
  {n:"Dallas Clark",t:["IND","TB"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Todd Heap",t:["BAL","ARI"],a:["PRO_BOWL"],f:52},
  {n:"Jeremy Shockey",t:["NYG","NO","CAR","MIA"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Alge Crumpler",t:["ATL","TEN","NE"],a:["PRO_BOWL"],f:48},
  {n:"Benjamin Watson",t:["NE","CLE","NO","BAL"],a:["SB_CHAMP"],f:42},
  {n:"Heath Miller",t:["PIT"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Owen Daniels",t:["HOU","DEN","BAL"],a:["SB_CHAMP","PRO_BOWL"],f:38},
  {n:"Julius Thomas",t:["DEN","JAX","MIA"],a:["PRO_BOWL"],f:45},
  {n:"Tyler Eifert",t:["CIN","JAX","NO"],a:["PRO_BOWL"],f:45},
  {n:"Jordan Reed",t:["WAS"],a:["PRO_BOWL"],f:50},
  {n:"Eric Ebron",t:["DET","IND","PIT"],a:["PRO_BOWL"],f:45},
  {n:"David Njoku",t:["CLE"],a:["PRO_BOWL"],f:48},
  {n:"Kyle Pitts",t:["ATL"],a:["PRO_BOWL"],f:62},
  {n:"Pat Freiermuth",t:["PIT"],a:[],f:45},
  {n:"Cole Kmet",t:["CHI"],a:[],f:42},
  {n:"Sam LaPorta",t:["DET"],a:["PRO_BOWL"],f:58},
  {n:"Brock Bowers",t:["LV"],a:["PRO_BOWL"],f:62},
  {n:"Hunter Henry",t:["SD","LAC","NE"],a:["PRO_BOWL"],f:55},
  {n:"Darren Waller",t:["BAL","OAK","LV","NYG","MIA"],a:["PRO_BOWL"],f:65},
  // OL
  {n:"Jonathan Ogden",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Walter Jones",t:["SEA"],a:["PRO_BOWL"],f:75},
  {n:"Orlando Pace",t:["STL","CHI"],a:["SB_CHAMP","PRO_BOWL"],f:78},
  {n:"Joe Thomas",t:["CLE"],a:["PRO_BOWL"],f:80},
  {n:"Trent Williams",t:["WAS","SF"],a:["PRO_BOWL"],f:78},
  {n:"Zack Martin",t:["DAL"],a:["PRO_BOWL"],f:75},
  {n:"Quenton Nelson",t:["IND"],a:["PRO_BOWL"],f:72},
  {n:"Tyron Smith",t:["DAL"],a:["PRO_BOWL"],f:72},
  {n:"David Bakhtiari",t:["GB"],a:["PRO_BOWL"],f:68},
  {n:"Lane Johnson",t:["PHI"],a:["SB_CHAMP","PRO_BOWL"],f:70},
  {n:"Andrew Whitworth",t:["CIN","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Marshal Yanda",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Maurkice Pouncey",t:["PIT"],a:["PRO_BOWL"],f:62},
  {n:"Alex Mack",t:["CLE","ATL","SF"],a:["PRO_BOWL"],f:52},
  {n:"Laremy Tunsil",t:["MIA","HOU"],a:["PRO_BOWL"],f:65},
  // DL/Edge
  {n:"Reggie White",t:["PHI","GB","CAR"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:99},
  {n:"Bruce Smith",t:["BUF","WAS"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Michael Strahan",t:["NYG"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:88},
  {n:"Warren Sapp",t:["TB","OAK"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:85},
  {n:"Aaron Donald",t:["STL","LAR"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:97},
  {n:"J.J. Watt",t:["HOU","ARI"],a:["PRO_BOWL","DPOY"],f:95},
  {n:"Khalil Mack",t:["OAK","CHI","LAC"],a:["PRO_BOWL","DPOY"],f:88},
  {n:"Von Miller",t:["DEN","LAR","BUF"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","DROY"],f:88},
  {n:"Myles Garrett",t:["CLE"],a:["PRO_BOWL","DPOY"],f:85},
  {n:"Micah Parsons",t:["DAL","GB"],a:["PRO_BOWL","DROY"],f:88},
  {n:"Nick Bosa",t:["SF"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"T.J. Watt",t:["PIT"],a:["PRO_BOWL","DPOY"],f:88},
  {n:"Chris Jones",t:["KC"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Dwight Freeney",t:["IND","SD","ARI","ATL","SEA"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Julius Peppers",t:["CAR","CHI","GB"],a:["PRO_BOWL","DROY"],f:88},
  {n:"Jared Allen",t:["KC","MIN","CHI","CAR"],a:["PRO_BOWL"],f:80},
  {n:"Jason Taylor",t:["MIA","WAS","NYJ"],a:["PRO_BOWL","DPOY"],f:82},
  {n:"DeMarcus Ware",t:["DAL","DEN"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Terrell Suggs",t:["BAL","ARI","KC"],a:["SB_CHAMP","PRO_BOWL","DPOY","DROY"],f:80},
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
  {n:"Rashan Gary",t:["GB"],a:[],f:60},
  // LBs
  {n:"Lawrence Taylor",t:["NYG"],a:["SB_CHAMP","NFL_MVP","PRO_BOWL","DPOY"],f:99},
  {n:"Ray Lewis",t:["BAL"],a:["SB_CHAMP","SB_MVP","PRO_BOWL","DPOY"],f:99},
  {n:"Brian Urlacher",t:["CHI"],a:["PRO_BOWL","DPOY","DROY"],f:90},
  {n:"Derrick Brooks",t:["TB"],a:["SB_CHAMP","PRO_BOWL","DPOY"],f:90},
  {n:"Junior Seau",t:["SD","MIA","NE"],a:["PRO_BOWL"],f:90},
  {n:"Patrick Willis",t:["SF"],a:["PRO_BOWL","DROY"],f:82},
  {n:"Clay Matthews",t:["GB","LAR"],a:["SB_CHAMP","PRO_BOWL"],f:80},
  {n:"Luke Kuechly",t:["CAR"],a:["PRO_BOWL","DPOY","DROY"],f:88},
  {n:"Bobby Wagner",t:["SEA","LAR","WAS"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Fred Warner",t:["SF"],a:["PRO_BOWL"],f:72},
  {n:"Darius Leonard",t:["IND"],a:["PRO_BOWL","DROY"],f:68},
  {n:"Roquan Smith",t:["CHI","BAL"],a:["PRO_BOWL"],f:72},
  {n:"Dont'a Hightower",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Lavonte David",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"C.J. Mosley",t:["BAL","NYJ"],a:["PRO_BOWL"],f:65},
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
  {n:"Richard Sherman",t:["SEA","SF"],a:["SB_CHAMP","PRO_BOWL"],f:82},
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
  {n:"Eric Berry",t:["KC","TEN"],a:["PRO_BOWL"],f:72},
  {n:"Xavien Howard",t:["MIA"],a:["PRO_BOWL"],f:68},
  {n:"Derwin James",t:["LAC"],a:["PRO_BOWL"],f:68},
  {n:"Budda Baker",t:["ARI"],a:["PRO_BOWL"],f:65},
  {n:"Kevin Byard",t:["TEN","PHI"],a:["PRO_BOWL"],f:62},
  {n:"Jordan Poyer",t:["CLE","BUF","MIA"],a:["PRO_BOWL"],f:60},
  {n:"Micah Hyde",t:["GB","BUF"],a:["PRO_BOWL"],f:60},
  {n:"Devon Witherspoon",t:["SEA"],a:["PRO_BOWL"],f:55},
  {n:"Devin Hester",t:["CHI","ATL","BAL","SEA","NO"],a:["PRO_BOWL"],f:75},
  // Additional SB-only roster players
  {n:"Danny Amendola",t:["STL","NE","MIA","DET","HOU"],a:["SB_CHAMP"],f:52},
  {n:"David Givens",t:["NE","TEN"],a:["SB_CHAMP"],f:32},
  {n:"David Patten",t:["NYG","NE","WAS","NO"],a:["SB_CHAMP"],f:35},
  {n:"Troy Brown",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:42},
  {n:"Kevin Faulk",t:["NE"],a:["SB_CHAMP"],f:42},
  {n:"Matt Cassel",t:["NE","KC","MIN","BUF","DAL","TEN","CHI"],a:[],f:42},
  {n:"Donte Stallworth",t:["NO","PHI","NE","CLE","BAL","WAS","MIA"],a:["SB_CHAMP"],f:35},
  {n:"BenJarvus Green-Ellis",t:["NE","CIN"],a:[],f:38},
  {n:"Stevan Ridley",t:["NE","NYJ","STL"],a:["SB_CHAMP"],f:35},
  {n:"Rex Burkhead",t:["CIN","NE","HOU"],a:["SB_CHAMP"],f:38},
  {n:"Chris Hogan",t:["BUF","NE","CAR","NYJ"],a:["SB_CHAMP"],f:38},
  {n:"Martellus Bennett",t:["DAL","NYG","CHI","NE","GB","BAL"],a:["SB_CHAMP"],f:55},
  {n:"Aaron Hernandez",t:["NE"],a:[],f:45},
  {n:"Rob Ninkovich",t:["NO","MIA","NE"],a:["SB_CHAMP"],f:40},
  {n:"Patrick Chung",t:["NE","PHI"],a:["SB_CHAMP"],f:45},
  {n:"Duron Harmon",t:["NE","DET","ATL"],a:["SB_CHAMP"],f:40},
  {n:"Brandon Spikes",t:["NE","BUF"],a:[],f:35},
  {n:"Jerod Mayo",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:52},
  {n:"Vince Wilfork",t:["NE","HOU"],a:["SB_CHAMP","PRO_BOWL"],f:65},
  {n:"Logan Mankins",t:["NE","TB"],a:["PRO_BOWL"],f:60},
  {n:"Dan Koppen",t:["NE","DEN","CAR"],a:["SB_CHAMP"],f:35},
  {n:"Matt Light",t:["NE"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Chase Daniel",t:["NO","KC","PHI","CHI","DET","LAC"],a:["SB_CHAMP"],f:32},
  {n:"Justin Tucker",t:["BAL"],a:["SB_CHAMP","PRO_BOWL"],f:82},
  {n:"Harrison Butker",t:["KC"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Sebastian Janikowski",t:["OAK","SEA"],a:["PRO_BOWL"],f:62},
  {n:"Matt Prater",t:["DEN","DET","ARI","LAC"],a:["PRO_BOWL"],f:58},
  {n:"Robbie Gould",t:["CHI","NYG","SF"],a:["PRO_BOWL"],f:62},
  {n:"Greg Zuerlein",t:["STL","LAR","DAL","NYG"],a:["PRO_BOWL"],f:55},
  {n:"Younghoe Koo",t:["LAC","ATL"],a:["PRO_BOWL"],f:55},
  {n:"Evan McPherson",t:["CIN"],a:[],f:55},
  {n:"Graham Gano",t:["WAS","CAR","NYG"],a:["PRO_BOWL"],f:55},
  // ── AUDIT ADDITIONS (2026-06): legends + coverage for thin grid cells ──
  {n:"Walter Payton",t:["CHI"],a:["SB_CHAMP","NFL_MVP","OPOY","RUSH_TITLE","PRO_BOWL"],f:97},
  {n:"Terrell Davis",t:["DEN"],a:["SB_CHAMP","SB_MVP","NFL_MVP","OPOY","RUSH_TITLE","PRO_BOWL"],f:88},
  {n:"Marcus Allen",t:["OAK","KC"],a:["SB_CHAMP","SB_MVP","NFL_MVP","OROY","RUSH_TITLE","PRO_BOWL"],f:88},
  {n:"Eric Dickerson",t:["LAR","IND","OAK","ATL"],a:["OROY","OPOY","RUSH_TITLE","PRO_BOWL"],f:88},
  {n:"Tony Dorsett",t:["DAL","DEN"],a:["SB_CHAMP","OROY","PRO_BOWL"],f:82},
  {n:"Franco Harris",t:["PIT","SEA"],a:["SB_CHAMP","SB_MVP","OROY","PRO_BOWL"],f:85},
  {n:"Terry Bradshaw",t:["PIT"],a:["SB_CHAMP","SB_MVP","NFL_MVP","PRO_BOWL"],f:90},
  {n:"Joe Greene",t:["PIT"],a:["SB_CHAMP","DPOY","DROY","PRO_BOWL"],f:85},
  {n:"Jack Lambert",t:["PIT"],a:["SB_CHAMP","DPOY","DROY","PRO_BOWL"],f:80},
  {n:"Thurman Thomas",t:["BUF","MIA"],a:["NFL_MVP","PRO_BOWL"],f:82},
  {n:"Ronnie Lott",t:["SF","OAK","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:88},
  {n:"Charles Haley",t:["SF","DAL"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Mike Singletary",t:["CHI"],a:["SB_CHAMP","DPOY","PRO_BOWL"],f:85},
  {n:"Steve Largent",t:["SEA"],a:["PRO_BOWL"],f:80},
  {n:"Cortez Kennedy",t:["SEA"],a:["DPOY","PRO_BOWL"],f:72},
  {n:"Kevin Greene",t:["LAR","PIT","CAR","SF"],a:["PRO_BOWL"],f:72},
  {n:"Brian Dawkins",t:["PHI","DEN"],a:["PRO_BOWL"],f:78},
  {n:"Rod Smith",t:["DEN"],a:["SB_CHAMP","PRO_BOWL"],f:68},
  {n:"Adam Vinatieri",t:["NE","IND"],a:["SB_CHAMP","PRO_BOWL"],f:80},
  {n:"Ken Anderson",t:["CIN"],a:["NFL_MVP","OPOY","PRO_BOWL"],f:62},
  {n:"Daunte Culpepper",t:["MIN","MIA","OAK","DET"],a:["PRO_BOWL"],f:68},
  {n:"Santonio Holmes",t:["PIT","NYJ"],a:["SB_CHAMP","SB_MVP"],f:60},
  {n:"LeSean McCoy",t:["PHI","BUF","KC","TB"],a:["SB_CHAMP","RUSH_TITLE","PRO_BOWL"],f:78},
  {n:"DeMarco Murray",t:["DAL","PHI","TEN"],a:["OPOY","RUSH_TITLE","PRO_BOWL"],f:70},
  {n:"Jevon Kearse",t:["TEN","PHI"],a:["DROY","PRO_BOWL"],f:65},
  {n:"Jameis Winston",t:["TB","NO","CLE","NYG"],a:["PASS_TITLE","PRO_BOWL"],f:65},
  {n:"Matt Schaub",t:["ATL","HOU","OAK","BAL"],a:["PRO_BOWL"],f:58},
  {n:"Blaine Gabbert",t:["JAX","SF","ARI","TEN","TB"],a:["SB_CHAMP"],f:40},
  {n:"Cedric Benson",t:["CHI","CIN","GB"],a:[],f:48},
  {n:"Randall Cobb",t:["GB","DAL","HOU","NYJ"],a:["PRO_BOWL"],f:62},
  {n:"Marquez Valdes-Scantling",t:["GB","KC","BUF","NO"],a:["SB_CHAMP"],f:50},
  {n:"Mecole Hardman",t:["KC","NYJ"],a:["SB_CHAMP","PRO_BOWL"],f:58},
  {n:"Isiah Pacheco",t:["KC"],a:["SB_CHAMP"],f:65},
  {n:"Creed Humphrey",t:["KC"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Joe Thuney",t:["NE","KC","CHI"],a:["SB_CHAMP","PRO_BOWL"],f:62},
  {n:"Marcus Peters",t:["KC","LAR","BAL","LV"],a:["DROY","PRO_BOWL"],f:68},
  {n:"Chase Young",t:["WAS","SF","NO"],a:["DROY","PRO_BOWL"],f:68},
  {n:"Patrick Surtain II",t:["DEN"],a:["DPOY","PRO_BOWL"],f:80},
  {n:"Jayden Daniels",t:["WAS"],a:["OROY","PRO_BOWL"],f:85},
  {n:"Puka Nacua",t:["LAR"],a:["PRO_BOWL"],f:78},
  {n:"Sam Darnold",t:["NYJ","CAR","SF","MIN","SEA"],a:["PRO_BOWL"],f:65},
  {n:"A.J. Brown",t:["TEN","PHI"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"DeVonta Smith",t:["PHI"],a:["SB_CHAMP"],f:75},
  {n:"Jason Kelce",t:["PHI"],a:["SB_CHAMP","PRO_BOWL"],f:85},
  {n:"Fletcher Cox",t:["PHI"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Chris Godwin",t:["TB"],a:["SB_CHAMP","PRO_BOWL"],f:72},
  {n:"Shaquil Barrett",t:["DEN","TB"],a:["SB_CHAMP","PRO_BOWL"],f:65},
];

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Procedural daily grid — replaces a fixed 30-puzzle list, so it never repeats.
// Criteria pool = the 32 current teams (relocated codes OAK/SD/STL excluded so
// e.g. OAK and LV don't both appear) + the awards. Each day's grid is seeded
// from the date — identical for every user — and validated so every cell has
// answers AND the whole board has a 9-distinct-player solution. Impossible award
// pairs (DPOY×OROY, rushing×passing title) self-reject via empty cells.
// (Generator mirrored in scripts/check-faceoff.mjs — keep in sync.)
const HEADER_POOL = [
  ...Object.keys(NFL_LOGO).filter(t => !['OAK', 'SD', 'STL'].includes(t)),
  ...Object.keys(AWARDS),
];
const AWARD_KEYS = new Set(Object.keys(AWARDS));
const PLAYERS_BY_CRIT = Object.fromEntries(
  HEADER_POOL.map(c => [c, PLAYERS.filter(p => p.t.includes(c) || p.a.includes(c))])
);
const FALLBACK_PUZZLE = { rows: ["NE","DAL","NFL_MVP"], cols: ["SB_CHAMP","GB","PRO_BOWL"] };

function cellPlayers(row, col) {
  return PLAYERS_BY_CRIT[row].filter(p => p.t.includes(col) || p.a.includes(col));
}

// Backtracking perfect-match: can all 9 cells be filled with distinct players?
function boardSolvable(rows, cols) {
  const cells = [];
  for (const r of rows) for (const c of cols) {
    const players = cellPlayers(r, c);
    if (players.length === 0) return false;
    cells.push(players);
  }
  const order = cells.map((players) => players).sort((a, b) => a.length - b.length);
  const used = new Set();
  const go = (k) => {
    if (k === order.length) return true;
    for (const p of order[k]) {
      if (used.has(p.n)) continue;
      used.add(p.n);
      if (go(k + 1)) return true;
      used.delete(p.n);
    }
    return false;
  };
  return go(0);
}

function getDailyPuzzle(dateStr) {
  const seedDate = dateStr ?? new Date().toLocaleDateString('en-CA');
  const seed = parseInt(seedDate.replace(/-/g, ''));
  for (let pass = 0; pass < 2; pass++) {
    for (let attempt = 0; attempt < 800; attempt++) {
      const rng = mulberry32(seed + attempt * 997 + pass * 31337);
      const pool = [...HEADER_POOL];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const rows = pool.slice(0, 3);
      const cols = pool.slice(3, 6);
      if (rows.some(r => cols.includes(r))) continue;
      if (pass === 0) {
        const awards = [...rows, ...cols].filter(h => AWARD_KEYS.has(h)).length;
        if (awards < 1 || awards > 3) continue;
        let thin = false;
        for (const r of rows) { for (const c of cols) { if (cellPlayers(r, c).length < 2) { thin = true; break; } } if (thin) break; }
        if (thin) continue;
      }
      if (boardSolvable(rows, cols)) return { rows, cols };
    }
  }
  return FALLBACK_PUZZLE;
}

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
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
  useSeo(PAGE_SEO.gridiron)
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
    if (AWARDS[key]) return { award: key, label: AWARDS[key], color: '#C9A84C', logoUrl: null };
    const abbr = NFL_LOGO[key];
    return { award: null, label: TEAMS[key] || key, color: '#C9A84C', logoUrl: abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null };
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
    const text = `GRIDIRON by Streakle 🏈 — ${formatDate(puzzleDate)}\nScore: ${totalScore} | ${filled}/9 cells\n${grid}\n\nPlay at: playstreakle.com/gridiron`;
    try {
      if (navigator.share) await navigator.share({text});
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

  return (
    <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:0,paddingBottom:40,color:'#F5F0E8',position:'relative',overflow:'hidden'}}>
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
          <h1 style={{fontSize:30,fontWeight:900,letterSpacing:2,color:'#fff',margin:0}}>GRIDIRON</h1>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#C9A84C',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px'}}>
          📅 Archive
        </button>
      </div>

      <div style={{fontSize:13,color:'#7A6E5F',marginBottom:8,marginTop:6}}>{formatDate(puzzleDate)}</div>

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
            const {award,label,color,logoUrl}=getHeaderContent(col);
            return (
              <div key={ci} style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {logoUrl ? <img src={logoUrl} alt={label} width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/> : <AwardIcon name={award} size={38}/>}
                <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{label}</div>
              </div>
            );
          })}

          {rowHeaders.map((row,ri)=>(
            <React.Fragment key={`row-${ri}`}>
              <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {(()=>{const{award,label,color,logoUrl}=getHeaderContent(row);return(<>{logoUrl?<img src={logoUrl} alt={label} width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/>:<AwardIcon name={award} size={38}/>}<div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{label}</div></>);})()}
              </div>
              {colHeaders.map((col,ci)=>{
                const key=`${ri}-${ci}`;
                const filled=cells[key];
                const isActive=activeCell&&activeCell[0]===ri&&activeCell[1]===ci;
                const isShaking=shakeCell===key;
                return (
                  <div key={key} {...clickableProps(()=>handleCellClick(ri,ci), filled||gameOver||won)} style={{
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
                <div key={i} {...clickableProps(()=>handleSelect(p))} style={{
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
    </main>
  );
}