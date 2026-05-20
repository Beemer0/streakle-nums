import React, { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import AwardIcon from './AwardIcon';
import { clickableProps } from './a11y';

const TEAMS = {
  ANA:"Ducks",ARI:"Coyotes",BOS:"Bruins",BUF:"Sabres",
  CAR:"Hurricanes",CBJ:"Blue Jackets",CGY:"Flames",CHI:"Blackhawks",
  COL:"Avalanche",DAL:"Stars",DET:"Red Wings",EDM:"Oilers",FLA:"Panthers",
  LAK:"Kings",MIN:"Wild",MTL:"Canadiens",NJD:"Devils",NSH:"Predators",
  NYI:"Islanders",NYR:"Rangers",OTT:"Senators",PHI:"Flyers",PIT:"Penguins",
  SEA:"Kraken",SJS:"Sharks",STL:"Blues",TBL:"Lightning",TOR:"Maple Leafs",
  VAN:"Canucks",VGK:"Golden Knights",WPG:"Jets",WSH:"Capitals",
  // Historical / relocated
  ATL:"Thrashers",HFD:"Whalers",QUE:"Nordiques",WIN:"Jets (old)",PHX:"Coyotes",
  UTA:"Utah HC",ARZ:"Coyotes",
};

const AWARDS = {
  SC_CHAMP:"Stanley Cup Champ",
  CONN_SMYTHE:"Conn Smythe Trophy",
  HART:"Hart Trophy (MVP)",
  ALL_STAR:"NHL All-Star",
  VEZINA:"Vezina Trophy",
  NORRIS:"Norris Trophy",
  ART_ROSS:"Art Ross Trophy",
  CALDER:"Calder Trophy",
  SELKE:"Selke Trophy",
  TED_LINDSAY:"Ted Lindsay Award",
};

const NHL_LOGO = {
  ANA:'ana',ARI:'ari',BOS:'bos',BUF:'buf',CAR:'car',
  CBJ:'cbj',CGY:'cgy',CHI:'chi',COL:'col',DAL:'dal',
  DET:'det',EDM:'edm',FLA:'fla',LAK:'la',MIN:'min',
  MTL:'mtl',NJD:'nj',NSH:'nsh',NYI:'nyi',NYR:'nyr',
  OTT:'ott',PHI:'phi',PIT:'pit',SEA:'sea',SJS:'sj',
  STL:'stl',TBL:'tb',TOR:'tor',VAN:'van',VGK:'vgk',
  WPG:'wpg',WSH:'wsh',
};

const PLAYERS = [
  // ── LEGENDS ──
  {n:"Wayne Gretzky",t:["EDM","LAK","STL","NYR"],a:["SC_CHAMP","HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:99},
  {n:"Mario Lemieux",t:["PIT"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY","CALDER"],f:99},
  {n:"Gordie Howe",t:["DET"],a:["HART","ALL_STAR","ART_ROSS"],f:99},
  {n:"Bobby Orr",t:["BOS"],a:["SC_CHAMP","HART","ALL_STAR","NORRIS"],f:99},
  {n:"Steve Yzerman",t:["DET"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","SELKE"],f:98},
  {n:"Mark Messier",t:["EDM","NYR","VAN"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","TED_LINDSAY"],f:98},
  {n:"Patrick Roy",t:["MTL","COL"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","VEZINA"],f:99},
  {n:"Ray Bourque",t:["BOS","COL"],a:["SC_CHAMP","ALL_STAR","NORRIS"],f:97},
  {n:"Brendan Shanahan",t:["NJD","STL","HFD","DET","NYR"],a:["SC_CHAMP","ALL_STAR"],f:88},
  {n:"Brett Hull",t:["CGY","STL","DAL","DET","PHX"],a:["SC_CHAMP","HART","ALL_STAR","TED_LINDSAY","ART_ROSS"],f:97},
  {n:"Joe Sakic",t:["QUE","COL"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:97},
  {n:"Martin Brodeur",t:["NJD","STL"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","VEZINA"],f:98},
  {n:"Nicklas Lidstrom",t:["DET"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS"],f:98},
  {n:"Peter Forsberg",t:["QUE","COL","PHI","NSH"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY","CALDER"],f:99},
  {n:"Jarome Iginla",t:["CGY","PIT","BOS","COL","LAK"],a:["ALL_STAR","ART_ROSS","TED_LINDSAY"],f:92},
  {n:"Martin St. Louis",t:["CGY","TBL","NYR"],a:["SC_CHAMP","HART","ALL_STAR","ART_ROSS","TED_LINDSAY","CALDER"],f:90},
  {n:"Mats Sundin",t:["QUE","TOR","VAN"],a:["ALL_STAR"],f:88},
  {n:"Scott Stevens",t:["WSH","STL","NJD"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR"],f:92},
  {n:"Chris Chelios",t:["MTL","CHI","DET","ATL"],a:["SC_CHAMP","ALL_STAR","NORRIS"],f:92},
  {n:"Paul Kariya",t:["ANA","COL","NSH","STL"],a:["ALL_STAR","TED_LINDSAY"],f:88},
  {n:"Teemu Selanne",t:["WIN","ANA","SJS","COL"],a:["SC_CHAMP","ALL_STAR","CALDER","TED_LINDSAY","ART_ROSS"],f:95},
  {n:"Dominik Hasek",t:["BUF","DET","OTT","COL"],a:["SC_CHAMP","HART","ALL_STAR","VEZINA","TED_LINDSAY"],f:98},
  {n:"Eric Lindros",t:["PHI","NYR","TOR","DAL"],a:["HART","ALL_STAR","TED_LINDSAY"],f:90},
  {n:"Mike Modano",t:["MIN","DAL","DET"],a:["SC_CHAMP","ALL_STAR"],f:90},
  {n:"Mike Vernon",t:["CGY","DET","SJS","FLA","NJD"],a:["SC_CHAMP","CONN_SMYTHE"],f:72},
  {n:"Curtis Joseph",t:["STL","EDM","TOR","DET","PHX","CGY"],a:["ALL_STAR"],f:78},
  {n:"Ed Belfour",t:["CHI","SJS","DAL","TOR","FLA"],a:["SC_CHAMP","ALL_STAR","VEZINA","CALDER"],f:85},
  {n:"Mike Richter",t:["NYR"],a:["SC_CHAMP","ALL_STAR"],f:78},
  {n:"Chris Osgood",t:["DET","STL","NYI"],a:["SC_CHAMP"],f:72},
  {n:"Olaf Kolzig",t:["WSH"],a:["ALL_STAR","VEZINA"],f:68},
  {n:"Felix Potvin",t:["TOR","NYI","VAN","LAK","BOS"],a:["ALL_STAR"],f:70},
  {n:"Kirk McLean",t:["NJD","VAN","CAR","FLA","COL"],a:["ALL_STAR"],f:65},

  // ── ACTIVE/RECENT STARS ──
  {n:"Sidney Crosby",t:["PIT"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:99},
  {n:"Alexander Ovechkin",t:["WSH"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:99},
  {n:"Evgeni Malkin",t:["PIT"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","CALDER"],f:95},
  {n:"Nikita Kucherov",t:["TBL"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:97},
  {n:"Nathan MacKinnon",t:["COL"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","TED_LINDSAY"],f:98},
  {n:"Connor McDavid",t:["EDM"],a:["HART","ALL_STAR","ART_ROSS","TED_LINDSAY","CALDER"],f:99},
  {n:"Leon Draisaitl",t:["EDM"],a:["HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:95},
  {n:"David Pastrnak",t:["BOS"],a:["ALL_STAR","ART_ROSS","TED_LINDSAY"],f:92},
  {n:"Auston Matthews",t:["TOR"],a:["ALL_STAR","ART_ROSS","TED_LINDSAY","CALDER"],f:95},
  {n:"Mitch Marner",t:["TOR"],a:["ALL_STAR"],f:85},
  {n:"Artemi Panarin",t:["CHI","CBJ","NYR"],a:["ALL_STAR","CALDER","TED_LINDSAY"],f:90},
  {n:"Mark Scheifele",t:["WPG"],a:["ALL_STAR"],f:80},
  {n:"Kyle Connor",t:["WPG"],a:["ALL_STAR"],f:78},
  {n:"Patrik Laine",t:["WPG","CBJ","MTL"],a:["ALL_STAR","CALDER"],f:80},
  {n:"Blake Wheeler",t:["BOS","ATL","WPG"],a:["ALL_STAR"],f:75},
  {n:"Jonathan Marchessault",t:["FLA","VGK","NSH"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR"],f:78},
  {n:"Reilly Smith",t:["BOS","DAL","FLA","VGK","PIT"],a:["SC_CHAMP"],f:62},
  {n:"William Karlsson",t:["ANA","CBJ","VGK"],a:["SC_CHAMP","ALL_STAR"],f:68},
  {n:"Brayden McNabb",t:["BUF","LAK","VGK"],a:["SC_CHAMP"],f:45},
  {n:"Marc-Andre Fleury",t:["PIT","VGK","CHI","MIN"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","VEZINA"],f:92},
  {n:"Braden Holtby",t:["WSH","VAN","DAL"],a:["SC_CHAMP","ALL_STAR","VEZINA"],f:82},
  {n:"Tuukka Rask",t:["BOS"],a:["ALL_STAR","VEZINA"],f:80},
  {n:"Henrik Lundqvist",t:["NYR","WSH"],a:["ALL_STAR","VEZINA"],f:92},
  {n:"Pekka Rinne",t:["NSH"],a:["ALL_STAR","VEZINA"],f:82},
  {n:"Carey Price",t:["MTL"],a:["HART","ALL_STAR","VEZINA","TED_LINDSAY"],f:92},
  {n:"Andrei Vasilevskiy",t:["TBL"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","VEZINA"],f:92},
  {n:"Igor Shesterkin",t:["NYR"],a:["ALL_STAR","VEZINA","TED_LINDSAY"],f:88},
  {n:"Frederik Andersen",t:["ANA","TOR","CAR","OTT"],a:["ALL_STAR"],f:72},
  {n:"John Gibson",t:["ANA"],a:["ALL_STAR"],f:75},
  {n:"Sergei Bobrovsky",t:["PHI","CBJ","FLA"],a:["ALL_STAR","VEZINA"],f:82},
  {n:"Jaroslav Halak",t:["MTL","STL","WSH","NYI","BOS","VAN"],a:["ALL_STAR"],f:68},
  {n:"Ben Bishop",t:["OTT","TBL","LAK","DAL"],a:["ALL_STAR"],f:70},
  {n:"Corey Crawford",t:["CHI"],a:["SC_CHAMP"],f:72},
  {n:"Jimmy Howard",t:["DET"],a:["ALL_STAR"],f:65},
  {n:"Robin Lehner",t:["OTT","BUF","NYI","CHI","VGK"],a:["ALL_STAR","VEZINA"],f:70},
  {n:"Semyon Varlamov",t:["WSH","COL","NYI"],a:["ALL_STAR"],f:68},

  // ── DEFENSEMEN ──
  {n:"Erik Karlsson",t:["OTT","SJS","PIT"],a:["ALL_STAR","NORRIS"],f:90},
  {n:"Drew Doughty",t:["LAK"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS"],f:90},
  {n:"Victor Hedman",t:["TBL"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS"],f:95},
  {n:"Shea Weber",t:["NSH","MTL"],a:["ALL_STAR","NORRIS"],f:88},
  {n:"P.K. Subban",t:["MTL","NSH","NJD"],a:["ALL_STAR","NORRIS"],f:85},
  {n:"Roman Josi",t:["NSH"],a:["ALL_STAR","NORRIS"],f:88},
  {n:"John Carlson",t:["WSH"],a:["SC_CHAMP","ALL_STAR","NORRIS"],f:80},
  {n:"Kris Letang",t:["PIT"],a:["SC_CHAMP","ALL_STAR","NORRIS"],f:85},
  {n:"Alex Pietrangelo",t:["STL","VGK"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS"],f:85},
  {n:"Mark Giordano",t:["CGY","SEA","TOR"],a:["ALL_STAR","NORRIS"],f:78},
  {n:"Aaron Ekblad",t:["FLA"],a:["ALL_STAR","CALDER"],f:78},
  {n:"Jonathan Toews",t:["CHI"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","SELKE","TED_LINDSAY"],f:92},
  {n:"Duncan Keith",t:["CHI","EDM"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS"],f:90},
  {n:"Brent Seabrook",t:["CHI"],a:["SC_CHAMP"],f:72},
  {n:"Scott Niedermayer",t:["NJD","ANA"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS"],f:95},
  {n:"Chris Pronger",t:["HFD","STL","EDM","ANA","PHI"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","NORRIS"],f:95},
  {n:"Zdeno Chara",t:["NYI","OTT","BOS","WSH"],a:["SC_CHAMP","ALL_STAR","NORRIS"],f:88},
  {n:"Marc-Edouard Vlasic",t:["SJS"],a:["ALL_STAR"],f:65},
  {n:"Jake Muzzin",t:["LAK","TOR"],a:["SC_CHAMP"],f:60},
  {n:"Brent Burns",t:["MIN","SJS","CAR"],a:["ALL_STAR","NORRIS"],f:85},
  {n:"Ryan Suter",t:["NSH","MIN","DAL"],a:["ALL_STAR"],f:78},
  {n:"Ryan McDonagh",t:["NYR","TBL"],a:["SC_CHAMP","ALL_STAR"],f:75},
  {n:"Marc Methot",t:["CBJ","OTT","VGK","DAL"],a:["SC_CHAMP"],f:52},
  {n:"Josh Morrissey",t:["WPG"],a:["ALL_STAR"],f:72},
  {n:"Adam Fox",t:["NYR"],a:["ALL_STAR","NORRIS"],f:82},
  {n:"Cale Makar",t:["COL"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS","CALDER"],f:95},
  {n:"Quinn Hughes",t:["VAN"],a:["ALL_STAR","NORRIS"],f:85},
  {n:"Rasmus Dahlin",t:["BUF"],a:["ALL_STAR","NORRIS"],f:82},
  {n:"Dougie Hamilton",t:["BOS","CGY","CAR","NJD"],a:["ALL_STAR","NORRIS"],f:78},
  {n:"Devon Toews",t:["NYI","COL"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Mattias Ekholm",t:["NSH","EDM","ANA"],a:["ALL_STAR"],f:68},
  {n:"Jared Spurgeon",t:["MIN"],a:["ALL_STAR"],f:65},
  {n:"Morgan Rielly",t:["TOR"],a:["ALL_STAR"],f:72},
  {n:"Justin Faulk",t:["CAR","STL"],a:["SC_CHAMP","ALL_STAR"],f:68},
  {n:"Oliver Ekman-Larsson",t:["PHX","ARI","VAN"],a:["ALL_STAR"],f:72},
  {n:"Ivan Provorov",t:["PHI","BOS","CBJ"],a:["ALL_STAR"],f:62},
  {n:"Darnell Nurse",t:["EDM"],a:["ALL_STAR"],f:65},
  {n:"Seth Jones",t:["NSH","CBJ","CHI"],a:["ALL_STAR","NORRIS"],f:78},
  {n:"Mikhail Sergachev",t:["TBL","UTA"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Noah Hanifin",t:["CAR","CGY","VGK"],a:["SC_CHAMP","ALL_STAR"],f:68},

  // ── FORWARDS ──
  {n:"Jaromir Jagr",t:["PIT","WSH","NYR","PHI","DAL","BOS","NJD","FLA"],a:["SC_CHAMP","HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:97},
  {n:"Joe Nieuwendyk",t:["CGY","DAL","NJD","TOR","FLA"],a:["SC_CHAMP","CONN_SMYTHE","CALDER"],f:85},
  {n:"Luc Robitaille",t:["LAK","PIT","NYR","DET"],a:["SC_CHAMP","ALL_STAR","CALDER","TED_LINDSAY"],f:88},
  {n:"Pat Verbeek",t:["NJD","NYR","DAL","DET"],a:["SC_CHAMP"],f:72},
  {n:"Sergei Fedorov",t:["DET","ANA","CBJ","WSH"],a:["SC_CHAMP","HART","ALL_STAR","SELKE","TED_LINDSAY"],f:95},
  {n:"Brendan Morrison",t:["NJD","VAN","DAL","ANA","WSH","CGY"],a:["SC_CHAMP"],f:52},
  {n:"Brian Leetch",t:["NYR","TOR","BOS"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","NORRIS","CALDER"],f:92},
  {n:"Doug Weight",t:["NYR","EDM","STL","CAR","ANA","NYI"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Keith Tkachuk",t:["WIN","WPG","PHX","STL","ATL"],a:["ALL_STAR","TED_LINDSAY"],f:80},
  {n:"Pierre Turgeon",t:["BUF","NYI","MTL","STL","DAL","COL"],a:["ALL_STAR","ART_ROSS"],f:80},
  {n:"Jeremy Roenick",t:["CHI","PHX","PHI","LAK","SJS"],a:["ALL_STAR"],f:82},
  {n:"Dino Ciccarelli",t:["MIN","WSH","DET","TBL","FLA"],a:["SC_CHAMP","ALL_STAR"],f:78},
  {n:"Neal Broten",t:["MIN","DAL","NJD","LAK"],a:["SC_CHAMP"],f:65},
  {n:"Joe Mullen",t:["STL","CGY","PIT","BOS"],a:["SC_CHAMP"],f:72},
  {n:"Doug Gilmour",t:["STL","CGY","TOR","NJD","CHI","BUF","MTL"],a:["SC_CHAMP","SELKE"],f:82},
  {n:"Mark Recchi",t:["PIT","PHI","MTL","CAR","ATL","BOS","TBL"],a:["SC_CHAMP","ALL_STAR"],f:80},
  {n:"Adam Oates",t:["DET","STL","BOS","WSH","PHI","ANA","EDM"],a:["ALL_STAR","ART_ROSS"],f:82},
  {n:"John LeClair",t:["MTL","PHI","PIT"],a:["SC_CHAMP","ALL_STAR"],f:80},
  {n:"Keith Primeau",t:["DET","HFD","CAR","PHI"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Geoff Sanderson",t:["HFD","CAR","VAN","BUF","CBJ","PHX","STL"],a:[],f:55},
  {n:"Ron Francis",t:["HFD","PIT","CAR","TOR"],a:["SC_CHAMP","ALL_STAR","SELKE"],f:88},
  {n:"Pat Quinn",t:["TOR","VAN"],a:[],f:55},
  {n:"Nicklas Backstrom",t:["WSH"],a:["SC_CHAMP","ALL_STAR"],f:88},
  {n:"Alex Semin",t:["WSH","CAR","MTL"],a:["SC_CHAMP","ALL_STAR"],f:68},
  {n:"Mike Green",t:["WSH","DET","EDM"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Jay Beagle",t:["WSH","VAN","ARI"],a:["SC_CHAMP"],f:38},
  {n:"Lars Eller",t:["STL","MTL","WSH"],a:["SC_CHAMP"],f:52},
  {n:"Tom Wilson",t:["WSH"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"T.J. Oshie",t:["STL","WSH"],a:["SC_CHAMP","ALL_STAR"],f:78},
  {n:"Evgeny Kuznetsov",t:["WSH"],a:["SC_CHAMP","ALL_STAR"],f:80},
  {n:"Jakub Vrana",t:["WSH","DET"],a:["SC_CHAMP"],f:52},
  {n:"Andre Burakovsky",t:["WSH","COL","SEA"],a:["SC_CHAMP"],f:55},
  {n:"Daniel Carr",t:["MTL","VGK","STL"],a:["SC_CHAMP"],f:35},
  {n:"Devante Smith-Pelly",t:["ANA","NJD","MTL","WSH"],a:["SC_CHAMP"],f:42},
  {n:"Claude Giroux",t:["PHI","OTT","FLA"],a:["ALL_STAR","TED_LINDSAY"],f:82},
  {n:"Wayne Simmonds",t:["LAK","PHI","NSH","NJD","BUF","TOR"],a:["ALL_STAR"],f:65},
  {n:"Jakub Voracek",t:["CBJ","PHI"],a:["ALL_STAR"],f:72},
  {n:"Sean Couturier",t:["PHI"],a:["ALL_STAR","SELKE"],f:80},
  {n:"James van Riemsdyk",t:["PHI","TOR"],a:["ALL_STAR"],f:68},
  {n:"Jeff Carter",t:["PHI","CBJ","LAK","PIT","MTL"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Mike Richards",t:["PHI","LAK","WSH"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Simon Gagne",t:["PHI","TBL","LAK","BOS"],a:["SC_CHAMP","ALL_STAR"],f:68},
  {n:"Scott Hartnell",t:["NSH","PHI","CBJ"],a:["ALL_STAR"],f:60},
  {n:"Ryan Getzlaf",t:["ANA"],a:["SC_CHAMP","ALL_STAR"],f:88},
  {n:"Corey Perry",t:["ANA","DAL","MTL","CBJ","TBL","EDM"],a:["SC_CHAMP","HART","ALL_STAR","TED_LINDSAY"],f:85},
  {n:"Bobby Ryan",t:["ANA","OTT","DET"],a:["ALL_STAR"],f:68},
  {n:"Ryan Kesler",t:["VAN","ANA","PHX"],a:["SC_CHAMP","ALL_STAR","SELKE"],f:78},
  {n:"Henrik Sedin",t:["VAN"],a:["HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:88},
  {n:"Daniel Sedin",t:["VAN"],a:["ALL_STAR","ART_ROSS"],f:85},
  {n:"Roberto Luongo",t:["NYI","FLA","VAN"],a:["ALL_STAR","VEZINA"],f:85},
  {n:"Ryan Callahan",t:["NYR","TBL","OTT"],a:["ALL_STAR","SELKE"],f:65},
  {n:"Marian Hossa",t:["OTT","ATL","PIT","DET","CHI"],a:["SC_CHAMP","ALL_STAR","SELKE"],f:88},
  {n:"Patrick Sharp",t:["PHI","CHI","DAL"],a:["SC_CHAMP","ALL_STAR"],f:75},
  {n:"Bryan Bickell",t:["CHI","CAR","TBL"],a:["SC_CHAMP"],f:48},
  {n:"Kris Versteeg",t:["CHI","FLA","COL","LAK","CAR"],a:["SC_CHAMP"],f:52},
  {n:"Marcus Kruger",t:["CHI","VGK","VAN"],a:["SC_CHAMP"],f:40},
  {n:"Brandon Saad",t:["CHI","CBJ","COL","STL"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Andrew Shaw",t:["CHI","MTL"],a:["SC_CHAMP"],f:52},
  {n:"Antoine Vermette",t:["OTT","CBJ","PHX","CHI","ARI","ANA"],a:["SC_CHAMP"],f:52},
  {n:"Brad Richards",t:["TBL","DAL","NYR","CHI"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR"],f:78},
  {n:"Vincent Lecavalier",t:["TBL","PHI","LAK","NJD"],a:["SC_CHAMP","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:85},
  {n:"Dave Andreychuk",t:["BUF","TOR","NJD","BOS","COL","TBL"],a:["SC_CHAMP"],f:75},
  {n:"Ruslan Fedotenko",t:["PHI","TBL","PIT","NYR","NYI","PHX"],a:["SC_CHAMP"],f:52},
  {n:"Nate Thompson",t:["BOS","NYI","TBL","ANA","MTL","PHX","OTT","PHI"],a:["SC_CHAMP"],f:35},
  {n:"Sean Rodriguez",t:["ANA","TBL","PIT","CAR","NJD","EDM"],a:["SC_CHAMP"],f:38},
  {n:"Kevin Shattenkirk",t:["COL","STL","WSH","NYR","ANA","TBL"],a:["SC_CHAMP"],f:60},
  {n:"Ondrej Palat",t:["TBL","NJD"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Tyler Johnson",t:["TBL","CHI","ARI"],a:["SC_CHAMP"],f:58},
  {n:"Brayden Point",t:["TBL"],a:["SC_CHAMP","ALL_STAR"],f:88},
  {n:"Steven Stamkos",t:["TBL"],a:["SC_CHAMP","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:92},
  {n:"Pat Maroon",t:["EDM","NJD","STL","TBL","MIN"],a:["SC_CHAMP"],f:48},
  {n:"Yanni Gourde",t:["TBL","SEA"],a:["SC_CHAMP"],f:52},
  {n:"Blake Coleman",t:["NJD","TBL","CGY","ANA"],a:["SC_CHAMP"],f:52},
  {n:"Barclay Goodrow",t:["SJS","TBL","NYR"],a:["SC_CHAMP"],f:45},
  {n:"Zach Bogosian",t:["ATL","WPG","BUF","TBL","TOR"],a:["SC_CHAMP"],f:45},
  {n:"Joe Pavelski",t:["SJS","DAL"],a:["ALL_STAR"],f:80},
  {n:"Logan Couture",t:["SJS"],a:["ALL_STAR"],f:75},
  {n:"Patrick Marleau",t:["SJS","TOR","PIT","MTL"],a:["ALL_STAR"],f:78},
  {n:"Joe Thornton",t:["BOS","SJS","TOR","FLA"],a:["HART","ALL_STAR","ART_ROSS","TED_LINDSAY"],f:90},
  {n:"Evander Kane",t:["ATL","WPG","BUF","SJS","EDM","ANA"],a:["ALL_STAR"],f:68},
  {n:"Tomas Hertl",t:["SJS","VGK"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Martin Jones",t:["LAK","SJS","PHI"],a:[],f:55},
  {n:"Dustin Brown",t:["LAK"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR"],f:75},
  {n:"Anze Kopitar",t:["LAK"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","SELKE","TED_LINDSAY"],f:90},
  {n:"Justin Williams",t:["PHI","CAR","LAK","WSH"],a:["SC_CHAMP","CONN_SMYTHE"],f:72},
  {n:"Trevor Lewis",t:["LAK","WPG"],a:["SC_CHAMP"],f:42},
  {n:"Dwight King",t:["LAK","MTL","FLA"],a:["SC_CHAMP"],f:40},
  {n:"Kyle Clifford",t:["LAK","TOR","STL"],a:["SC_CHAMP"],f:40},
  {n:"Colin Fraser",t:["PHI","CHI","EDM","LAK","CAR"],a:["SC_CHAMP"],f:30},
  {n:"Jarret Stoll",t:["EDM","LAK","MIN","NYR","BOS"],a:["SC_CHAMP"],f:48},
  {n:"Rob Scuderi",t:["PIT","LAK","CHI"],a:["SC_CHAMP"],f:40},
  {n:"Slava Voynov",t:["LAK"],a:["SC_CHAMP"],f:45},
  {n:"Tanner Pearson",t:["LAK","PIT","VAN","NJD","BOS","CAR"],a:["SC_CHAMP"],f:50},
  {n:"Tyler Toffoli",t:["LAK","VAN","MTL","CGY","NJD"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Marian Gaborik",t:["MIN","NYR","CBJ","LAK","OTT"],a:["SC_CHAMP","ALL_STAR"],f:75},
  {n:"Scott Parse",t:["LAK"],a:["SC_CHAMP"],f:28},
  {n:"Ryan Smyth",t:["EDM","NYI","COL","LAK","MIN"],a:["ALL_STAR"],f:68},
  {n:"Nikolai Zherdev",t:["CBJ","NYR","PHI"],a:[],f:45},
  {n:"Derick Brassard",t:["CBJ","NYR","OTT","PIT","FLA","COL","EDM","STL","NYI"],a:[],f:52},
  {n:"Mats Zuccarello",t:["NYR","DAL","MIN"],a:["ALL_STAR"],f:68},
  {n:"Rick Nash",t:["CBJ","NYR","BOS"],a:["ALL_STAR","TED_LINDSAY"],f:82},
  {n:"Chris Kreider",t:["NYR"],a:["ALL_STAR"],f:72},
  {n:"Derek Stepan",t:["NYR","ARI","OTT","CAR"],a:[],f:60},
  {n:"Brendan Lemieux",t:["WPG","NYR","LAK"],a:[],f:35},
  {n:"Alexis Lafreniere",t:["NYR"],a:["CALDER","ALL_STAR"],f:72},
  {n:"Kaapo Kakko",t:["NYR"],a:[],f:55},
  {n:"Brady Tkachuk",t:["OTT"],a:["ALL_STAR"],f:80},
  {n:"Tim Stutzle",t:["OTT"],a:["ALL_STAR","CALDER"],f:78},
  {n:"Josh Norris",t:["OTT"],a:["ALL_STAR"],f:65},
  {n:"Mark Stone",t:["OTT","VGK"],a:["SC_CHAMP","ALL_STAR","SELKE"],f:82},
  {n:"Kyle Turris",t:["PHX","OTT","NSH","EDM"],a:[],f:55},
  {n:"Mike Hoffman",t:["OTT","FLA","STL","MTL"],a:["ALL_STAR"],f:62},
  {n:"Kyle Okposo",t:["NYI","BUF"],a:["ALL_STAR"],f:60},
  {n:"John Tavares",t:["NYI","TOR"],a:["ALL_STAR","TED_LINDSAY"],f:90},
  {n:"Mathew Barzal",t:["NYI","STL"],a:["ALL_STAR","CALDER"],f:82},
  {n:"Brock Nelson",t:["NYI"],a:["ALL_STAR"],f:68},
  {n:"Anders Lee",t:["NYI"],a:["ALL_STAR"],f:65},
  {n:"Josh Bailey",t:["NYI"],a:[],f:52},
  {n:"Casey Cizikas",t:["NYI"],a:[],f:42},
  {n:"Ryan Pulock",t:["NYI"],a:["ALL_STAR"],f:62},
  {n:"Jordan Eberle",t:["EDM","NYI","SEA"],a:["ALL_STAR"],f:68},
  {n:"Andrew Ladd",t:["CAR","EDM","CHI","ATL","WPG","NYI","ARI"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Ilya Kovalchuk",t:["ATL","NJD","LAK","MTL"],a:["ALL_STAR","TED_LINDSAY"],f:85},
  {n:"Dany Heatley",t:["ATL","OTT","SJS","MIN","ANA"],a:["ALL_STAR","TED_LINDSAY"],f:80},
  {n:"Tobias Enstrom",t:["ATL","WPG"],a:["ALL_STAR"],f:55},
  {n:"Bryan Little",t:["ATL","WPG"],a:[],f:52},
  {n:"Patrik Berglund",t:["STL"],a:[],f:45},
  {n:"David Perron",t:["STL","EDM","PIT","VGK","BUF","DET"],a:["SC_CHAMP","ALL_STAR"],f:62},
  {n:"Ryan O'Reilly",t:["COL","BUF","STL","TOR","NSH"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","SELKE","TED_LINDSAY"],f:85},
  {n:"Vladimir Tarasenko",t:["STL","NYR","OTT","FLA"],a:["SC_CHAMP","ALL_STAR"],f:82},
  {n:"Colton Parayko",t:["STL"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Jaden Schwartz",t:["STL","SEA"],a:["SC_CHAMP","ALL_STAR"],f:62},
  {n:"Jordan Binnington",t:["STL"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR"],f:78},
  {n:"Vince Dunn",t:["STL","SEA"],a:["SC_CHAMP","ALL_STAR"],f:55},
  {n:"Ivan Barbashev",t:["STL","VGK"],a:["SC_CHAMP"],f:52},
  {n:"Oskar Sundqvist",t:["PIT","STL"],a:["SC_CHAMP"],f:45},
  {n:"Sammy Blais",t:["STL","NYR"],a:["SC_CHAMP"],f:38},
  {n:"Mackenzie MacEachern",t:["STL","ARI"],a:["SC_CHAMP"],f:30},
  {n:"Tyler Bozak",t:["TOR","STL"],a:["SC_CHAMP"],f:52},
  {n:"Michael Del Zotto",t:["NYR","NSH","VAN","PHI","STL","ANA"],a:["SC_CHAMP"],f:42},
  {n:"Carl Gunnarsson",t:["TOR","STL"],a:["SC_CHAMP"],f:38},
  {n:"Ville Husso",t:["STL","DET"],a:["SC_CHAMP"],f:45},
  {n:"Joel Edmundson",t:["STL","CAR","MTL","WSH"],a:["SC_CHAMP"],f:45},
  {n:"Robert Bortuzzo",t:["PIT","STL","COL"],a:["SC_CHAMP"],f:35},
  {n:"Mikko Rantanen",t:["COL"],a:["SC_CHAMP","ALL_STAR","TED_LINDSAY"],f:90},
  {n:"Gabriel Landeskog",t:["COL"],a:["SC_CHAMP","ALL_STAR","CALDER"],f:82},
  {n:"Nazem Kadri",t:["TOR","COL","CGY"],a:["SC_CHAMP","ALL_STAR"],f:75},
  {n:"Darren Helm",t:["DET","COL"],a:["SC_CHAMP"],f:38},
  {n:"Nico Sturm",t:["MIN","COL","SJS","ANA"],a:["SC_CHAMP"],f:38},
  {n:"J.T. Compher",t:["BUF","COL","DET"],a:["SC_CHAMP"],f:45},
  {n:"Logan O'Connor",t:["COL"],a:["SC_CHAMP"],f:35},
  {n:"Nicolas Aube-Kubel",t:["PHI","COL","TOR","NYR","WSH"],a:["SC_CHAMP"],f:35},
  {n:"Josh Manson",t:["ANA","COL"],a:["SC_CHAMP"],f:45},
  {n:"Jack Johnson",t:["LAK","CBJ","PIT","COL","NYR","CHI"],a:["SC_CHAMP"],f:45},
  {n:"Andrew Cogliano",t:["EDM","ANA","DAL","COL","NYR"],a:["SC_CHAMP"],f:48},
  {n:"Samuel Girard",t:["NSH","COL"],a:["SC_CHAMP","ALL_STAR"],f:58},
  {n:"Erik Johnson",t:["STL","COL"],a:["ALL_STAR"],f:60},
  {n:"Ryan Graves",t:["NYR","COL","NJD"],a:["SC_CHAMP"],f:45},
  {n:"Bowen Byram",t:["COL","BUF"],a:["SC_CHAMP","ALL_STAR"],f:60},
  {n:"Brad Hunt",t:["NSH","EDM","STL","MIN","COL"],a:["SC_CHAMP"],f:28},
  {n:"Patrice Bergeron",t:["BOS"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","SELKE","TED_LINDSAY"],f:95},
  {n:"Brad Marchand",t:["BOS"],a:["SC_CHAMP","ALL_STAR","TED_LINDSAY"],f:90},
  {n:"Milan Lucic",t:["BOS","LAK","EDM","CGY","FLA"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Andrew Ference",t:["CGY","PIT","BOS","EDM"],a:["SC_CHAMP"],f:48},
  {n:"Shawn Thornton",t:["CHI","BOS","FLA"],a:["SC_CHAMP"],f:40},
  {n:"Gregory Campbell",t:["FLA","BOS","EDM","CBJ"],a:["SC_CHAMP"],f:35},
  {n:"Tomas Kaberle",t:["TOR","BOS","MTL","CAR"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Nathan Horton",t:["FLA","BOS","CBJ"],a:["SC_CHAMP"],f:60},
  {n:"Rich Peverley",t:["NSH","ATL","BOS","DAL"],a:["SC_CHAMP"],f:45},
  {n:"Michael Ryder",t:["MTL","BOS","DAL","NJD"],a:["SC_CHAMP"],f:52},
  {n:"Chris Kelly",t:["OTT","BOS","CHI"],a:["SC_CHAMP"],f:40},
  {n:"Tyler Seguin",t:["BOS","DAL"],a:["ALL_STAR"],f:82},
  {n:"Torey Krug",t:["BOS","STL"],a:["SC_CHAMP","ALL_STAR"],f:72},
  {n:"Kevan Miller",t:["BOS","ARI"],a:["SC_CHAMP"],f:35},
  {n:"Adam McQuaid",t:["BOS","NYR","CBJ"],a:["SC_CHAMP"],f:35},
  {n:"Johnny Boychuk",t:["BOS","NYI"],a:["SC_CHAMP"],f:55},
  {n:"Dennis Seidenberg",t:["PHI","CGY","FLA","BOS","NYI"],a:["SC_CHAMP"],f:48},
  {n:"Daniel Paille",t:["BUF","BOS"],a:["SC_CHAMP"],f:35},
  {n:"John-Michael Liles",t:["COL","TOR","CAR","BOS"],a:[],f:42},
  {n:"Ryan Whitney",t:["PIT","EDM","ANA","FLA"],a:[],f:40},
  {n:"Jeff Skinner",t:["CAR","BUF"],a:["ALL_STAR","CALDER"],f:68},
  {n:"Elias Lindholm",t:["CAR","CGY","VAN"],a:["ALL_STAR","SELKE"],f:78},
  {n:"Sebastian Aho",t:["CAR"],a:["ALL_STAR","TED_LINDSAY"],f:85},
  {n:"Andrei Svechnikov",t:["CAR"],a:["ALL_STAR"],f:80},
  {n:"Teuvo Teravainen",t:["CHI","CAR"],a:["ALL_STAR"],f:72},
  {n:"Jaccob Slavin",t:["CAR"],a:["ALL_STAR","SELKE"],f:72},
  {n:"Petr Mrazek",t:["DET","PHI","CAR","TOR","CHI"],a:[],f:52},
  {n:"Jordan Staal",t:["PIT","CAR"],a:["SC_CHAMP","ALL_STAR","SELKE"],f:75},
  {n:"Ron Hainsey",t:["MTL","ATL","WPG","CAR","PIT","TOR","OTT"],a:["SC_CHAMP"],f:42},
  {n:"Lee Stempniak",t:["STL","CGY","TOR","PHX","NYR","PIT","NJD","BOS","CAR"],a:[],f:40},
  {n:"Nino Niederreiter",t:["NYI","MIN","CAR","NSH","WPG"],a:["ALL_STAR"],f:62},
  {n:"Antti Raanta",t:["CHI","NYR","PHX","ARI","CAR"],a:["ALL_STAR"],f:58},
  {n:"Mikael Granlund",t:["MIN","NSH","PIT","BUF"],a:["ALL_STAR"],f:65},
  {n:"Zach Parise",t:["NJD","MIN"],a:["ALL_STAR"],f:80},
  {n:"Eric Staal",t:["CAR","MIN","NYR","MTL","BUF"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR"],f:80},
  {n:"Jason Zucker",t:["MIN","PIT","ARI","NJD"],a:["ALL_STAR"],f:58},
  {n:"Kirill Kaprizov",t:["MIN"],a:["ALL_STAR","CALDER","TED_LINDSAY"],f:90},
  {n:"Matt Dumba",t:["MIN","PHX","ARI"],a:["ALL_STAR"],f:62},
  {n:"Marcus Foligno",t:["BUF","MIN"],a:[],f:45},
  {n:"Ryan Johansen",t:["CBJ","NSH","COL"],a:["ALL_STAR"],f:72},
  {n:"Viktor Arvidsson",t:["NSH","LAK"],a:["ALL_STAR"],f:68},
  {n:"Filip Forsberg",t:["WSH","NSH"],a:["ALL_STAR","TED_LINDSAY"],f:88},
  {n:"Craig Smith",t:["NSH","BOS","WSH"],a:[],f:48},
  {n:"Calle Jarnkrok",t:["DET","NSH","SEA","CGY","TOR"],a:[],f:45},
  {n:"Kevin Fiala",t:["NSH","MIN","LAK"],a:["ALL_STAR"],f:72},
  {n:"Juuse Saros",t:["NSH"],a:["ALL_STAR","VEZINA"],f:80},
  {n:"Matthew Tkachuk",t:["CGY","FLA"],a:["SC_CHAMP","CONN_SMYTHE","ALL_STAR","TED_LINDSAY"],f:90},
  {n:"Johnny Gaudreau",t:["CGY","CBJ"],a:["ALL_STAR","TED_LINDSAY"],f:85},
  {n:"Sean Monahan",t:["CGY","MTL","OTT","NJD"],a:["ALL_STAR"],f:68},
  {n:"Mikael Backlund",t:["CGY"],a:["ALL_STAR","SELKE"],f:65},
  {n:"Sam Bennett",t:["CGY","FLA"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Rasmus Andersson",t:["CGY"],a:["ALL_STAR"],f:60},
  {n:"David Rittich",t:["CGY","TOR","NSH","LAK"],a:["ALL_STAR"],f:48},
  {n:"Spencer Knight",t:["FLA"],a:[],f:48},
  {n:"Aleksander Barkov",t:["FLA"],a:["ALL_STAR","SELKE","TED_LINDSAY"],f:90},
  {n:"Jonathan Huberdeau",t:["FLA","CGY"],a:["ALL_STAR","TED_LINDSAY"],f:82},
  {n:"Carter Verhaeghe",t:["TBL","FLA"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Radko Gudas",t:["TBL","PHI","WSH","FLA"],a:["SC_CHAMP"],f:45},
  {n:"Connor Hellebuyck",t:["WPG"],a:["ALL_STAR","VEZINA"],f:88},
  {n:"Nikolaj Ehlers",t:["WPG"],a:["ALL_STAR"],f:75},
  {n:"Pierre-Luc Dubois",t:["CBJ","WPG","LAK"],a:["ALL_STAR"],f:75},
  {n:"Nate Schmidt",t:["WSH","VGK","VAN","WPG"],a:["SC_CHAMP"],f:48},
  {n:"Dmitry Kulikov",t:["FLA","BUF","NJD","WPG","ANA","MIN","NJD"],a:[],f:40},
  {n:"Jack Roslovic",t:["WPG","CBJ","NYR"],a:[],f:45},
  {n:"Taylor Hall",t:["EDM","NJD","ARI","BUF","BOS","CHI"],a:["HART","ALL_STAR","TED_LINDSAY"],f:82},
  {n:"Nico Hischier",t:["NJD"],a:["ALL_STAR","CALDER"],f:78},
  {n:"Jack Hughes",t:["NJD"],a:["ALL_STAR"],f:82},
  {n:"Jesper Bratt",t:["NJD"],a:["ALL_STAR"],f:68},
  {n:"Vitek Vanecek",t:["WSH","NJD","SJS"],a:[],f:45},
  {n:"Drew Stafford",t:["BUF","WPG","MIN","NJD","BOS"],a:[],f:38},
  {n:"Tomas Tatar",t:["DET","VGK","MTL","NJD"],a:["SC_CHAMP","ALL_STAR"],f:65},
  {n:"Miles Wood",t:["NJD"],a:[],f:40},
  {n:"Pavel Zacha",t:["NJD","BOS"],a:[],f:48},
  {n:"Travis Konecny",t:["PHI"],a:["ALL_STAR"],f:70},
  {n:"Carter Hart",t:["PHI"],a:["ALL_STAR"],f:65},
  {n:"Cam Atkinson",t:["CBJ","PHI"],a:["ALL_STAR"],f:65},
  {n:"Tony DeAngelo",t:["ARI","NYR","CAR","PHI"],a:["ALL_STAR"],f:55},
  {n:"Wade Redden",t:["OTT","NYR","STL","BOS","COL"],a:["ALL_STAR"],f:55},
  {n:"Phil Kessel",t:["BOS","TOR","PIT","ARI","VGK"],a:["SC_CHAMP","ALL_STAR"],f:82},
  {n:"John Klingberg",t:["DAL","ANA","TOR"],a:["ALL_STAR"],f:68},
  {n:"William Nylander",t:["TOR"],a:["ALL_STAR"],f:80},
  {n:"Jack Campbell",t:["DAL","LAK","TOR","EDM"],a:["ALL_STAR"],f:60},
  {n:"Ilya Mikheyev",t:["TOR","VAN"],a:[],f:42},
  {n:"Ondrej Kase",t:["ANA","BOS","TOR","CAR"],a:[],f:42},
  {n:"David Kampf",t:["CHI","TOR"],a:[],f:35},
  {n:"Nikita Zaitsev",t:["TOR","OTT","CHI"],a:[],f:42},
  {n:"Connor Brown",t:["TOR","OTT","EDM"],a:[],f:45},
  {n:"Dion Phaneuf",t:["CGY","TOR","OTT","LAK"],a:["ALL_STAR","NORRIS"],f:72},
  {n:"Leo Komarov",t:["TOR","NYI"],a:[],f:38},
  {n:"Tyler Bertuzzi",t:["DET","BOS","TOR"],a:["ALL_STAR"],f:60},
  {n:"Kasperi Kapanen",t:["TOR","PIT","STL"],a:[],f:45},
  {n:"Jason Spezza",t:["OTT","DAL","TOR"],a:["ALL_STAR"],f:72},
  {n:"Nick Foligno",t:["OTT","CBJ","BOS","MIN","TOR"],a:["ALL_STAR"],f:65},
  {n:"Elias Pettersson",t:["VAN"],a:["ALL_STAR","CALDER","TED_LINDSAY"],f:88},
  {n:"Bo Horvat",t:["VAN","NYI"],a:["ALL_STAR"],f:78},
  {n:"Brock Boeser",t:["VAN"],a:["ALL_STAR","CALDER"],f:72},
  {n:"Thatcher Demko",t:["VAN"],a:["ALL_STAR"],f:72},
  {n:"Conor Garland",t:["ARI","VAN"],a:["ALL_STAR"],f:60},
  {n:"J.T. Miller",t:["NYR","TBL","VAN"],a:["SC_CHAMP","ALL_STAR"],f:75},
  {n:"Tyler Myers",t:["BUF","WPG","VAN"],a:["ALL_STAR","CALDER"],f:58},
  {n:"Alexander Edler",t:["VAN","LAK"],a:["ALL_STAR"],f:65},
  {n:"Cody Hodgson",t:["VAN","BUF"],a:[],f:38},
  {n:"Jannik Hansen",t:["VAN"],a:[],f:42},
  {n:"Daniel Sprong",t:["PIT","ANA","WSH","EDM","DET","SEA","VAN"],a:[],f:35},
  {n:"Tyler Graovac",t:["MIN","WSH","NYR","SEA"],a:[],f:25},
  {n:"Ryan Donato",t:["BOS","MIN","SJS","SEA","CHI"],a:[],f:35},
  {n:"Philipp Grubauer",t:["WSH","COL","SEA"],a:["SC_CHAMP","ALL_STAR"],f:68},
  {n:"Matty Beniers",t:["SEA"],a:["ALL_STAR","CALDER"],f:72},
  {n:"Shane Wright",t:["SEA"],a:[],f:55},
  {n:"Oliver Bjorkstrand",t:["CBJ","SEA"],a:["ALL_STAR"],f:60},
  {n:"Brandon Tanev",t:["WPG","PIT","SEA","CHI"],a:["SC_CHAMP"],f:42},
  {n:"Morgan Frost",t:["PHI"],a:[],f:42},
  {n:"Jakub Lauko",t:["BOS","CAR"],a:[],f:28},
  {n:"Dylan Larkin",t:["DET"],a:["ALL_STAR"],f:75},
  {n:"Gustav Nyquist",t:["DET","SJS","CBJ","NSH"],a:["ALL_STAR"],f:60},
  {n:"Filip Zadina",t:["DET","WSH"],a:[],f:40},
  {n:"Moritz Seider",t:["DET"],a:["ALL_STAR","CALDER"],f:78},
  {n:"Lucas Raymond",t:["DET"],a:["ALL_STAR"],f:72},
  {n:"Simon Edvinsson",t:["DET"],a:[],f:45},
  {n:"Alex DeBrincat",t:["CHI","OTT","DET"],a:["ALL_STAR","TED_LINDSAY"],f:78},
  {n:"Patrick Kane",t:["CHI","NYR","DET"],a:["SC_CHAMP","CONN_SMYTHE","HART","ALL_STAR","ART_ROSS","TED_LINDSAY","CALDER"],f:97},
  {n:"Ryan Nugent-Hopkins",t:["EDM"],a:["ALL_STAR","CALDER"],f:72},
  {n:"Zack Kassian",t:["BUF","VAN","EDM"],a:[],f:40},
  {n:"Jesse Puljujarvi",t:["EDM","CAR"],a:[],f:42},
  {n:"Tyson Barrie",t:["COL","TOR","EDM","NSH"],a:["ALL_STAR"],f:65},
  {n:"Kailer Yamamoto",t:["EDM","DET"],a:[],f:38},
  {n:"Mike Smith",t:["DAL","PHX","ARI","CGY","EDM","BUF"],a:["ALL_STAR"],f:60},
  {n:"Stuart Skinner",t:["EDM"],a:["ALL_STAR"],f:62},
  {n:"Zach Hyman",t:["TOR","EDM"],a:["ALL_STAR"],f:65},
  {n:"Warren Foegele",t:["CAR","EDM"],a:[],f:42},
];

const PUZZLES = [
  { rows: ["PIT","BOS","SC_CHAMP"],      cols: ["WSH","HART","ALL_STAR"] },
  { rows: ["DET","COL","NORRIS"],        cols: ["NJD","SC_CHAMP","VEZINA"] },
  { rows: ["TBL","CHI","HART"],          cols: ["EDM","ART_ROSS","CALDER"] },
  { rows: ["NYR","LAK","ALL_STAR"],      cols: ["BOS","SC_CHAMP","SELKE"] },
  { rows: ["MTL","SJS","VEZINA"],        cols: ["PIT","NORRIS","CONN_SMYTHE"] },
  { rows: ["VAN","NSH","SC_CHAMP"],      cols: ["TOR","HART","ALL_STAR"] },
  { rows: ["STL","FLA","ART_ROSS"],      cols: ["COL","VEZINA","NORRIS"] },
  { rows: ["OTT","WPG","SELKE"],         cols: ["CHI","SC_CHAMP","CALDER"] },
  { rows: ["ANA","CGY","NORRIS"],        cols: ["DET","ALL_STAR","HART"] },
  { rows: ["MIN","DAL","CALDER"],        cols: ["EDM","SC_CHAMP","SELKE"] },
  { rows: ["BUF","PHI","ALL_STAR"],      cols: ["NYR","VEZINA","ART_ROSS"] },
  { rows: ["NYI","CAR","CONN_SMYTHE"],   cols: ["BOS","NORRIS","HART"] },
  { rows: ["WSH","COL","SC_CHAMP"],      cols: ["TBL","ALL_STAR","SELKE"] },
  { rows: ["LAK","STL","HART"],          cols: ["PIT","ART_ROSS","CALDER"] },
  { rows: ["EDM","NJD","VEZINA"],        cols: ["CHI","SC_CHAMP","NORRIS"] },
  { rows: ["TOR","FLA","ALL_STAR"],      cols: ["BOS","CONN_SMYTHE","SELKE"] },
  { rows: ["SJS","MTL","NORRIS"],        cols: ["WSH","HART","CALDER"] },
  { rows: ["CGY","VAN","SC_CHAMP"],      cols: ["DET","ALL_STAR","ART_ROSS"] },
  { rows: ["NSH","WPG","SELKE"],         cols: ["STL","VEZINA","NORRIS"] },
  { rows: ["CAR","MIN","CALDER"],        cols: ["COL","SC_CHAMP","HART"] },
  { rows: ["PHI","ANA","ART_ROSS"],      cols: ["NYR","ALL_STAR","NORRIS"] },
  { rows: ["OTT","BUF","CONN_SMYTHE"],   cols: ["LAK","VEZINA","SELKE"] },
  { rows: ["NYI","DAL","HART"],          cols: ["TOR","SC_CHAMP","ALL_STAR"] },
  { rows: ["PIT","TBL","NORRIS"],        cols: ["BOS","ART_ROSS","CALDER"] },
  { rows: ["DET","CHI","SC_CHAMP"],      cols: ["WSH","HART","VEZINA"] },
  { rows: ["COL","NJD","ALL_STAR"],      cols: ["EDM","NORRIS","SELKE"] },
  { rows: ["VGK","FLA","CALDER"],        cols: ["STL","SC_CHAMP","ART_ROSS"] },
  { rows: ["MTL","CGY","VEZINA"],        cols: ["PIT","ALL_STAR","CONN_SMYTHE"] },
  { rows: ["BOS","LAK","SELKE"],         cols: ["TBL","NORRIS","HART"] },
  { rows: ["EDM","WSH","SC_CHAMP"],      cols: ["CHI","ART_ROSS","ALL_STAR"] },
];

function getDailyPuzzle(dateStr) {
  const seedDate = dateStr ?? new Date().toLocaleDateString('en-CA')
  const seed = parseInt(seedDate.replace(/-/g, ''))
  return PUZZLES[seed % PUZZLES.length]
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
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
.faceoff-grid{display:grid;grid-template-columns:90px repeat(3,110px);grid-template-rows:70px repeat(3,100px);gap:4px;padding:0 12px}
@media(max-width:480px){.faceoff-grid{grid-template-columns:72px repeat(3,88px);grid-template-rows:60px repeat(3,86px)}}
`;

export default function FaceoffGame() {
  const { streak } = useStreak('faceoff');
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
    const abbr = NHL_LOGO[key];
    return { award: null, label: TEAMS[key] || key, color: '#C9A84C', logoUrl: abbr ? `https://a.espncdn.com/i/teamlogos/nhl/500/${abbr}.png` : null };
  };

  const handleCellClick = (r, c) => {
    if (gameOver || won) return;
    if (cells[`${r}-${c}`]) return;
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
    const valid = !usedNames.includes(pendingPlayer.n) &&
      isValid(pendingPlayer, rowCrit) && isValid(pendingPlayer, colCrit);

    if (valid) {
      const score = getScore(pendingPlayer.f);
      const newCells = {...cells, [key]: {player: pendingPlayer, score}};
      setCells(newCells);
      setTotalScore(s => s + score);
      setActiveCell(null);
      setQuery('');
      setPendingPlayer(null);
      setSuggestions([]);
      if (Object.keys(newCells).length === 9) { saveResult({ game: 'faceoff', completed: true, score: totalScore + score }); setWon(true); spawnConfetti(); }
      else if (newGuesses === 0) { saveResult({ game: 'faceoff', completed: false, score: totalScore }); setGameOver(true); }
    } else {
      setShakeCell(key);
      setTimeout(()=>setShakeCell(null), 500);
      setPendingPlayer(null);
      setQuery('');
      if (newGuesses === 0) { setActiveCell(null); saveResult({ game: 'faceoff', completed: false, score: totalScore }); setGameOver(true); }
    }
  };

  const handleShare = async () => {
    const grid = Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>cells[`${r}-${c}`]?'✅':'⬜').join('')).join('\n');
    const text = `FACEOFF by Streakle 🏒 — ${formatDate(puzzleDate)}\nScore: ${totalScore} | ${Object.keys(cells).length}/9 cells\n${grid}\n\nPlay at: playstreakle.com/faceoff`;
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
          <div style={{fontSize:30,fontWeight:900,letterSpacing:2,color:'#fff'}}>FACEOFF</div>
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
          Fill the 3×3 grid with NHL players. Each player must satisfy <b>both</b> the row and column criteria.<br/><br/>
          Rows and columns can be <b>NHL teams</b> (player played for that team) or <b>awards</b> (player won that award).<br/><br/>
          Each player can only be used <b>once</b>. You have <b>9 guesses</b> — one per cell.<br/><br/>
          🏒 Rarer answers = higher score. Max score: ~855.
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
        <div className="faceoff-grid">
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
          <input ref={inputRef} value={query} onChange={e=>handleQuery(e.target.value)} placeholder="Search NHL player..."
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
          game="faceoff"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  );
}