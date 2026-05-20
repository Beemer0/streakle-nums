import React, { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import AwardIcon from './AwardIcon';

// ── Categories ───────────────────────────────────────────────────────────────

const PROMOTIONS = {
  UFC:"UFC", PRIDE:"Pride FC", BELLATOR:"Bellator",
  ONE:"ONE Championship", STRIKEFORCE:"Strikeforce", WEC:"WEC",
};
const WEIGHT_CLASSES = {
  HW:"Heavyweight", LHW:"Lt. Heavyweight", MW:"Middleweight",
  WW:"Welterweight", LW:"Lightweight", FW:"Featherweight",
  BW:"Bantamweight", FLY:"Flyweight",
  WBW:"W. Bantamweight", WFW:"W. Featherweight",
  WSW:"W. Strawweight", WFly:"W. Flyweight",
};
const ACHIEVEMENTS = {
  CHAMPION:"Champion", MULTI_CHAMP:"Multi-Div Champ",
  HOF:"Hall of Fame", SUB_WIN:"Submission Win",
  KO_WIN:"KO/TKO Win", TITLE_DEF:"3+ Title Defenses",
};

const BADGE = {
  UFC:"UFC", PRIDE:"PRIDE", BELLATOR:"BEL", ONE:"ONE", STRIKEFORCE:"SF", WEC:"WEC",
  HW:"HW", LHW:"LHW", MW:"MW", WW:"WW", LW:"LW", FW:"FW",
  BW:"BW", FLY:"FLY", WBW:"W-BW", WFW:"W-FW", WSW:"W-SW", WFly:"W-FLY",
  CHAMPION:"CHAMP", MULTI_CHAMP:"2×CHAMP", HOF:"HOF",
  SUB_WIN:"SUB", KO_WIN:"KO", TITLE_DEF:"DEF×3",
};
const LABEL = { ...PROMOTIONS, ...WEIGHT_CLASSES, ...ACHIEVEMENTS };

function getHeaderStyle(key) {
  if (key in PROMOTIONS)    return { bg:'rgba(201,168,76,0.12)',  color:'#C9A84C' }
  if (key in WEIGHT_CLASSES) return { bg:'rgba(147,197,253,0.12)', color:'#93C5FD' }
  return                            { bg:'rgba(134,239,172,0.12)', color:'#86EFAC' }
}

// ── Fighters ─────────────────────────────────────────────────────────────────
// p = promotions  w = weight classes  a = achievements  f = fame 0-100

const FIGHTERS = [
  // Heavyweights
  {n:"Jon Jones",p:["UFC"],w:["LHW","HW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:99},
  {n:"Stipe Miocic",p:["UFC"],w:["HW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:88},
  {n:"Daniel Cormier",p:["UFC","STRIKEFORCE"],w:["HW","LHW"],a:["CHAMPION","MULTI_CHAMP","TITLE_DEF","KO_WIN","SUB_WIN","HOF"],f:92},
  {n:"Fedor Emelianenko",p:["PRIDE","STRIKEFORCE","BELLATOR"],w:["HW"],a:["KO_WIN","SUB_WIN"],f:95},
  {n:"Cain Velasquez",p:["UFC"],w:["HW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:82},
  {n:"Junior dos Santos",p:["UFC"],w:["HW"],a:["CHAMPION","KO_WIN"],f:78},
  {n:"Francis Ngannou",p:["UFC"],w:["HW"],a:["CHAMPION","KO_WIN"],f:82},
  {n:"Alistair Overeem",p:["UFC","PRIDE","STRIKEFORCE"],w:["HW","LHW"],a:["KO_WIN"],f:80},
  {n:"Mirko Cro Cop",p:["PRIDE","UFC"],w:["HW"],a:["KO_WIN"],f:88},
  {n:"Mark Hunt",p:["UFC","PRIDE"],w:["HW"],a:["KO_WIN"],f:72},
  {n:"Ryan Bader",p:["UFC","BELLATOR"],w:["LHW","HW"],a:["CHAMPION","KO_WIN"],f:68},
  {n:"Matt Mitrione",p:["UFC","BELLATOR"],w:["HW"],a:["KO_WIN"],f:42},
  {n:"Fabricio Werdum",p:["UFC","STRIKEFORCE","PRIDE"],w:["HW"],a:["CHAMPION","SUB_WIN","KO_WIN"],f:72},
  {n:"Tom Aspinall",p:["UFC"],w:["HW"],a:["CHAMPION","SUB_WIN","KO_WIN"],f:68},
  {n:"Derrick Lewis",p:["UFC"],w:["HW"],a:["KO_WIN"],f:72},
  {n:"Randy Couture",p:["UFC"],w:["HW","LHW"],a:["CHAMPION","MULTI_CHAMP","TITLE_DEF","HOF"],f:90},
  {n:"Bas Rutten",p:["UFC","PRIDE"],w:["HW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:72},
  {n:"Cheick Kongo",p:["UFC","BELLATOR"],w:["HW"],a:["KO_WIN"],f:45},
  {n:"Sergei Pavlovich",p:["UFC"],w:["HW"],a:["KO_WIN"],f:60},
  {n:"Vitor Belfort",p:["UFC","PRIDE"],w:["MW","LHW","HW"],a:["CHAMPION","KO_WIN","HOF"],f:80},
  // Light Heavyweights
  {n:"Chuck Liddell",p:["UFC"],w:["LHW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:95},
  {n:"Tito Ortiz",p:["UFC","BELLATOR"],w:["LHW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:88},
  {n:"Wanderlei Silva",p:["PRIDE","UFC","BELLATOR"],w:["LHW","MW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:90},
  {n:"Quinton Jackson",p:["PRIDE","UFC"],w:["LHW"],a:["CHAMPION","KO_WIN","HOF"],f:85},
  {n:"Shogun Rua",p:["PRIDE","UFC"],w:["LHW"],a:["CHAMPION","KO_WIN"],f:80},
  {n:"Lyoto Machida",p:["UFC","BELLATOR"],w:["LHW","MW"],a:["CHAMPION","KO_WIN"],f:75},
  {n:"Forrest Griffin",p:["UFC"],w:["LHW"],a:["CHAMPION","HOF"],f:72},
  {n:"Rashad Evans",p:["UFC"],w:["LHW"],a:["CHAMPION","KO_WIN","HOF"],f:75},
  {n:"Glover Teixeira",p:["UFC"],w:["LHW"],a:["CHAMPION","SUB_WIN","KO_WIN"],f:68},
  {n:"Jan Blachowicz",p:["UFC"],w:["LHW"],a:["CHAMPION","KO_WIN"],f:65},
  {n:"Jiri Prochazka",p:["UFC"],w:["LHW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:68},
  {n:"Dan Henderson",p:["UFC","PRIDE","STRIKEFORCE","BELLATOR"],w:["LHW","MW"],a:["CHAMPION","KO_WIN","HOF"],f:82},
  {n:"Gegard Mousasi",p:["UFC","BELLATOR","STRIKEFORCE"],w:["LHW","MW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:72},
  {n:"Brian Stann",p:["UFC","WEC"],w:["LHW","MW"],a:["KO_WIN"],f:48},
  {n:"Alex Pereira",p:["UFC"],w:["MW","LHW"],a:["CHAMPION","MULTI_CHAMP","TITLE_DEF","KO_WIN"],f:82},
  {n:"Anthony Johnson",p:["UFC","BELLATOR"],w:["WW","LW","LHW"],a:["KO_WIN"],f:68},
  {n:"Ken Shamrock",p:["UFC","PRIDE"],w:["MW","LHW"],a:["CHAMPION","HOF"],f:72},
  // Middleweights
  {n:"Anderson Silva",p:["UFC","PRIDE"],w:["MW","LHW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN","HOF"],f:99},
  {n:"Georges St-Pierre",p:["UFC"],w:["WW","MW"],a:["CHAMPION","MULTI_CHAMP","TITLE_DEF","HOF"],f:99},
  {n:"Michael Bisping",p:["UFC"],w:["MW"],a:["CHAMPION","KO_WIN","HOF"],f:80},
  {n:"Chris Weidman",p:["UFC"],w:["MW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:72},
  {n:"Luke Rockhold",p:["UFC","STRIKEFORCE"],w:["MW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:70},
  {n:"Robert Whittaker",p:["UFC"],w:["WW","MW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:78},
  {n:"Israel Adesanya",p:["UFC"],w:["MW","LHW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:88},
  {n:"Sean Strickland",p:["UFC"],w:["WW","MW"],a:["CHAMPION","KO_WIN"],f:65},
  {n:"Dricus du Plessis",p:["UFC"],w:["MW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:68},
  {n:"Nate Marquardt",p:["UFC","PRIDE","STRIKEFORCE"],w:["MW","WW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Rich Franklin",p:["UFC","ONE"],w:["MW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:72},
  {n:"Demian Maia",p:["UFC"],w:["MW","WW"],a:["SUB_WIN"],f:65},
  {n:"Paulo Costa",p:["UFC"],w:["MW"],a:["KO_WIN"],f:65},
  {n:"Jacare Souza",p:["UFC","STRIKEFORCE","BELLATOR"],w:["MW"],a:["CHAMPION","SUB_WIN","KO_WIN"],f:68},
  {n:"Yoel Romero",p:["UFC","BELLATOR"],w:["MW"],a:["KO_WIN","SUB_WIN"],f:68},
  {n:"Derek Brunson",p:["UFC","STRIKEFORCE"],w:["MW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Frank Shamrock",p:["UFC","STRIKEFORCE"],w:["MW"],a:["CHAMPION","TITLE_DEF","SUB_WIN"],f:68},
  // Welterweights
  {n:"Matt Hughes",p:["UFC"],w:["WW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","HOF"],f:85},
  {n:"Robbie Lawler",p:["UFC","STRIKEFORCE","BELLATOR"],w:["WW","MW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:80},
  {n:"Tyron Woodley",p:["UFC","STRIKEFORCE"],w:["WW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:75},
  {n:"Kamaru Usman",p:["UFC"],w:["WW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:85},
  {n:"Leon Edwards",p:["UFC"],w:["WW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:75},
  {n:"Colby Covington",p:["UFC"],w:["WW"],a:["KO_WIN"],f:65},
  {n:"Jorge Masvidal",p:["UFC","STRIKEFORCE"],w:["WW","LW"],a:["KO_WIN"],f:72},
  {n:"Nick Diaz",p:["UFC","PRIDE","STRIKEFORCE","BELLATOR"],w:["WW","LW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:78},
  {n:"Carlos Condit",p:["UFC","WEC"],w:["WW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:68},
  {n:"Matt Serra",p:["UFC"],w:["WW"],a:["CHAMPION","KO_WIN","HOF"],f:65},
  {n:"Johny Hendricks",p:["UFC"],w:["WW"],a:["CHAMPION","KO_WIN"],f:65},
  {n:"Stephen Thompson",p:["UFC"],w:["WW"],a:["KO_WIN"],f:65},
  {n:"Belal Muhammad",p:["UFC"],w:["WW"],a:["CHAMPION","TITLE_DEF"],f:62},
  {n:"Douglas Lima",p:["BELLATOR"],w:["WW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN"],f:62},
  {n:"Ben Askren",p:["UFC","ONE","BELLATOR"],w:["WW"],a:["CHAMPION","SUB_WIN"],f:65},
  {n:"Donald Cerrone",p:["UFC","WEC"],w:["LW","WW"],a:["KO_WIN","SUB_WIN"],f:68},
  {n:"Royce Gracie",p:["UFC"],w:["WW","LW"],a:["CHAMPION","SUB_WIN","HOF"],f:90},
  // Lightweights
  {n:"Khabib Nurmagomedov",p:["UFC"],w:["LW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","HOF"],f:97},
  {n:"Conor McGregor",p:["UFC"],w:["FW","LW"],a:["CHAMPION","MULTI_CHAMP","KO_WIN","HOF"],f:99},
  {n:"BJ Penn",p:["UFC"],w:["WW","LW"],a:["CHAMPION","MULTI_CHAMP","SUB_WIN","HOF"],f:92},
  {n:"Charles Oliveira",p:["UFC"],w:["LW","FW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:82},
  {n:"Islam Makhachev",p:["UFC"],w:["LW"],a:["CHAMPION","TITLE_DEF","SUB_WIN"],f:80},
  {n:"Eddie Alvarez",p:["UFC","BELLATOR","ONE"],w:["LW"],a:["CHAMPION","KO_WIN"],f:68},
  {n:"Michael Chandler",p:["UFC","BELLATOR"],w:["LW"],a:["CHAMPION","KO_WIN"],f:70},
  {n:"Dustin Poirier",p:["UFC"],w:["LW","FW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:80},
  {n:"Tony Ferguson",p:["UFC"],w:["LW"],a:["KO_WIN","SUB_WIN"],f:72},
  {n:"Justin Gaethje",p:["UFC"],w:["LW"],a:["CHAMPION","KO_WIN"],f:72},
  {n:"Nate Diaz",p:["UFC","STRIKEFORCE","WEC"],w:["WW","LW"],a:["SUB_WIN","KO_WIN"],f:78},
  {n:"Frankie Edgar",p:["UFC","WEC","BELLATOR"],w:["LW","FW","BW"],a:["CHAMPION","HOF"],f:78},
  {n:"Benson Henderson",p:["UFC","WEC","ONE"],w:["LW","FW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:72},
  {n:"Gilbert Melendez",p:["UFC","STRIKEFORCE"],w:["LW"],a:["CHAMPION","TITLE_DEF"],f:62},
  {n:"Patricio Pitbull",p:["BELLATOR"],w:["FW","LW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:65},
  {n:"Jim Miller",p:["UFC"],w:["LW"],a:["SUB_WIN","KO_WIN"],f:52},
  {n:"Paddy Pimblett",p:["UFC"],w:["LW"],a:["SUB_WIN","KO_WIN"],f:60},
  // Featherweights
  {n:"Jose Aldo",p:["UFC","WEC"],w:["FW"],a:["CHAMPION","TITLE_DEF","KO_WIN","HOF"],f:92},
  {n:"Max Holloway",p:["UFC"],w:["FW","LW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:88},
  {n:"Alex Volkanovski",p:["UFC"],w:["FW","LW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:88},
  {n:"Illia Topuria",p:["UFC"],w:["FW","LW"],a:["CHAMPION","KO_WIN"],f:72},
  {n:"Brian Ortega",p:["UFC"],w:["FW"],a:["SUB_WIN"],f:65},
  {n:"Yair Rodriguez",p:["UFC"],w:["FW"],a:["KO_WIN","SUB_WIN"],f:62},
  {n:"Calvin Kattar",p:["UFC"],w:["FW"],a:["KO_WIN"],f:52},
  {n:"Chan Sung Jung",p:["UFC","WEC"],w:["FW"],a:["SUB_WIN","KO_WIN"],f:62},
  {n:"Cub Swanson",p:["UFC","WEC"],w:["FW"],a:["KO_WIN"],f:55},
  {n:"Urijah Faber",p:["UFC","WEC"],w:["BW","FW"],a:["HOF","SUB_WIN","KO_WIN"],f:78},
  // Bantamweights
  {n:"Dominick Cruz",p:["UFC","WEC"],w:["BW"],a:["CHAMPION","TITLE_DEF","HOF"],f:80},
  {n:"TJ Dillashaw",p:["UFC"],w:["BW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:72},
  {n:"Aljamain Sterling",p:["UFC"],w:["BW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:68},
  {n:"Sean O'Malley",p:["UFC"],w:["BW"],a:["CHAMPION","KO_WIN"],f:72},
  {n:"Petr Yan",p:["UFC"],w:["BW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:65},
  {n:"Cody Garbrandt",p:["UFC"],w:["BW"],a:["CHAMPION","KO_WIN"],f:62},
  {n:"Henry Cejudo",p:["UFC"],w:["FLY","BW"],a:["CHAMPION","MULTI_CHAMP","KO_WIN","SUB_WIN"],f:72},
  {n:"Merab Dvalishvili",p:["UFC"],w:["BW"],a:["CHAMPION","SUB_WIN"],f:62},
  {n:"Bibiano Fernandes",p:["ONE","WEC"],w:["BW"],a:["CHAMPION","TITLE_DEF","SUB_WIN"],f:65},
  {n:"Joseph Benavidez",p:["UFC","WEC"],w:["FLY","BW"],a:["KO_WIN","SUB_WIN"],f:55},
  // Flyweights
  {n:"Demetrious Johnson",p:["UFC","WEC","ONE"],w:["FLY","BW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN","HOF"],f:90},
  {n:"Brandon Moreno",p:["UFC"],w:["FLY"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:72},
  {n:"Deiveson Figueiredo",p:["UFC","ONE"],w:["FLY","BW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN"],f:68},
  {n:"Adriano Moraes",p:["ONE"],w:["FLY"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:55},
  {n:"Alexandre Pantoja",p:["UFC","ONE"],w:["FLY"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:60},
  // Women's Bantamweight
  {n:"Ronda Rousey",p:["UFC","STRIKEFORCE"],w:["WBW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","HOF"],f:95},
  {n:"Amanda Nunes",p:["UFC"],w:["WBW","WFW"],a:["CHAMPION","MULTI_CHAMP","TITLE_DEF","KO_WIN","SUB_WIN"],f:92},
  {n:"Holly Holm",p:["UFC"],w:["WBW","WFW"],a:["CHAMPION","KO_WIN","HOF"],f:72},
  {n:"Miesha Tate",p:["UFC","STRIKEFORCE"],w:["WBW"],a:["CHAMPION","SUB_WIN"],f:65},
  {n:"Raquel Pennington",p:["UFC"],w:["WBW"],a:["CHAMPION","KO_WIN"],f:52},
  // Women's Featherweight
  {n:"Cris Cyborg",p:["UFC","BELLATOR","STRIKEFORCE"],w:["WFW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:85},
  {n:"Megan Anderson",p:["UFC","BELLATOR"],w:["WFW"],a:["KO_WIN"],f:40},
  // Women's Flyweight
  {n:"Valentina Shevchenko",p:["UFC"],w:["WFly","WBW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN"],f:85},
  {n:"Alexa Grasso",p:["UFC"],w:["WFly","WSW"],a:["CHAMPION","TITLE_DEF","SUB_WIN"],f:62},
  // Women's Strawweight
  {n:"Rose Namajunas",p:["UFC"],w:["WSW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN"],f:72},
  {n:"Zhang Weili",p:["UFC","ONE"],w:["WSW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN"],f:72},
  {n:"Joanna Jedrzejczyk",p:["UFC"],w:["WSW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:80},
  {n:"Angela Lee",p:["ONE"],w:["WSW","WFly"],a:["CHAMPION","TITLE_DEF","SUB_WIN"],f:62},
  {n:"Carla Esparza",p:["UFC"],w:["WSW"],a:["CHAMPION","SUB_WIN"],f:55},
  {n:"Tatiana Suarez",p:["UFC"],w:["WSW"],a:["CHAMPION","SUB_WIN"],f:52},
  // ── Additional Heavyweights ──
  {n:"Antonio Rodrigo Nogueira",p:["PRIDE","UFC"],w:["HW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN","HOF"],f:88},
  {n:"Andrei Arlovski",p:["UFC","STRIKEFORCE","BELLATOR"],w:["HW"],a:["CHAMPION","KO_WIN"],f:75},
  {n:"Brock Lesnar",p:["UFC"],w:["HW"],a:["CHAMPION","KO_WIN","HOF"],f:82},
  {n:"Frank Mir",p:["UFC"],w:["HW"],a:["CHAMPION","SUB_WIN","HOF"],f:72},
  {n:"Tim Sylvia",p:["UFC"],w:["HW"],a:["CHAMPION","TITLE_DEF","KO_WIN"],f:62},
  {n:"Shane Carwin",p:["UFC"],w:["HW"],a:["CHAMPION","KO_WIN"],f:62},
  {n:"Heath Herring",p:["PRIDE","UFC"],w:["HW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Igor Vovchanchyn",p:["PRIDE"],w:["HW","LHW"],a:["KO_WIN","SUB_WIN"],f:65},
  {n:"Kevin Randleman",p:["PRIDE","UFC"],w:["HW","LHW"],a:["CHAMPION","KO_WIN"],f:58},
  {n:"Roy Nelson",p:["UFC","BELLATOR"],w:["HW"],a:["KO_WIN"],f:60},
  {n:"Pedro Rizzo",p:["PRIDE","UFC"],w:["HW"],a:["KO_WIN"],f:58},
  {n:"Stefan Struve",p:["UFC"],w:["HW"],a:["SUB_WIN","KO_WIN"],f:52},
  {n:"Jai Herbert",p:["UFC"],w:["LW"],a:["KO_WIN"],f:40},
  // ── Additional Light Heavyweights ──
  {n:"Antonio Rogerio Nogueira",p:["PRIDE","UFC"],w:["LHW","MW"],a:["KO_WIN","SUB_WIN"],f:65},
  {n:"Keith Jardine",p:["UFC","WEC"],w:["LHW","MW"],a:["KO_WIN"],f:50},
  {n:"Thiago Silva",p:["UFC"],w:["LHW"],a:["KO_WIN"],f:48},
  {n:"Ovince Saint Preux",p:["UFC"],w:["LHW"],a:["SUB_WIN","KO_WIN"],f:48},
  // ── Additional Middleweights ──
  {n:"Chael Sonnen",p:["UFC","STRIKEFORCE","BELLATOR"],w:["MW","LHW"],a:["CHAMPION","SUB_WIN"],f:80},
  {n:"Kazushi Sakuraba",p:["PRIDE","UFC"],w:["MW","WW"],a:["CHAMPION","SUB_WIN","KO_WIN","HOF"],f:88},
  {n:"Yushin Okami",p:["UFC","PRIDE"],w:["MW"],a:["KO_WIN","SUB_WIN"],f:58},
  {n:"Tim Kennedy",p:["UFC","STRIKEFORCE"],w:["MW"],a:["KO_WIN"],f:55},
  {n:"Ronaldo Lima",p:["PRIDE","UFC"],w:["MW"],a:["KO_WIN","SUB_WIN"],f:45},
  {n:"Mark Munoz",p:["UFC"],w:["MW"],a:["KO_WIN"],f:50},
  {n:"Alan Belcher",p:["UFC"],w:["MW"],a:["KO_WIN","SUB_WIN"],f:48},
  // ── Additional Welterweights ──
  {n:"Rory MacDonald",p:["UFC","BELLATOR","ONE"],w:["WW"],a:["CHAMPION","KO_WIN"],f:68},
  {n:"Jake Shields",p:["UFC","STRIKEFORCE","BELLATOR","PRIDE"],w:["WW","MW"],a:["CHAMPION","SUB_WIN"],f:65},
  {n:"Diego Sanchez",p:["UFC"],w:["WW","LW"],a:["HOF","KO_WIN","SUB_WIN"],f:68},
  {n:"Paul Daley",p:["UFC","STRIKEFORCE","BELLATOR"],w:["WW"],a:["KO_WIN"],f:60},
  {n:"Lorenz Larkin",p:["UFC","BELLATOR","ONE"],w:["WW","MW"],a:["KO_WIN"],f:52},
  {n:"Edson Barboza",p:["UFC"],w:["LW","WW"],a:["KO_WIN"],f:65},
  {n:"Kevin Holland",p:["UFC","BELLATOR"],w:["WW","MW"],a:["KO_WIN","SUB_WIN"],f:58},
  {n:"Vicente Luque",p:["UFC"],w:["WW"],a:["KO_WIN","SUB_WIN"],f:58},
  // ── Additional Lightweights ──
  {n:"Takanori Gomi",p:["PRIDE","UFC"],w:["LW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:80},
  {n:"Gray Maynard",p:["UFC","WEC"],w:["LW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Joe Lauzon",p:["UFC"],w:["LW"],a:["SUB_WIN","KO_WIN"],f:55},
  {n:"Shinya Aoki",p:["ONE","BELLATOR"],w:["LW","WW"],a:["CHAMPION","SUB_WIN"],f:70},
  {n:"Dan Hooker",p:["UFC","ONE"],w:["LW","FW"],a:["KO_WIN","SUB_WIN"],f:60},
  {n:"Paul Felder",p:["UFC"],w:["LW"],a:["KO_WIN","SUB_WIN"],f:52},
  {n:"Kevin Lee",p:["UFC"],w:["LW","MW"],a:["SUB_WIN","KO_WIN"],f:55},
  {n:"Drew Dober",p:["UFC"],w:["LW"],a:["KO_WIN","SUB_WIN"],f:48},
  {n:"Beneil Dariush",p:["UFC"],w:["LW"],a:["SUB_WIN","KO_WIN"],f:55},
  {n:"Jalin Turner",p:["UFC"],w:["LW"],a:["SUB_WIN","KO_WIN"],f:50},
  // ── Additional Featherweights ──
  {n:"Arnold Allen",p:["UFC"],w:["FW"],a:["KO_WIN","SUB_WIN"],f:52},
  {n:"Movsar Evloev",p:["UFC"],w:["FW"],a:["SUB_WIN"],f:48},
  {n:"Giga Chikadze",p:["UFC"],w:["FW"],a:["KO_WIN"],f:52},
  {n:"Kron Gracie",p:["UFC"],w:["FW"],a:["SUB_WIN"],f:52},
  {n:"Sodiq Yusuff",p:["UFC"],w:["FW"],a:["KO_WIN"],f:50},
  // ── Additional Bantamweights ──
  {n:"Renan Barao",p:["UFC","WEC"],w:["BW"],a:["CHAMPION","TITLE_DEF","KO_WIN","SUB_WIN"],f:72},
  {n:"Marlon Moraes",p:["UFC","WEC","ONE"],w:["BW"],a:["KO_WIN","SUB_WIN"],f:60},
  {n:"John Lineker",p:["UFC","ONE"],w:["BW","FLY"],a:["CHAMPION","KO_WIN"],f:58},
  {n:"Raphael Assuncao",p:["UFC","STRIKEFORCE"],w:["BW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Pedro Munhoz",p:["UFC"],w:["BW"],a:["KO_WIN","SUB_WIN"],f:52},
  {n:"Rob Font",p:["UFC"],w:["BW"],a:["KO_WIN","SUB_WIN"],f:52},
  {n:"Marlon Vera",p:["UFC"],w:["BW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Jimmie Rivera",p:["UFC"],w:["BW"],a:["KO_WIN"],f:48},
  // ── Additional Flyweights ──
  {n:"Ian McCall",p:["UFC","WEC"],w:["FLY"],a:["SUB_WIN","KO_WIN"],f:48},
  {n:"Jussier Formiga",p:["UFC"],w:["FLY"],a:["SUB_WIN"],f:50},
  {n:"Tim Elliott",p:["UFC","WEC"],w:["FLY"],a:["SUB_WIN","KO_WIN"],f:45},
  {n:"Sergio Pettis",p:["UFC","BELLATOR"],w:["FLY","BW"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:52},
  {n:"Kai Kara-France",p:["UFC","ONE"],w:["FLY"],a:["KO_WIN"],f:55},
  {n:"Manel Kape",p:["UFC","ONE"],w:["FLY","FW"],a:["KO_WIN","SUB_WIN"],f:48},
  {n:"Matheus Nicolau",p:["UFC","ONE"],w:["FLY"],a:["SUB_WIN"],f:45},
  // ── Additional Women's Bantamweight ──
  {n:"Julianna Pena",p:["UFC"],w:["WBW"],a:["CHAMPION","SUB_WIN"],f:65},
  {n:"Germaine de Randamie",p:["UFC"],w:["WBW","WFW"],a:["CHAMPION","KO_WIN"],f:62},
  {n:"Cat Zingano",p:["UFC"],w:["WBW"],a:["KO_WIN","SUB_WIN"],f:60},
  {n:"Sara McMann",p:["UFC","STRIKEFORCE"],w:["WBW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Liz Carmouche",p:["UFC","BELLATOR"],w:["WBW"],a:["SUB_WIN","KO_WIN"],f:55},
  {n:"Jessica Eye",p:["UFC"],w:["WBW","WFly"],a:["KO_WIN"],f:50},
  {n:"Aspen Ladd",p:["UFC","BELLATOR"],w:["WBW"],a:["KO_WIN","SUB_WIN"],f:48},
  // ── Additional Women's Flyweight ──
  {n:"Jessica Andrade",p:["UFC"],w:["WBW","WSW","WFly"],a:["CHAMPION","KO_WIN","SUB_WIN"],f:70},
  {n:"Cynthia Calvillo",p:["UFC"],w:["WSW","WFly"],a:["SUB_WIN"],f:52},
  {n:"Maycee Barber",p:["UFC"],w:["WFly","WSW"],a:["KO_WIN","SUB_WIN"],f:55},
  {n:"Andrea Lee",p:["UFC"],w:["WFly"],a:["KO_WIN","SUB_WIN"],f:48},
  {n:"Viviane Araujo",p:["UFC"],w:["WFly"],a:["KO_WIN"],f:48},
  // ── Additional Women's Strawweight ──
  {n:"Mackenzie Dern",p:["UFC"],w:["WSW"],a:["SUB_WIN"],f:62},
  {n:"Claudia Gadelha",p:["UFC"],w:["WSW"],a:["SUB_WIN","KO_WIN"],f:60},
  {n:"Karolina Kowalkiewicz",p:["UFC"],w:["WSW"],a:["KO_WIN"],f:55},
  {n:"Paige VanZant",p:["UFC","BELLATOR"],w:["WSW"],a:["KO_WIN","SUB_WIN"],f:58},
  {n:"Marina Rodriguez",p:["UFC"],w:["WSW","WFly"],a:["KO_WIN","SUB_WIN"],f:55},
  // ── ONE Championship specific ──
  {n:"Aung La N Sang",p:["ONE"],w:["MW","LHW"],a:["CHAMPION","MULTI_CHAMP","TITLE_DEF","KO_WIN"],f:58},
  {n:"Christian Lee",p:["ONE"],w:["LW","WW"],a:["CHAMPION","TITLE_DEF","SUB_WIN","KO_WIN"],f:58},
  {n:"Stamp Fairtex",p:["ONE"],w:["WSW","WFly","WFW"],a:["CHAMPION","MULTI_CHAMP","KO_WIN","SUB_WIN"],f:55},
  {n:"Ok Rae Yoon",p:["ONE"],w:["LW"],a:["CHAMPION","KO_WIN"],f:50},
  {n:"Thanh Le",p:["ONE"],w:["FW"],a:["CHAMPION","KO_WIN"],f:52},
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchesHeader(fighter, header) {
  if (header in PROMOTIONS)    return fighter.p.includes(header);
  if (header in WEIGHT_CLASSES) return fighter.w.includes(header);
  if (header in ACHIEVEMENTS)  return fighter.a.includes(header);
  return false;
}

function calcScore(fighter) {
  return Math.max(5, Math.min(100, Math.round(115 - fighter.f)));
}

function mulberry32(a) {
  return function() {
    a|=0; a=a+0x6D2B79F5|0;
    var t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
function dateToSeed(s) { return s.split('-').reduce((a,n)=>a*100+parseInt(n),0); }

const HEADER_POOL = [
  'UFC','PRIDE','BELLATOR','ONE','STRIKEFORCE','WEC',
  'HW','LHW','MW','WW','LW','FW','BW','FLY','WBW','WSW',
  'CHAMPION','MULTI_CHAMP','HOF','SUB_WIN','KO_WIN','TITLE_DEF',
];

function getDailyPuzzle(dateStr) {
  const seed = dateToSeed(dateStr);
  for (let attempt = 0; attempt < 600; attempt++) {
    const rng = mulberry32(seed + attempt * 997);
    const shuffled = [...HEADER_POOL].sort(() => rng() - 0.5);
    const rows = shuffled.slice(0, 3);
    const cols = shuffled.slice(3, 6);
    const all6 = [...rows, ...cols];
    // Require at least 1 promotion + 1 weight class among all 6 headers
    if (!all6.some(h => h in PROMOTIONS))    continue;
    if (!all6.some(h => h in WEIGHT_CLASSES)) continue;
    // No duplicates across rows/cols
    if (rows.some(r => cols.includes(r))) continue;
    // Every cell must have ≥2 valid fighters
    let valid = true;
    for (const row of rows) {
      for (const col of cols) {
        if (FIGHTERS.filter(f => matchesHeader(f,row) && matchesHeader(f,col)).length < 2) {
          valid = false; break;
        }
      }
      if (!valid) break;
    }
    if (valid) return { rows, cols };
  }
  return { rows:['UFC','PRIDE','MW'], cols:['CHAMPION','KO_WIN','SUB_WIN'] };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const css = `
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
.ko-grid{display:grid;grid-template-columns:90px repeat(3,110px);grid-template-rows:70px repeat(3,100px);gap:4px;padding:0 12px}
@media(max-width:480px){.ko-grid{grid-template-columns:72px repeat(3,88px);grid-template-rows:60px repeat(3,86px)}}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnockoutGame() {
  const { streak } = useStreak('knockout');
  const [showArchive, setShowArchive] = useState(false);
  const [puzzleDate, setPuzzleDate] = useState(null);
  const puzzle = useMemo(() => puzzleDate ? getDailyPuzzle(puzzleDate) : null, [puzzleDate]);
  const { rows: rowHeaders = [], cols: colHeaders = [] } = puzzle || {};

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
  const [totalScore, setTotalScore] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setPuzzleDate(today);
  }, []);

  // Auto-focus input when cell becomes active
  useEffect(() => {
    if (activeCell) setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeCell]);

  function handleCellClick(ri, ci) {
    if (won || gameOver) return;
    const key = `${ri}-${ci}`;
    if (cells[key]) return;
    setActiveCell([ri, ci]);
    setQuery('');
    setSuggestions([]);
    setPendingPlayer(null);
  }

  function handleQuery(val) {
    setQuery(val);
    setPendingPlayer(null);
    if (!val.trim()) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    const used = new Set(Object.values(cells).map(c => c.player.n));
    const results = FIGHTERS
      .filter(f => f.n.toLowerCase().includes(q) && !used.has(f.n))
      .sort((a,b) => b.f - a.f)
      .slice(0, 8);
    setSuggestions(results);
  }

  function handleSelect(fighter) {
    setPendingPlayer(fighter);
  }

  function handleConfirm() {
    if (!pendingPlayer || !activeCell) return;
    const [ri, ci] = activeCell;
    const key = `${ri}-${ci}`;
    const row = rowHeaders[ri];
    const col = colHeaders[ci];

    const valid = matchesHeader(pendingPlayer, row) && matchesHeader(pendingPlayer, col);

    if (!valid) {
      setShakeCell(key);
      setTimeout(() => setShakeCell(null), 500);
      const newGuesses = guessesLeft - 1;
      setGuessesLeft(newGuesses);
      if (newGuesses === 0) {
        setGameOver(true);
        saveResult('knockout', puzzleDate, false, totalScore);
      }
      setQuery('');
      setSuggestions([]);
      setPendingPlayer(null);
      return;
    }

    const score = calcScore(pendingPlayer);
    const newCells = { ...cells, [key]: { player: pendingPlayer, score } };
    setCells(newCells);
    const newTotal = totalScore + score;
    setTotalScore(newTotal);
    setQuery('');
    setSuggestions([]);
    setPendingPlayer(null);
    setActiveCell(null);

    const newGuesses = guessesLeft - 1;
    setGuessesLeft(newGuesses);

    if (Object.keys(newCells).length === 9) {
      setWon(true);
      saveResult('knockout', puzzleDate, true, newTotal);
      const colors = ['#C9A84C','#fff','#86EFAC','#FCA5A5','#93C5FD'];
      setConfetti(Array.from({length:30},(_,i)=>({
        id:i, x:Math.random()*100, size:Math.random()*10+6,
        color:colors[i%colors.length], delay:Math.random()*400,
      })));
      return;
    }

    if (newGuesses === 0) {
      setGameOver(true);
      saveResult('knockout', puzzleDate, false, newTotal);
    }
  }

  function handleSelectDate(date) {
    setPuzzleDate(date);
    setShowArchive(false);
    setCells({});
    setGuessesLeft(9);
    setWon(false);
    setGameOver(false);
    setTotalScore(0);
    setActiveCell(null);
    setQuery('');
    setSuggestions([]);
    setPendingPlayer(null);
    setConfetti([]);
  }

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

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:30,fontWeight:900,letterSpacing:2,color:'#fff'}}>KNOCKOUT</div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#C9A84C',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
        <button onClick={()=>setShowArchive(true)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px'}}>
          📅 Archive
        </button>
      </div>

      <div style={{fontSize:13,color:'#7A6E5F',marginBottom:8,marginTop:6}}>{formatDate(puzzleDate)}</div>

      {/* Legend */}
      <div style={{display:'flex',gap:12,marginBottom:10,fontSize:11,fontWeight:600}}>
        <span style={{color:'#C9A84C'}}>■ Promotion</span>
        <span style={{color:'#93C5FD'}}>■ Division</span>
        <span style={{color:'#86EFAC'}}>■ Achievement</span>
      </div>

      {showHow && (
        <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:10,padding:16,maxWidth:340,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#C9A84C'}}>How to play</b><br/>
          Fill the 3×3 grid with MMA fighters. Each answer must satisfy <b>both</b> the row and column criteria.<br/><br/>
          Criteria can be a <b>promotion</b> (fighter competed there), a <b>weight class</b> (fighter competed at that weight), or an <b>achievement</b>.<br/><br/>
          Each fighter can only be used <b>once</b>. You have <b>9 guesses</b> — one per cell.<br/><br/>
          🏆 Rarer answers score higher. Max score: ~900.
        </div>
      )}

      <div style={{display:'flex',gap:24,marginBottom:8,fontSize:14}}>
        <div style={{color:'#C9A84C',fontWeight:700}}>Score: {totalScore}</div>
        <div style={{color:guessesLeft<=3?'#e94560':'#C9A84C',fontWeight:700}}>
          {won?'Complete!':gameOver?'Game over':`${guessesLeft} guess${guessesLeft!==1?'es':''} left`}
        </div>
      </div>

      {streak > 0 && (
        <div style={{fontSize:13,color:'#C9A84C',fontWeight:600,marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {/* Grid */}
      <div style={{overflowX:'auto',width:'100%',display:'flex',justifyContent:'center'}}>
        <div className="ko-grid">
          {/* Top-left blank */}
          <div style={{background:'transparent'}}/>

          {/* Column headers */}
          {colHeaders.map((col,ci)=>{
            const {bg,color}=getHeaderStyle(col);
            return (
              <div key={ci} style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {col in ACHIEVEMENTS
                  ? <AwardIcon name={col} size={32}/>
                  : <div style={{background:bg,border:`1px solid ${color}40`,borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:800,color,letterSpacing:0.5}}>{BADGE[col]}</div>}
                <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{LABEL[col]}</div>
              </div>
            );
          })}

          {/* Rows */}
          {rowHeaders.map((row,ri)=>(
            <React.Fragment key={`row-${ri}`}>
              {/* Row header */}
              <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {(()=>{const{bg,color}=getHeaderStyle(row);return(<>{row in ACHIEVEMENTS?<AwardIcon name={row} size={32}/>:<div style={{background:bg,border:`1px solid ${color}40`,borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:800,color,letterSpacing:0.5}}>{BADGE[row]}</div>}<div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{LABEL[row]}</div></>);})()}
              </div>
              {/* Cells */}
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
      {activeCell && !won && !gameOver && (
        <div style={{marginTop:16,width:'100%',maxWidth:340,padding:'0 12px',boxSizing:'border-box',animation:'slideUp 0.3s ease'}}>
          <div style={{fontSize:12,color:'#7A6E5F',marginBottom:6,textAlign:'center'}}>
            {LABEL[rowHeaders[activeCell[0]]]} × {LABEL[colHeaders[activeCell[1]]]}
          </div>
          <input ref={inputRef} value={query} onChange={e=>handleQuery(e.target.value)}
            placeholder="Search MMA fighter..."
            style={{width:'100%',boxSizing:'border-box',background:'#1C1A16',border:`2px solid ${pendingPlayer?'#4caf50':'#C9A84C'}`,borderRadius:8,color:'#fff',fontSize:15,padding:'10px 14px',outline:'none'}}
          />
          {suggestions.length > 0 && (
            <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:8,marginTop:4,overflow:'hidden'}}>
              {suggestions.map((f,i)=>(
                <div key={i} onClick={()=>handleSelect(f)} style={{
                  padding:'10px 14px',cursor:'pointer',fontSize:13,
                  borderBottom:i<suggestions.length-1?'1px solid #2C2820':'none',
                  background:pendingPlayer?.n===f.n?'#1a3a2a':'transparent',
                  transition:'background 0.15s',
                }}
                  onMouseOver={e=>e.currentTarget.style.background='#2C2418'}
                  onMouseOut={e=>e.currentTarget.style.background=pendingPlayer?.n===f.n?'#1a3a2a':'transparent'}
                >
                  <span style={{color:'#F5F0E8',fontWeight:600}}>{f.n}</span>
                  <span style={{color:'#5A5040',fontSize:11,marginLeft:8}}>
                    {f.w.map(w=>WEIGHT_CLASSES[w]||w).join(' / ')}
                  </span>
                </div>
              ))}
            </div>
          )}
          {pendingPlayer && (
            <button onClick={handleConfirm} style={{
              marginTop:10,width:'100%',background:'#C9A84C',border:'none',
              borderRadius:8,color:'#0F0E0C',fontSize:14,fontWeight:700,
              padding:'11px',cursor:'pointer',transition:'background 0.15s',
            }}
              onMouseOver={e=>e.currentTarget.style.background='#D4B45A'}
              onMouseOut={e=>e.currentTarget.style.background='#C9A84C'}
            >
              Confirm: {pendingPlayer.n}
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {(won || gameOver) && (
        <div style={{marginTop:20,textAlign:'center',animation:'slideUp 0.4s ease'}}>
          <div style={{fontSize:22,fontWeight:800,color:won?'#C9A84C':'#FCA5A5',marginBottom:4}}>
            {won ? '🥊 Flawless Victory!' : 'Game Over'}
          </div>
          <div style={{fontSize:14,color:'#7A6E5F'}}>
            Final score: <b style={{color:'#C9A84C'}}>{totalScore}</b>
          </div>
        </div>
      )}

      {showArchive && (
        <Archive game="knockout" onClose={()=>setShowArchive(false)} onSelectDate={handleSelectDate} />
      )}
    </div>
  );
}
