import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { clickableProps } from './a11y';
import { useSeo, PAGE_SEO } from './seo';

const PUZZLES = [
  {
    categories: [
      { label: "Planets", color: "#b59f3b", words: ["MARS", "VENUS", "SATURN", "NEPTUNE"] },
      { label: "Card games", color: "#538d4e", words: ["POKER", "BRIDGE", "SNAP", "SOLITAIRE"] },
      { label: "Things that are blue", color: "#3a7bd5", words: ["SKY", "OCEAN", "SAPPHIRE", "BLUEBELL"] },
      { label: "___berry", color: "#9b59b6", words: ["STRAW", "BLUE", "RASP", "GOOSE"] },
    ]
  },
  {
    categories: [
      { label: "Dog breeds", color: "#b59f3b", words: ["POODLE", "BOXER", "HUSKY", "BEAGLE"] },
      { label: "Olympic sports", color: "#538d4e", words: ["JUDO", "FENCING", "LUGE", "ARCHERY"] },
      { label: "Types of cheese", color: "#3a7bd5", words: ["BRIE", "GOUDA", "FETA", "HAVARTI"] },
      { label: "Famous Leonardos", color: "#9b59b6", words: ["DAVINCI", "DICAPRIO", "FIBONACCI", "NIMOY"] },
    ]
  },
  {
    categories: [
      { label: "Currencies", color: "#b59f3b", words: ["YEN", "EURO", "FRANC", "PESO"] },
      { label: "Bones in the body", color: "#538d4e", words: ["FEMUR", "TIBIA", "RADIUS", "ULNA"] },
      { label: "Shakespeare plays", color: "#3a7bd5", words: ["HAMLET", "OTHELLO", "MACBETH", "TEMPEST"] },
      { label: "___ ball", color: "#9b59b6", words: ["BASKET", "FOOT", "FIRE", "ODD"] },
    ]
  },
  {
    categories: [
      { label: "African countries", color: "#b59f3b", words: ["CHAD", "MALI", "TOGO", "BENIN"] },
      { label: "Types of pasta", color: "#538d4e", words: ["PENNE", "RIGATONI", "ORZO", "FUSILLI"] },
      { label: "Famous scientists", color: "#3a7bd5", words: ["CURIE", "DARWIN", "NEWTON", "TESLA"] },
      { label: "Things with rings", color: "#9b59b6", words: ["SATURN", "BOXING", "WEDDING", "CIRCUS"] },
    ]
  },
  {
    categories: [
      { label: "Jazz musicians", color: "#b59f3b", words: ["COLTRANE", "DAVIS", "PARKER", "MONK"] },
      { label: "Types of clouds", color: "#538d4e", words: ["CUMULUS", "STRATUS", "CIRRUS", "NIMBUS"] },
      { label: "Robin ___", color: "#3a7bd5", words: ["HOOD", "WILLIAMS", "WRIGHT", "THICKE"] },
      { label: "Cocktail ingredients", color: "#9b59b6", words: ["VERMOUTH", "BITTERS", "GRENADINE", "KAHLUA"] },
    ]
  },
  {
    categories: [
      { label: "Mountain ranges", color: "#b59f3b", words: ["ANDES", "ROCKIES", "ALPS", "URALS"] },
      { label: "Dances", color: "#538d4e", words: ["TANGO", "WALTZ", "SALSA", "FOXTROT"] },
      { label: "Greek gods", color: "#3a7bd5", words: ["APOLLO", "HERMES", "ARES", "POSEIDON"] },
      { label: "Types of bread", color: "#9b59b6", words: ["BRIOCHE", "CIABATTA", "FOCACCIA", "NAAN"] },
    ]
  },
  {
    categories: [
      { label: "Rivers", color: "#b59f3b", words: ["NILE", "AMAZON", "GANGES", "DANUBE"] },
      { label: "Famous paintings", color: "#538d4e", words: ["GUERNICA", "STARRY NIGHT", "PERSISTENCE", "NIGHTHAWKS"] },
      { label: "Constellations", color: "#3a7bd5", words: ["ORION", "LYRA", "DRACO", "CASSIOPEIA"] },
      { label: "Martial arts", color: "#9b59b6", words: ["KARATE", "AIKIDO", "TAEKWONDO", "MUAY THAI"] },
    ]
  },
  {
    categories: [
      { label: "Gemstones", color: "#b59f3b", words: ["OPAL", "GARNET", "TOPAZ", "ONYX"] },
      { label: "Board games", color: "#538d4e", words: ["CATAN", "RISK", "CLUE", "TABOO"] },
      { label: "Philosophers", color: "#3a7bd5", words: ["SOCRATES", "KANT", "HUME", "LOCKE"] },
      { label: "___ note", color: "#9b59b6", words: ["BANK", "STICKY", "FOOT", "KEY"] },
    ]
  },
  {
    categories: [
      { label: "Volcanoes", color: "#b59f3b", words: ["ETNA", "FUJI", "KRAKATOA", "VESUVIUS"] },
      { label: "Types of tea", color: "#538d4e", words: ["OOLONG", "MATCHA", "DARJEELING", "ROOIBOS"] },
      { label: "Cold ___", color: "#3a7bd5", words: ["FRONT", "SHOULDER", "SNAP", "TURKEY"] },
      { label: "Primates", color: "#9b59b6", words: ["GIBBON", "MANDRILL", "TAMARIN", "BONOBO"] },
    ]
  },
  {
    categories: [
      { label: "Deserts", color: "#b59f3b", words: ["GOBI", "SAHARA", "MOJAVE", "NAMIB"] },
      { label: "Canadian provinces", color: "#538d4e", words: ["ALBERTA", "ONTARIO", "QUEBEC", "MANITOBA"] },
      { label: "___ bear", color: "#3a7bd5", words: ["POLAR", "GRIZZLY", "KOALA", "TEDDY"] },
      { label: "Types of coffee", color: "#9b59b6", words: ["ESPRESSO", "LUNGO", "RISTRETTO", "MACCHIATO"] },
    ]
  },
  {
    categories: [
      { label: "Mythical creatures", color: "#b59f3b", words: ["GRIFFIN", "SPHINX", "MINOTAUR", "BASILISK"] },
      { label: "Fast food chains", color: "#538d4e", words: ["WENDY'S", "ARBY'S", "SONIC", "IN-N-OUT"] },
      { label: "Languages", color: "#3a7bd5", words: ["SWAHILI", "PUNJABI", "CATALAN", "TAGALOG"] },
      { label: "Ballet terms", color: "#9b59b6", words: ["PLIE", "ARABESQUE", "PIROUETTE", "TENDU"] },
    ]
  },
  {
    categories: [
      { label: "Famous generals", color: "#b59f3b", words: ["PATTON", "ROMMEL", "HANNIBAL", "WELLINGTON"] },
      { label: "Types of beer", color: "#538d4e", words: ["STOUT", "PILSNER", "PORTER", "SAISON"] },
      { label: "Tropical fruits", color: "#3a7bd5", words: ["PAPAYA", "LYCHEE", "JACKFRUIT", "DURIAN"] },
      { label: "___ field", color: "#9b59b6", words: ["CORN", "MINE", "SPRING", "LEFT"] },
    ]
  },
  {
    categories: [
      { label: "Types of tide", color: "#b59f3b", words: ["SPRING", "NEAP", "FLOOD", "EBB"] },
      { label: "Logical fallacies", color: "#538d4e", words: ["STRAW MAN", "AD HOMINEM", "RED HERRING", "SLIPPERY SLOPE"] },
      { label: "Famous left-handers", color: "#3a7bd5", words: ["OBAMA", "HENDRIX", "DA VINCI", "MCCARTNEY"] },
      { label: "___ power", color: "#9b59b6", words: ["SOLAR", "WILL", "FLOWER", "BRAIN"] },
    ]
  },
  {
    categories: [
      { label: "Shades of red", color: "#b59f3b", words: ["CRIMSON", "SCARLET", "VERMILLION", "CARMINE"] },
      { label: "Types of government", color: "#538d4e", words: ["OLIGARCHY", "THEOCRACY", "REPUBLIC", "MONARCHY"] },
      { label: "___ code", color: "#3a7bd5", words: ["MORSE", "DRESS", "ZIP", "DA VINCI"] },
      { label: "Yoga poses", color: "#9b59b6", words: ["COBRA", "WARRIOR", "DOWNWARD DOG", "LOTUS"] },
    ]
  },
  {
    categories: [
      { label: "Classical composers", color: "#b59f3b", words: ["BACH", "CHOPIN", "VIVALDI", "HANDEL"] },
      { label: "Things that bark", color: "#538d4e", words: ["DOG", "TREE", "SEAL", "SERGEANT"] },
      { label: "Island groups", color: "#3a7bd5", words: ["AZORES", "MALDIVES", "FAROE", "GALAPAGOS"] },
      { label: "___ map", color: "#9b59b6", words: ["ROAD", "MIND", "HEAT", "GOOGLE"] },
    ]
  },
  {
    categories: [
      { label: "Card suits", color: "#b59f3b", words: ["HEART", "SPADE", "CLUB", "DIAMOND"] },
      { label: "Shades of green", color: "#538d4e", words: ["OLIVE", "EMERALD", "JADE", "FOREST"] },
      { label: "Trees", color: "#3a7bd5", words: ["OAK", "MAPLE", "BIRCH", "WILLOW"] },
      { label: "___ house", color: "#9b59b6", words: ["GREEN", "LIGHT", "FULL", "WARE"] },
    ]
  },
  {
    categories: [
      { label: "Pizza toppings", color: "#b59f3b", words: ["PEPPERONI", "MUSHROOM", "ANCHOVY", "OLIVE"] },
      { label: "Chess pieces", color: "#538d4e", words: ["KING", "QUEEN", "BISHOP", "ROOK"] },
      { label: "Worker bee roles", color: "#3a7bd5", words: ["FORAGER", "DRONE", "SCOUT", "NURSE"] },
      { label: "Stephen King novels", color: "#9b59b6", words: ["IT", "CARRIE", "MISERY", "CUJO"] },
    ]
  },
  {
    categories: [
      { label: "Citrus fruits", color: "#b59f3b", words: ["LEMON", "LIME", "ORANGE", "YUZU"] },
      { label: "Bond actors", color: "#538d4e", words: ["CONNERY", "MOORE", "CRAIG", "DALTON"] },
      { label: "Shades of orange", color: "#3a7bd5", words: ["AMBER", "CORAL", "TANGERINE", "RUST"] },
      { label: "Rocky ___", color: "#9b59b6", words: ["ROAD", "BALBOA", "MOUNTAIN", "HORROR"] },
    ]
  },
  {
    categories: [
      { label: "Units of time", color: "#b59f3b", words: ["WEEK", "HOUR", "DECADE", "MONTH"] },
      { label: "Coffee drinks", color: "#538d4e", words: ["LATTE", "MOCHA", "AMERICANO", "CORTADO"] },
      { label: "Tiny amounts", color: "#3a7bd5", words: ["MINUTE", "TRACE", "SPECK", "DASH"] },
      { label: "Track events", color: "#9b59b6", words: ["SPRINT", "HURDLES", "RELAY", "MARATHON"] },
    ]
  },
  {
    categories: [
      { label: "Continents", color: "#b59f3b", words: ["ASIA", "EUROPE", "AFRICA", "OCEANIA"] },
      { label: "Boxing punches", color: "#538d4e", words: ["JAB", "CROSS", "UPPERCUT", "COMBO"] },
      { label: "Pirate things", color: "#3a7bd5", words: ["HOOK", "PARROT", "PLANK", "CUTLASS"] },
      { label: "Peter ___", color: "#9b59b6", words: ["PAN", "PARKER", "PIPER", "PRINCIPLE"] },
    ]
  },
  {
    categories: [
      { label: "Sushi ingredients", color: "#b59f3b", words: ["RICE", "TUNA", "NORI", "WASABI"] },
      { label: "Famous Toms", color: "#538d4e", words: ["HANKS", "CRUISE", "HOLLAND", "HARDY"] },
      { label: "Bridges", color: "#3a7bd5", words: ["LONDON", "BROOKLYN", "GOLDEN", "RIALTO"] },
      { label: "Jeff ___", color: "#9b59b6", words: ["BRIDGES", "GOLDBLUM", "BEZOS", "BUCKLEY"] },
    ]
  },
  {
    categories: [
      { label: "Keyboard keys", color: "#b59f3b", words: ["SHIFT", "ENTER", "SPACE", "TAB"] },
      { label: "Restaurant areas", color: "#538d4e", words: ["KITCHEN", "PATIO", "BOOTH", "COUNTER"] },
      { label: "Gymnastics apparatus", color: "#3a7bd5", words: ["BEAM", "RINGS", "VAULT", "BARS"] },
      { label: "___ bell", color: "#9b59b6", words: ["DUMB", "BLUE", "TACO", "DOOR"] },
    ]
  },
  {
    categories: [
      { label: "Knights of the Round Table", color: "#b59f3b", words: ["LANCELOT", "GALAHAD", "GAWAIN", "PERCIVAL"] },
      { label: "Dances", color: "#538d4e", words: ["TWIST", "FLOSS", "DAB", "MOONWALK"] },
      { label: "Dental items", color: "#3a7bd5", words: ["BRACE", "CROWN", "PLAQUE", "FILLING"] },
      { label: "___ saw", color: "#9b59b6", words: ["JIG", "SEE", "CHAIN", "HACK"] },
    ]
  },
  {
    categories: [
      { label: "Hairstyles", color: "#b59f3b", words: ["BOB", "BRAID", "PERM", "MULLET"] },
      { label: "Apple products", color: "#538d4e", words: ["MAC", "WATCH", "IPHONE", "IPOD"] },
      { label: "SpongeBob characters", color: "#3a7bd5", words: ["PATRICK", "SQUIDWARD", "SANDY", "PLANKTON"] },
      { label: "___ apple", color: "#9b59b6", words: ["ADAMS", "BIG", "CRAB", "PINE"] },
    ]
  },
  {
    categories: [
      { label: "Egyptian gods", color: "#b59f3b", words: ["RA", "ANUBIS", "HORUS", "ISIS"] },
      { label: "Things with wings", color: "#538d4e", words: ["ANGEL", "PLANE", "BUTTERFLY", "STADIUM"] },
      { label: "Beatles songs", color: "#3a7bd5", words: ["YESTERDAY", "MICHELLE", "SOMETHING", "BLACKBIRD"] },
      { label: "Help synonyms", color: "#9b59b6", words: ["AID", "ASSIST", "ABET", "SERVE"] },
    ]
  },
  {
    categories: [
      { label: "Norse gods", color: "#b59f3b", words: ["ODIN", "THOR", "LOKI", "FREYA"] },
      { label: "Avengers", color: "#538d4e", words: ["HULK", "VISION", "FALCON", "GROOT"] },
      { label: "___ hammer", color: "#3a7bd5", words: ["SLEDGE", "JACK", "CLAW", "MC"] },
      { label: "Famous Chrises", color: "#9b59b6", words: ["EVANS", "PRATT", "PINE", "ROCK"] },
    ]
  },
  {
    categories: [
      { label: "Salad ingredients", color: "#b59f3b", words: ["LETTUCE", "CROUTON", "TOMATO", "CUCUMBER"] },
      { label: "Roman emperors", color: "#538d4e", words: ["NERO", "AUGUSTUS", "TRAJAN", "HADRIAN"] },
      { label: "Types of cipher", color: "#3a7bd5", words: ["SHIFT", "VIGENERE", "ENIGMA", "MORSE"] },
      { label: "Caesar ___", color: "#9b59b6", words: ["SALAD", "PALACE", "SECTION", "DRESSING"] },
    ]
  },
  {
    categories: [
      { label: "Monopoly tokens", color: "#b59f3b", words: ["THIMBLE", "BOOT", "TOPHAT", "WHEELBARROW"] },
      { label: "Bodies of water", color: "#538d4e", words: ["LAKE", "POND", "LAGOON", "INLET"] },
      { label: "Reservoir Dogs colours", color: "#3a7bd5", words: ["WHITE", "ORANGE", "PINK", "BLONDE"] },
      { label: "Car ___", color: "#9b59b6", words: ["WASH", "POOL", "PORT", "JACK"] },
    ]
  },
  {
    categories: [
      { label: "Weather phenomena", color: "#b59f3b", words: ["RAIN", "FOG", "SLEET", "DRIZZLE"] },
      { label: "Royal greetings", color: "#538d4e", words: ["HAIL", "BOW", "CURTSY", "SALUTE"] },
      { label: "Cloud types", color: "#3a7bd5", words: ["CIRRUS", "STRATUS", "CUMULUS", "NIMBUS"] },
      { label: "Storm ___", color: "#9b59b6", words: ["TROOPER", "CHASER", "SURGE", "FRONT"] },
    ]
  },
  {
    categories: [
      { label: "Sandwich types", color: "#b59f3b", words: ["CLUB", "REUBEN", "BLT", "PANINI"] },
      { label: "Golf equipment", color: "#538d4e", words: ["TEE", "IRON", "WEDGE", "PUTTER"] },
      { label: "Laundry steps", color: "#3a7bd5", words: ["WASH", "DRY", "FOLD", "RINSE"] },
      { label: "T-___", color: "#9b59b6", words: ["SHIRT", "REX", "BONE", "JUNCTION"] },
    ]
  },
  {
    categories: [
      { label: "Yoga poses", color: "#b59f3b", words: ["COBRA", "CHILD", "PIGEON", "CAMEL"] },
      { label: "Construction beams", color: "#538d4e", words: ["PLANK", "JOIST", "RAFTER", "GIRDER"] },
      { label: "Fictional bridges", color: "#3a7bd5", words: ["KHAZAD", "KWAI", "TERABITHIA", "MADISON"] },
      { label: "Card games", color: "#9b59b6", words: ["RUMMY", "HEARTS", "WAR", "EUCHRE"] },
    ]
  },
  {
    categories: [
      { label: "Mexican dishes", color: "#b59f3b", words: ["TACO", "BURRITO", "ENCHILADA", "TAMALE"] },
      { label: "Pepper types", color: "#538d4e", words: ["BELL", "GHOST", "CAYENNE", "JALAPENO"] },
      { label: "Cluedo suspects", color: "#3a7bd5", words: ["PLUM", "SCARLETT", "MUSTARD", "GREEN"] },
      { label: "Bell ___", color: "#9b59b6", words: ["HOP", "TOWER", "BOY", "JAR"] },
    ]
  },
  {
    categories: [
      { label: "Leg joints & parts", color: "#b59f3b", words: ["SHIN", "ANKLE", "KNEE", "CALF"] },
      { label: "Macbeth characters", color: "#538d4e", words: ["DUNCAN", "BANQUO", "MACDUFF", "MALCOLM"] },
      { label: "Donut shapes", color: "#3a7bd5", words: ["RING", "TWIST", "HOLE", "BALL"] },
      { label: "Grease ___", color: "#9b59b6", words: ["MONKEY", "PAINT", "PROOF", "SPOON"] },
    ]
  },
  {
    categories: [
      { label: "Wind instruments", color: "#b59f3b", words: ["FLUTE", "OBOE", "CLARINET", "BASSOON"] },
      { label: "Breakfast foods", color: "#538d4e", words: ["TOAST", "CEREAL", "BACON", "WAFFLE"] },
      { label: "Toasts (cheers!)", color: "#3a7bd5", words: ["SALUD", "PROST", "SKOL", "KANPAI"] },
      { label: "Champagne ___", color: "#9b59b6", words: ["BRUNCH", "SOCKET", "BOTTLE", "CORK"] },
    ]
  },
  {
    categories: [
      { label: "Poker terms", color: "#b59f3b", words: ["BLUFF", "FOLD", "RAISE", "ANTE"] },
      { label: "Phone actions", color: "#538d4e", words: ["CALL", "TEXT", "RING", "MUTE"] },
      { label: "Boxing ring features", color: "#3a7bd5", words: ["ROPE", "CORNER", "CANVAS", "STOOL"] },
      { label: "Laundry ___", color: "#9b59b6", words: ["BASKET", "ROOM", "DAY", "LINE"] },
    ]
  },
  {
    categories: [
      { label: "Greek letters", color: "#b59f3b", words: ["ALPHA", "GAMMA", "DELTA", "SIGMA"] },
      { label: "Wolf pack roles", color: "#538d4e", words: ["OMEGA", "BETA", "LONE", "PUP"] },
      { label: "Watch brands", color: "#3a7bd5", words: ["ROLEX", "SEIKO", "CASIO", "TAG"] },
      { label: "Software releases", color: "#9b59b6", words: ["STABLE", "NIGHTLY", "CANARY", "PATCH"] },
    ]
  },
  {
    categories: [
      { label: "High card values", color: "#b59f3b", words: ["ACE", "JACK", "QUEEN", "TEN"] },
      { label: "Tennis terms", color: "#538d4e", words: ["LOVE", "DEUCE", "SERVE", "RALLY"] },
      { label: "Cracker ___", color: "#3a7bd5", words: ["BARREL", "BOX", "NUT", "WHEAT"] },
      { label: "Flapjack ingredients", color: "#9b59b6", words: ["OATS", "BUTTER", "SYRUP", "SUGAR"] },
    ]
  },
  {
    categories: [
      { label: "Italian cities", color: "#b59f3b", words: ["ROME", "MILAN", "VENICE", "NAPLES"] },
      { label: "Window blinds", color: "#538d4e", words: ["VENETIAN", "ROLLER", "VERTICAL", "PLEATED"] },
      { label: "Salad dressings", color: "#3a7bd5", words: ["RANCH", "ITALIAN", "CAESAR", "FRENCH"] },
      { label: "When in ___", color: "#9b59b6", words: ["DOUBT", "DROUGHT", "VEGAS", "CHARGE"] },
    ]
  },
  {
    categories: [
      { label: "Snooker colours", color: "#b59f3b", words: ["RED", "PINK", "YELLOW", "BROWN"] },
      { label: "Karate belts", color: "#538d4e", words: ["WHITE", "PURPLE", "ORANGE", "BLACK"] },
      { label: "Charlie ___", color: "#3a7bd5", words: ["CHAPLIN", "SHEEN", "HORSE", "BUCKET"] },
      { label: "Feeling down", color: "#9b59b6", words: ["BLUE", "GLOOMY", "LOW", "GLUM"] },
    ]
  },
  {
    categories: [
      { label: "Olympic medals", color: "#b59f3b", words: ["GOLD", "SILVER", "BRONZE", "WOODEN"] },
      { label: "Lone ___", color: "#538d4e", words: ["RANGER", "STAR", "WOLF", "GUNMAN"] },
      { label: "Silver ___", color: "#3a7bd5", words: ["SPOON", "SCREEN", "LINING", "FOX"] },
      { label: "Surfer slang", color: "#9b59b6", words: ["DUDE", "GNARLY", "STOKED", "RAD"] },
    ]
  },
  {
    categories: [
      { label: "Famous lakes", color: "#b59f3b", words: ["ERIE", "TAHOE", "BAIKAL", "GENEVA"] },
      { label: "Swiss things", color: "#538d4e", words: ["ALPS", "CHEESE", "FONDUE", "WATCH"] },
      { label: "Army ___", color: "#3a7bd5", words: ["BASE", "KNIFE", "ANT", "BRAT"] },
      { label: "Hard cheeses", color: "#9b59b6", words: ["GOUDA", "EDAM", "COLBY", "GRANA"] },
    ]
  },
  {
    categories: [
      { label: "Big cats", color: "#b59f3b", words: ["LION", "TIGER", "JAGUAR", "LEOPARD"] },
      { label: "Ford models", color: "#538d4e", words: ["COBRA", "BRONCO", "FOCUS", "MUSTANG"] },
      { label: "Detroit teams", color: "#3a7bd5", words: ["LIONS", "TIGERS", "PISTONS", "REDWINGS"] },
      { label: "Snakes", color: "#9b59b6", words: ["VIPER", "MAMBA", "PYTHON", "ADDER"] },
    ]
  },
  {
    categories: [
      { label: "Apple varieties", color: "#b59f3b", words: ["GALA", "FUJI", "BRAEBURN", "JAZZ"] },
      { label: "Japanese exports", color: "#538d4e", words: ["NIKON", "LEICA", "TOYOTA", "SONY"] },
      { label: "Gala ___", color: "#3a7bd5", words: ["DINNER", "NIGHT", "EVENT", "DAY"] },
      { label: "Deadly sins", color: "#9b59b6", words: ["ENVY", "PRIDE", "WRATH", "SLOTH"] },
    ]
  },
  {
    categories: [
      { label: "Trigonometry", color: "#b59f3b", words: ["SINE", "COSINE", "TANGENT", "SECANT"] },
      { label: "Go off on a ___", color: "#538d4e", words: ["WHIM", "RANT", "LIMB", "JAUNT"] },
      { label: "Tree parts", color: "#3a7bd5", words: ["BRANCH", "BOUGH", "TWIG", "TRUNK"] },
      { label: "Bank ___", color: "#9b59b6", words: ["ROLL", "NOTE", "RUPT", "ROBBER"] },
    ]
  },
  {
    categories: [
      { label: "Playing card games", color: "#b59f3b", words: ["BRIDGE", "POKER", "EUCHRE", "WHIST"] },
      { label: "Dental work", color: "#538d4e", words: ["FILLING", "CROWN", "CAP", "VENEER"] },
      { label: "Nautical terms", color: "#3a7bd5", words: ["BOW", "STERN", "GALLEY", "HELM"] },
      { label: "Pie ___", color: "#9b59b6", words: ["CRUST", "CHART", "EYED", "HOLE"] },
    ]
  },
  {
    categories: [
      { label: "Famous Michaels", color: "#b59f3b", words: ["JORDAN", "JACKSON", "PHELPS", "CAINE"] },
      { label: "Jordan ___", color: "#538d4e", words: ["RIVER", "VALLEY", "PETERSON", "ALMOND"] },
      { label: "Almond products", color: "#3a7bd5", words: ["MILK", "PASTE", "FLOUR", "BUTTER"] },
      { label: "River features", color: "#9b59b6", words: ["DELTA", "BANK", "MOUTH", "BEND"] },
    ]
  },
  {
    categories: [
      { label: "Famous Davids", color: "#b59f3b", words: ["BOWIE", "BECKHAM", "ATTENBOROUGH", "COPPERFIELD"] },
      { label: "Knife types", color: "#538d4e", words: ["STANLEY", "BUTTER", "PARING", "CLEAVER"] },
      { label: "Dickens novels", color: "#3a7bd5", words: ["OLIVER", "DOMBEY", "DORRIT", "DROOD"] },
      { label: "Stage magicians", color: "#9b59b6", words: ["HOUDINI", "BLAINE", "ANGEL", "PENN"] },
    ]
  },
  {
    categories: [
      { label: "Coffee sizes", color: "#b59f3b", words: ["TALL", "GRANDE", "VENTI", "SHORT"] },
      { label: "Espresso styles", color: "#538d4e", words: ["DOUBLE", "SINGLE", "RISTRETTO", "LUNGO"] },
      { label: "Tennis scores", color: "#3a7bd5", words: ["LOVE", "DEUCE", "GAME", "FIFTEEN"] },
      { label: "Dice games", color: "#9b59b6", words: ["YAHTZEE", "CRAPS", "BUNCO", "FARKLE"] },
    ]
  },
  {
    categories: [
      { label: "Planets", color: "#b59f3b", words: ["URANUS", "VENUS", "MARS", "NEPTUNE"] },
      { label: "Roman gods", color: "#538d4e", words: ["JUNO", "VESTA", "JANUS", "CERES"] },
      { label: "Disney dogs", color: "#3a7bd5", words: ["PLUTO", "GOOFY", "BOLT", "NANA"] },
      { label: "Liquid metals & elements", color: "#9b59b6", words: ["MERCURY", "GALLIUM", "CESIUM", "BROMINE"] },
    ]
  },
  {
    categories: [
      { label: "Golf clubs", color: "#b59f3b", words: ["IRON", "WOOD", "WEDGE", "DRIVER"] },
      { label: "Lead a group", color: "#538d4e", words: ["GUIDE", "STEER", "HEAD", "PILOT"] },
      { label: "Pencil ___", color: "#3a7bd5", words: ["CASE", "SHARPENER", "SKIRT", "PUSHER"] },
      { label: "Periodic metals", color: "#9b59b6", words: ["GOLD", "TIN", "ZINC", "NICKEL"] },
    ]
  },
  {
    categories: [
      { label: "Berries", color: "#b59f3b", words: ["STRAWBERRY", "BLACKBERRY", "RASPBERRY", "MULBERRY"] },
      { label: "Halle ___", color: "#538d4e", words: ["BERRY", "LUJAH", "BANANA", "STORM"] },
      { label: "Old phone brands", color: "#3a7bd5", words: ["NOKIA", "MOTOROLA", "ERICSSON", "PALM"] },
      { label: "Chuck ___", color: "#9b59b6", words: ["NORRIS", "ROAST", "WAGON", "STEAK"] },
    ]
  },
  {
    categories: [
      { label: "Pool / billiards", color: "#b59f3b", words: ["CUE", "CHALK", "POCKET", "RACK"] },
      { label: "Theatre prompts", color: "#538d4e", words: ["LINE", "MARK", "EXIT", "ASIDE"] },
      { label: "Pocket ___", color: "#3a7bd5", words: ["MONEY", "WATCH", "KNIFE", "ROCKET"] },
      { label: "Spice ___", color: "#9b59b6", words: ["GIRL", "JAR", "TRADE", "ISLANDS"] },
    ]
  },
  {
    categories: [
      { label: "Hot drinks", color: "#b59f3b", words: ["COCOA", "CIDER", "TODDY", "CHAI"] },
      { label: "Spill the ___", color: "#538d4e", words: ["TEA", "BEANS", "MILK", "GUTS"] },
      { label: "British slang for food", color: "#3a7bd5", words: ["GRUB", "NOSH", "SCRAN", "TUCK"] },
      { label: "Golf ___", color: "#9b59b6", words: ["CART", "COURSE", "CADDIE", "SWING"] },
    ]
  },
  {
    categories: [
      { label: "Ocean depth zones", color: "#b59f3b", words: ["SUNLIGHT", "HADAL", "MIDNIGHT", "ABYSS"] },
      { label: "Movie sagas", color: "#538d4e", words: ["TWILIGHT", "MATRIX", "HOBBIT", "ROCKY"] },
      { label: "Danger ___", color: "#3a7bd5", words: ["MOUSE", "CLOSE", "SIGN", "MONEY"] },
      { label: "___ zone", color: "#9b59b6", words: ["END", "OZONE", "TIME", "COMFORT"] },
    ]
  },
  {
    categories: [
      { label: "Currencies", color: "#b59f3b", words: ["DOLLAR", "RUPEE", "DINAR", "RAND"] },
      { label: "Weight units", color: "#538d4e", words: ["POUND", "OUNCE", "STONE", "GRAM"] },
      { label: "Stone ___", color: "#3a7bd5", words: ["WALL", "HENGE", "MASON", "FRUIT"] },
      { label: "Rolling ___", color: "#9b59b6", words: ["PIN", "STONES", "HILLS", "THUNDER"] },
    ]
  },
  {
    categories: [
      { label: "Punctuation", color: "#b59f3b", words: ["COMMA", "APOSTROPHE", "DASH", "SEMICOLON"] },
      { label: "Sprint races", color: "#538d4e", words: ["HUNDRED", "RELAY", "HURDLE", "FURLONG"] },
      { label: "Large intestine etc", color: "#3a7bd5", words: ["COLON", "LIVER", "SPLEEN", "KIDNEY"] },
      { label: "History ___", color: "#9b59b6", words: ["BOOK", "BUFF", "CLASS", "MAKER"] },
    ]
  },
  {
    categories: [
      { label: "Fencing actions", color: "#b59f3b", words: ["LUNGE", "PARRY", "RIPOSTE", "FOIL"] },
      { label: "Kitchen wraps", color: "#538d4e", words: ["CLING", "WAX", "GREASE", "PARCHMENT"] },
      { label: "Wrap ___", color: "#3a7bd5", words: ["AROUND", "PAPER", "PARTY", "SHEET"] },
      { label: "Rap ___", color: "#9b59b6", words: ["BATTLE", "STAR", "SCALLION", "MUSIC"] },
    ]
  },
  {
    categories: [
      { label: "Shades of blue", color: "#b59f3b", words: ["NAVY", "TEAL", "AZURE", "COBALT"] },
      { label: "Armed forces", color: "#538d4e", words: ["ARMY", "MARINES", "AIRFORCE", "COASTGUARD"] },
      { label: "Hard metals", color: "#3a7bd5", words: ["NICKEL", "ZINC", "CHROME", "TITANIUM"] },
      { label: "Clothing stores", color: "#9b59b6", words: ["GAP", "ZARA", "UNIQLO", "MANGO"] },
    ]
  },
  {
    categories: [
      { label: "Bread types", color: "#b59f3b", words: ["RYE", "SOURDOUGH", "PITA", "BAGEL"] },
      { label: "Brown spirits", color: "#538d4e", words: ["BOURBON", "SCOTCH", "RUM", "BRANDY"] },
      { label: "Scotch ___", color: "#3a7bd5", words: ["TAPE", "EGG", "BROTH", "MIST"] },
      { label: "Field of ___", color: "#9b59b6", words: ["DREAMS", "VISION", "PLAY", "STUDY"] },
    ]
  },
  {
    categories: [
      { label: "Eye parts", color: "#b59f3b", words: ["IRIS", "PUPIL", "RETINA", "CORNEA"] },
      { label: "Flowers", color: "#538d4e", words: ["ROSE", "LILY", "DAISY", "TULIP"] },
      { label: "School ___", color: "#3a7bd5", words: ["BUS", "YARD", "BOY", "TRIP"] },
      { label: "Greek goddesses", color: "#9b59b6", words: ["HERA", "ATHENA", "NIKE", "DEMETER"] },
    ]
  },
  {
    categories: [
      { label: "Compass points", color: "#b59f3b", words: ["NORTH", "SOUTH", "EAST", "WEST"] },
      { label: "Wild ___", color: "#538d4e", words: ["CARD", "FIRE", "FLOWER", "CAT"] },
      { label: "GoT houses", color: "#3a7bd5", words: ["STARK", "LANNISTER", "TARGARYEN", "TULLY"] },
      { label: "Kanye albums", color: "#9b59b6", words: ["YEEZUS", "GRADUATION", "DONDA", "808S"] },
    ]
  },
  {
    categories: [
      { label: "Martial arts", color: "#b59f3b", words: ["KARATE", "JUDO", "AIKIDO", "KENDO"] },
      { label: "Rock subgenres", color: "#538d4e", words: ["PUNK", "GRUNGE", "INDIE", "GLAM"] },
      { label: "Heavy ___", color: "#3a7bd5", words: ["METAL", "WEIGHT", "DUTY", "HANDED"] },
      { label: "Kid ___", color: "#9b59b6", words: ["CUDI", "GLOVES", "SISTER", "BROTHER"] },
    ]
  },
  {
    categories: [
      { label: "Cold desserts", color: "#b59f3b", words: ["SORBET", "PARFAIT", "GELATO", "SUNDAE"] },
      { label: "Deer family", color: "#538d4e", words: ["MOOSE", "ELK", "CARIBOU", "FAWN"] },
      { label: "Chocolate ___", color: "#3a7bd5", words: ["CHIP", "BAR", "BOX", "FOUNTAIN"] },
      { label: "Hair products", color: "#9b59b6", words: ["MOUSSE", "GEL", "WAX", "SERUM"] },
    ]
  },
  {
    categories: [
      { label: "Casino games", color: "#b59f3b", words: ["BLACKJACK", "BACCARAT", "ROULETTE", "KENO"] },
      { label: "Jack ___", color: "#538d4e", words: ["POT", "RABBIT", "KNIFE", "FRUIT"] },
      { label: "Tools", color: "#3a7bd5", words: ["DRILL", "WRENCH", "PLIERS", "CHISEL"] },
      { label: "MC ___", color: "#9b59b6", words: ["HAMMER", "ESCHER", "FLY", "LAREN"] },
    ]
  },
  {
    categories: [
      { label: "Constellations", color: "#b59f3b", words: ["ORION", "LYRA", "CYGNUS", "AQUILA"] },
      { label: "Harry Potter names", color: "#538d4e", words: ["DRACO", "SIRIUS", "REMUS", "NARCISSA"] },
      { label: "Zodiac signs", color: "#3a7bd5", words: ["LEO", "ARIES", "VIRGO", "LIBRA"] },
      { label: "Bright stars", color: "#9b59b6", words: ["VEGA", "RIGEL", "POLARIS", "ALTAIR"] },
    ]
  },
  {
    categories: [
      { label: "Fast food chains", color: "#b59f3b", words: ["WENDYS", "ARBYS", "POPEYES", "CHIPOTLE"] },
      { label: "Tinker ___", color: "#538d4e", words: ["BELL", "TOY", "TON", "ER"] },
      { label: "Le Carré roles", color: "#3a7bd5", words: ["TAILOR", "SOLDIER", "SAILOR", "SPY"] },
      { label: "Peter Pan", color: "#9b59b6", words: ["WENDY", "HOOK", "NANA", "SMEE"] },
    ]
  },
  {
    categories: [
      { label: "Skateboard tricks", color: "#b59f3b", words: ["OLLIE", "KICKFLIP", "GRIND", "NOSESLIDE"] },
      { label: "Daily ___", color: "#538d4e", words: ["MAIL", "BREAD", "PLANET", "ROUTINE"] },
      { label: "Roast meats", color: "#3a7bd5", words: ["BEEF", "CHICKEN", "LAMB", "PORK"] },
      { label: "Coffee steps", color: "#9b59b6", words: ["BREW", "POUR", "STEEP", "FROTH"] },
    ]
  },
  {
    categories: [
      { label: "Volcano parts", color: "#b59f3b", words: ["CRATER", "MAGMA", "VENT", "CONE"] },
      { label: "Pokemon trainers", color: "#538d4e", words: ["MISTY", "BROCK", "GARY", "OAK"] },
      { label: "Air ___", color: "#3a7bd5", words: ["PORT", "PLANE", "BORNE", "FARE"] },
      { label: "Ash ___", color: "#9b59b6", words: ["TRAY", "WEDNESDAY", "CLOUD", "POT"] },
    ]
  },
  {
    categories: [
      { label: "Fictional wizards", color: "#b59f3b", words: ["GANDALF", "MERLIN", "DUMBLEDORE", "SARUMAN"] },
      { label: "Falcon types", color: "#538d4e", words: ["KESTREL", "HOBBY", "PEREGRINE", "GYR"] },
      { label: "Hobby ___", color: "#3a7bd5", words: ["HORSE", "CRAFT", "IST", "SHOP"] },
      { label: "Engine types", color: "#9b59b6", words: ["DIESEL", "JET", "STEAM", "ROCKET"] },
    ]
  },
  {
    categories: [
      { label: "Pasta shapes", color: "#b59f3b", words: ["PENNE", "FUSILLI", "RIGATONI", "FARFALLE"] },
      { label: "Tie a ___", color: "#538d4e", words: ["KNOT", "BOW", "RIBBON", "SHOELACE"] },
      { label: "Tie ___", color: "#3a7bd5", words: ["BREAKER", "DYE", "PIN", "CLIP"] },
      { label: "Hair accessories", color: "#9b59b6", words: ["BAND", "SCRUNCHIE", "GRIP", "SLIDE"] },
    ]
  },
  {
    categories: [
      { label: "Cocktails", color: "#b59f3b", words: ["MOJITO", "MARTINI", "NEGRONI", "DAIQUIRI"] },
      { label: "Bond's order", color: "#538d4e", words: ["SHAKEN", "STIRRED", "VODKA", "OLIVE"] },
      { label: "Mix together", color: "#3a7bd5", words: ["WHISK", "BLEND", "FOLD", "STIR"] },
      { label: "Sports cars", color: "#9b59b6", words: ["ASTON", "LOTUS", "BENTLEY", "MCLAREN"] },
    ]
  },
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

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TILE_GAP = 8;
const COLS = 4;

const css = `
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes revealRow{0%{transform:scaleY(0);opacity:0}100%{transform:scaleY(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
`;

function FlyingTile({ word, fr, fc, tr, tc, cs, total, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fromX = fc * (cs + TILE_GAP), fromY = fr * (cs + TILE_GAP);
    const toX = tc * (cs + TILE_GAP), toY = tr * (cs + TILE_GAP);
    el.animate([
      { transform: `translate(${fromX}px,${fromY}px) rotateY(0deg) scale(1)`, offset: 0 },
      { transform: `translate(${fromX}px,${fromY}px) rotateY(90deg) scale(0.85)`, offset: 0.3 },
      { transform: `translate(${toX}px,${toY}px) rotateY(-90deg) scale(0.85)`, offset: 0.6 },
      { transform: `translate(${toX}px,${toY}px) rotateY(0deg) scale(1)`, offset: 1 },
    ], { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
  }, []);

  return (
    <div ref={ref} style={{
      position: 'absolute', left: 0, top: 0,
      width: '23%', height: 56,
      background: color, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
      fontWeight: 700, color: '#fff',
      pointerEvents: 'none', zIndex: 20,
      boxShadow: `0 4px 20px ${color}88`,
      willChange: 'transform', padding: '0 4px', textAlign: 'center',
      perspective: '400px', transformStyle: 'preserve-3d',
    }}>{word}</div>
  );
}

export default function GridGame() {
  const { streak } = useStreak('link');
  useSeo(PAGE_SEO.link)
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)

  const puzzle = useMemo(() => {
    const seedDate = puzzleDate ?? new Date().toLocaleDateString('en-CA')
    const seed = parseInt(seedDate.replace(/-/g, ''))
    const p = getDailyPuzzle(puzzleDate)
    return { ...p, shuffled: seededShuffle(p.categories.flatMap(c => c.words), seed) }
  }, [puzzleDate])

  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [lives, setLives] = useState(4);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeWords, setShakeWords] = useState([]);
  const [showHow, setShowHow] = useState(false);
  const [message, setMessage] = useState(null);
  const [guessHistory, setGuessHistory] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [copied, setCopied] = useState(false);
  const [oneAway, setOneAway] = useState(false);
  const [flyingTiles, setFlyingTiles] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [hiddenWords, setHiddenWords] = useState([]);

  const gridRef = useRef(null);
  const solvedRef = useRef(null);
  const wordRefs = useRef({});
  const solvedRef2 = useRef([]);

  useEffect(() => { solvedRef2.current = solved; }, [solved]);

  useEffect(() => {
    if (!puzzleDate) return
    setSelected([])
    setSolved([])
    setLives(4)
    setGameOver(false)
    setWon(false)
    setShakeWords([])
    setMessage(null)
    setGuessHistory([])
    setConfetti([])
    setCopied(false)
    setOneAway(false)
    setFlyingTiles([])
    setAnimating(false)
    setHiddenWords([])
  }, [puzzleDate])

  const solvedWords = solved.flatMap(i => puzzle.categories[i].words);
  const remaining = puzzle.shuffled.filter(w => !solvedWords.includes(w));

  const toggleWord = (word) => {
    if (gameOver || won || animating) return;
    if (selected.includes(word)) setSelected(s => s.filter(w => w !== word));
    else if (selected.length < 4) setSelected(s => [...s, word]);
  };

  const showMsg = (msg, dur = 1800) => { setMessage(msg); setTimeout(() => setMessage(null), dur); };

  const spawnConfetti = () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 600,
      color: ['#b59f3b','#538d4e','#3a7bd5','#9b59b6','#fff'][i % 5],
      size: 5 + Math.random() * 8
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 1600);
  };

  const handleSubmit = () => {
    if (selected.length !== 4 || animating || won || gameOver) return;

    const catIdx = puzzle.categories.findIndex((c, i) =>
      !solvedRef2.current.includes(i) && selected.every(w => c.words.includes(w))
    );

    if (catIdx !== -1) {
      const cat = puzzle.categories[catIdx];
      const container = gridRef.current;

      if (!container) {
        setSolved(prev => {
          const ns = [...prev, catIdx];
          if (ns.length === 4) { saveResult({ game: 'link', completed: true }); setWon(true); spawnConfetti(); }
          else showMsg(`✅ ${cat.label}!`);
          return ns;
        });
        setGuessHistory(h => [...h, { correct: true }]);
        setSelected([]);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const solvedHeight = solvedRef2.current.length * 62;
      const toY = solvedHeight;

      const tiles = selected.map((word, ti) => {
        const el = wordRefs.current[word];
        const fromRect = el?.getBoundingClientRect();
        const fromX = fromRect ? fromRect.left - containerRect.left : 0;
        const fromY = fromRect ? fromRect.top - containerRect.top : 0;
        const toX = ti * (containerRect.width / 4);
        return { word, fromX, fromY, toX, toY, color: cat.color };
      });

      setHiddenWords([...selected]);
      setFlyingTiles(tiles);
      setAnimating(true);
      setSelected([]);

      setTimeout(() => {
        setFlyingTiles([]);
        setHiddenWords([]);
        setAnimating(false);
        setGuessHistory(h => [...h, { correct: true }]);
        setSolved(prev => {
          const ns = [...prev, catIdx];
          if (ns.length === 4) { saveResult({ game: 'link', completed: true }); setWon(true); spawnConfetti(); }
          else showMsg(`✅ ${cat.label}!`);
          return ns;
        });
      }, 700 + 3 * 60 + 100);
    } else {
      const bestMatch = puzzle.categories
        .filter((_, i) => !solvedRef2.current.includes(i))
        .map(c => selected.filter(w => c.words.includes(w)).length)
        .reduce((a, b) => Math.max(a, b), 0);

      setGuessHistory(h => [...h, { correct: false }]);
      setShakeWords([...selected]);
      setTimeout(() => setShakeWords([]), 500);

      const newLives = lives - 1;
      setLives(newLives);

      if (bestMatch === 3) { setOneAway(true); showMsg("One away! 👀", 2000); }
      else { setOneAway(false); showMsg("Not quite! Try again."); }

      if (newLives === 0) { saveResult({ game: 'link', completed: false }); setTimeout(() => setGameOver(true), 600); }
    }
  };

  const handleShare = async () => {
    const lines = guessHistory.map(g => g.correct ? '🟩🟩🟩🟩' : '🟥🟥🟥🟥');
    const result = won ? `Solved in ${guessHistory.length} guess${guessHistory.length !== 1 ? 'es' : ''}!` : `Could not solve today's Link`;
    const text = `LINK by Streakle 🔥 — ${formatDate(puzzleDate)}\n${result}\n${lines.join('\n')}\n\nPlay at: playstreakle.com/link`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 0, color: '#F5F0E8', position: 'relative', overflow: 'hidden' }}>
      <style>{css}</style>
      <UserMenu />
      <div style={{width:'100%',display:'flex',alignItems:'center',padding:'12px 16px 0',minHeight:44}}>
        <a href="/" style={{color:'#C9A84C',textDecoration:'none',fontSize:13,fontWeight:600}}>← Back</a>
      </div>

      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '30%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `confetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: '#fff', margin: 0 }}>LINK</h1>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: '#C9A84C', textTransform: 'uppercase', marginTop: -4 }}>by Streakle</div>
        </div>
        <button onClick={() => setShowHow(!showHow)} style={{ background: 'none', border: '1px solid #2C2820', borderRadius: 6, color: '#C9A84C', cursor: 'pointer', fontSize: 13, padding: '3px 10px', marginLeft: 8 }}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{ background: 'none', border: '1px solid #2C2820', borderRadius: 6, color: '#C9A84C', cursor: 'pointer', fontSize: 13, padding: '3px 10px' }}>
          📅 Archive
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#7A6E5F', marginBottom: 10, marginTop: 6 }}>{formatDate(puzzleDate)}</div>

      {showHow && (
        <div style={{ background: '#1C1A16', border: '1px solid #2C2820', borderRadius: 10, padding: 16, maxWidth: 340, marginBottom: 12, fontSize: 13, lineHeight: 1.65, color: '#ccc', animation: 'slideUp 0.3s ease' }}>
          <b style={{ color: '#C9A84C' }}>How to play</b><br />
          Find 4 groups of 4 words that share something in common.<br /><br />
          Select 4 words and tap <b>Submit</b>. Each correct group flies into place.<br /><br />
          🟨 Easiest → 🟩 → 🟦 → 🟪 Trickiest<br /><br />
          You have <b>4 lives</b>. Watch out for words that seem to fit multiple groups!
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < lives ? '#C9A84C' : '#333', transition: 'background 0.3s' }} />
        ))}
      </div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {message && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#1C1A16', border: '1px solid #2C2820', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: oneAway ? '#C9A84C' : '#fff', zIndex: 50, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
          {message}
        </div>
      )}

      <div ref={gridRef} style={{ position: 'relative', width: '100%', maxWidth: 440, padding: '0 12px', boxSizing: 'border-box' }}>
        <div ref={solvedRef} style={{ marginBottom: solved.length > 0 ? 6 : 0 }}>
          {solved.map(i => (
            <div key={i} style={{ background: puzzle.categories[i].color, borderRadius: 8, padding: '12px 16px', marginBottom: 6, textAlign: 'center', animation: 'revealRow 0.35s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{puzzle.categories[i].label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{puzzle.categories[i].words.join(', ')}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: TILE_GAP, marginBottom: 16 }}>
          {remaining.map(word => {
            const isSel = selected.includes(word);
            const isShaking = shakeWords.includes(word);
            const isHidden = hiddenWords.includes(word);
            return (
              <div key={word} ref={el => wordRefs.current[word] = el} {...clickableProps(() => toggleWord(word), gameOver || won || animating)} style={{
                aspectRatio: '5/3', background: isSel ? '#C9A84C' : '#1C1A16',
                border: `2px solid ${isSel ? '#C9A84C' : '#2C2820'}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
                fontWeight: 700, color: isSel ? '#0F0E0C' : '#F5F0E8',
                cursor: gameOver || won || animating ? 'default' : 'pointer',
                userSelect: 'none', textAlign: 'center', padding: '0 4px',
                transition: 'background 0.15s, border-color 0.15s',
                animation: isShaking ? 'shake 0.45s ease' : isSel ? 'pop 0.3s ease' : 'none',
                boxShadow: isSel ? '0 0 0 3px #C9A84C33' : 'none',
                opacity: isHidden ? 0 : 1,
              }}>
                {word}
              </div>
            );
          })}
        </div>

        {flyingTiles.map((ft, i) => (
          <FlyingTile key={`${ft.word}-${i}`} {...ft} cs={56} total={TILE_GAP} color={ft.color} />
        ))}
      </div>

      {!gameOver && !won && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setSelected([])} disabled={animating} style={{ background: 'none', border: '1px solid #2C2820', borderRadius: 8, color: '#C9A84C', cursor: 'pointer', fontSize: 14, padding: '8px 20px', fontWeight: 600 }}>
            Deselect
          </button>
          <button onClick={handleSubmit} disabled={selected.length !== 4 || animating} style={{
            background: selected.length === 4 && !animating ? '#C9A84C' : '#1C1A16',
            border: 'none', borderRadius: 8,
            color: selected.length === 4 && !animating ? '#0F0E0C' : '#555',
            cursor: selected.length === 4 && !animating ? 'pointer' : 'default',
            fontSize: 14, padding: '8px 28px', fontWeight: 700, transition: 'background 0.2s',
          }}>
            Submit
          </button>
        </div>
      )}

      {won && (
        <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4caf50', marginBottom: 6 }}>🎉 Solved!</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>{guessHistory.length} guess{guessHistory.length !== 1 ? 'es' : ''} · {lives} life{lives !== 1 ? 's' : ''} remaining</div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={handleShare} style={{ background: '#C9A84C', color: '#0F0E0C', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = '#D4B45A'}
              onMouseOut={e => e.currentTarget.style.background = '#C9A84C'}>
              📋 Share result
            </button>
            {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'copied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
          </div>
        </div>
      )}

      {gameOver && !won && (
        <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease', width: '100%', maxWidth: 440, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e94560', marginBottom: 8 }}>Game over!</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10 }}>The categories were:</div>
          {puzzle.categories.map((cat, i) => !solved.includes(i) && (
            <div key={i} style={{ background: cat.color, borderRadius: 8, padding: '8px 16px', marginBottom: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase' }}>{cat.label}</div>
              <div style={{ fontSize: 13, color: '#fff' }}>{cat.words.join(', ')}</div>
            </div>
          ))}
          <div style={{ position: 'relative', display: 'inline-block', marginTop: 12 }}>
            <button onClick={handleShare} style={{ background: '#1C1A16', color: '#C9A84C', border: '1px solid #2C2820', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              📋 Share result
            </button>
            {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'copied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 12, color: '#5A5040', textAlign: 'center' }}>
        <a href="/privacy" style={{ color: '#5A5040', textDecoration: 'none' }}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="link"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </main>
  );
}