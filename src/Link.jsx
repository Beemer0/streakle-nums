import { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import GameShell from "./GameShell";
import ResultCard from './ResultCard';
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { clickableProps } from './a11y';
import { useSeo, PAGE_SEO } from './seo';

const PUZZLES = [
  {
    categories: [
      { label: "Planets", words: ["MARS", "VENUS", "SATURN", "NEPTUNE"] },
      { label: "Card games", words: ["POKER", "BRIDGE", "SNAP", "SOLITAIRE"] },
      { label: "Things that are blue", words: ["SKY", "OCEAN", "SAPPHIRE", "BLUEBELL"] },
      { label: "___berry", words: ["STRAW", "BLUE", "RASP", "GOOSE"] },
    ]
  },
  {
    categories: [
      { label: "Dog breeds", words: ["POODLE", "BOXER", "HUSKY", "BEAGLE"] },
      { label: "Olympic sports", words: ["JUDO", "FENCING", "LUGE", "ARCHERY"] },
      { label: "Types of cheese", words: ["BRIE", "GOUDA", "FETA", "HAVARTI"] },
      { label: "Famous Leonardos", words: ["DAVINCI", "DICAPRIO", "FIBONACCI", "NIMOY"] },
    ]
  },
  {
    categories: [
      { label: "Currencies", words: ["YEN", "EURO", "FRANC", "PESO"] },
      { label: "Bones in the body", words: ["FEMUR", "TIBIA", "RADIUS", "ULNA"] },
      { label: "Shakespeare plays", words: ["HAMLET", "OTHELLO", "MACBETH", "TEMPEST"] },
      { label: "___ ball", words: ["BASKET", "FOOT", "FIRE", "ODD"] },
    ]
  },
  {
    categories: [
      { label: "African countries", words: ["CHAD", "MALI", "TOGO", "BENIN"] },
      { label: "Types of pasta", words: ["PENNE", "RIGATONI", "ORZO", "FUSILLI"] },
      { label: "Famous scientists", words: ["CURIE", "DARWIN", "NEWTON", "TESLA"] },
      { label: "Things with rings", words: ["SATURN", "BOXING", "WEDDING", "CIRCUS"] },
    ]
  },
  {
    categories: [
      { label: "Jazz musicians", words: ["COLTRANE", "DAVIS", "PARKER", "MONK"] },
      { label: "Types of clouds", words: ["CUMULUS", "STRATUS", "CIRRUS", "NIMBUS"] },
      { label: "Robin ___", words: ["HOOD", "WILLIAMS", "WRIGHT", "THICKE"] },
      { label: "Cocktail ingredients", words: ["VERMOUTH", "BITTERS", "GRENADINE", "KAHLUA"] },
    ]
  },
  {
    categories: [
      { label: "Mountain ranges", words: ["ANDES", "ROCKIES", "ALPS", "URALS"] },
      { label: "Dances", words: ["TANGO", "WALTZ", "SALSA", "FOXTROT"] },
      { label: "Greek gods", words: ["APOLLO", "HERMES", "ARES", "POSEIDON"] },
      { label: "Types of bread", words: ["BRIOCHE", "CIABATTA", "FOCACCIA", "NAAN"] },
    ]
  },
  {
    categories: [
      { label: "Rivers", words: ["NILE", "AMAZON", "GANGES", "DANUBE"] },
      { label: "Famous paintings", words: ["GUERNICA", "STARRY NIGHT", "PERSISTENCE", "NIGHTHAWKS"] },
      { label: "Constellations", words: ["ORION", "LYRA", "DRACO", "CASSIOPEIA"] },
      { label: "Martial arts", words: ["KARATE", "AIKIDO", "TAEKWONDO", "MUAY THAI"] },
    ]
  },
  {
    categories: [
      { label: "Gemstones", words: ["OPAL", "GARNET", "TOPAZ", "ONYX"] },
      { label: "Board games", words: ["CATAN", "RISK", "CLUE", "TABOO"] },
      { label: "Philosophers", words: ["SOCRATES", "KANT", "HUME", "LOCKE"] },
      { label: "___ note", words: ["BANK", "STICKY", "FOOT", "KEY"] },
    ]
  },
  {
    categories: [
      { label: "Volcanoes", words: ["ETNA", "FUJI", "KRAKATOA", "VESUVIUS"] },
      { label: "Types of tea", words: ["OOLONG", "MATCHA", "DARJEELING", "ROOIBOS"] },
      { label: "Cold ___", words: ["FRONT", "SHOULDER", "SNAP", "TURKEY"] },
      { label: "Primates", words: ["GIBBON", "MANDRILL", "TAMARIN", "BONOBO"] },
    ]
  },
  {
    categories: [
      { label: "Deserts", words: ["GOBI", "SAHARA", "MOJAVE", "NAMIB"] },
      { label: "Canadian provinces", words: ["ALBERTA", "ONTARIO", "QUEBEC", "MANITOBA"] },
      { label: "___ bear", words: ["POLAR", "GRIZZLY", "KOALA", "TEDDY"] },
      { label: "Types of coffee", words: ["ESPRESSO", "LUNGO", "RISTRETTO", "MACCHIATO"] },
    ]
  },
  {
    categories: [
      { label: "Mythical creatures", words: ["GRIFFIN", "SPHINX", "MINOTAUR", "BASILISK"] },
      { label: "Fast food chains", words: ["WENDY'S", "ARBY'S", "SONIC", "IN-N-OUT"] },
      { label: "Languages", words: ["SWAHILI", "PUNJABI", "CATALAN", "TAGALOG"] },
      { label: "Ballet terms", words: ["PLIE", "ARABESQUE", "PIROUETTE", "TENDU"] },
    ]
  },
  {
    categories: [
      { label: "Famous generals", words: ["PATTON", "ROMMEL", "HANNIBAL", "WELLINGTON"] },
      { label: "Types of beer", words: ["STOUT", "PILSNER", "PORTER", "SAISON"] },
      { label: "Tropical fruits", words: ["PAPAYA", "LYCHEE", "JACKFRUIT", "DURIAN"] },
      { label: "___ field", words: ["CORN", "MINE", "SPRING", "LEFT"] },
    ]
  },
  {
    categories: [
      { label: "Types of tide", words: ["SPRING", "NEAP", "FLOOD", "EBB"] },
      { label: "Logical fallacies", words: ["STRAW MAN", "AD HOMINEM", "RED HERRING", "SLIPPERY SLOPE"] },
      { label: "Famous left-handers", words: ["OBAMA", "HENDRIX", "DA VINCI", "MCCARTNEY"] },
      { label: "___ power", words: ["SOLAR", "WILL", "FLOWER", "BRAIN"] },
    ]
  },
  {
    categories: [
      { label: "Shades of red", words: ["CRIMSON", "SCARLET", "VERMILLION", "CARMINE"] },
      { label: "Types of government", words: ["OLIGARCHY", "THEOCRACY", "REPUBLIC", "MONARCHY"] },
      { label: "___ code", words: ["MORSE", "DRESS", "ZIP", "DA VINCI"] },
      { label: "Yoga poses", words: ["COBRA", "WARRIOR", "DOWNWARD DOG", "LOTUS"] },
    ]
  },
  {
    categories: [
      { label: "Classical composers", words: ["BACH", "CHOPIN", "VIVALDI", "HANDEL"] },
      { label: "Things that bark", words: ["DOG", "TREE", "SEAL", "SERGEANT"] },
      { label: "Island groups", words: ["AZORES", "MALDIVES", "FAROE", "GALAPAGOS"] },
      { label: "___ map", words: ["ROAD", "MIND", "HEAT", "GOOGLE"] },
    ]
  },
  {
    categories: [
      { label: "Card suits", words: ["HEART", "SPADE", "CLUB", "DIAMOND"] },
      { label: "Shades of green", words: ["OLIVE", "EMERALD", "JADE", "FOREST"] },
      { label: "Trees", words: ["OAK", "MAPLE", "BIRCH", "WILLOW"] },
      { label: "___ house", words: ["GREEN", "LIGHT", "FULL", "WARE"] },
    ]
  },
  {
    categories: [
      { label: "Pizza toppings", words: ["PEPPERONI", "MUSHROOM", "ANCHOVY", "OLIVE"] },
      { label: "Chess pieces", words: ["KING", "QUEEN", "BISHOP", "ROOK"] },
      { label: "Worker bee roles", words: ["FORAGER", "DRONE", "SCOUT", "NURSE"] },
      { label: "Stephen King novels", words: ["IT", "CARRIE", "MISERY", "CUJO"] },
    ]
  },
  {
    categories: [
      { label: "Citrus fruits", words: ["LEMON", "LIME", "ORANGE", "YUZU"] },
      { label: "Bond actors", words: ["CONNERY", "MOORE", "CRAIG", "DALTON"] },
      { label: "Shades of orange", words: ["AMBER", "CORAL", "TANGERINE", "RUST"] },
      { label: "Rocky ___", words: ["ROAD", "BALBOA", "MOUNTAIN", "HORROR"] },
    ]
  },
  {
    categories: [
      { label: "Units of time", words: ["WEEK", "HOUR", "DECADE", "MONTH"] },
      { label: "Coffee drinks", words: ["LATTE", "MOCHA", "AMERICANO", "CORTADO"] },
      { label: "Tiny amounts", words: ["MINUTE", "TRACE", "SPECK", "DASH"] },
      { label: "Track events", words: ["SPRINT", "HURDLES", "RELAY", "MARATHON"] },
    ]
  },
  {
    categories: [
      { label: "Continents", words: ["ASIA", "EUROPE", "AFRICA", "OCEANIA"] },
      { label: "Boxing punches", words: ["JAB", "CROSS", "UPPERCUT", "COMBO"] },
      { label: "Pirate things", words: ["HOOK", "PARROT", "PLANK", "CUTLASS"] },
      { label: "Peter ___", words: ["PAN", "PARKER", "PIPER", "PRINCIPLE"] },
    ]
  },
  {
    categories: [
      { label: "Sushi ingredients", words: ["RICE", "TUNA", "NORI", "WASABI"] },
      { label: "Famous Toms", words: ["HANKS", "CRUISE", "HOLLAND", "HARDY"] },
      { label: "Bridges", words: ["LONDON", "BROOKLYN", "GOLDEN", "RIALTO"] },
      { label: "Jeff ___", words: ["BRIDGES", "GOLDBLUM", "BEZOS", "BUCKLEY"] },
    ]
  },
  {
    categories: [
      { label: "Keyboard keys", words: ["SHIFT", "ENTER", "SPACE", "TAB"] },
      { label: "Restaurant areas", words: ["KITCHEN", "PATIO", "BOOTH", "COUNTER"] },
      { label: "Gymnastics apparatus", words: ["BEAM", "RINGS", "VAULT", "BARS"] },
      { label: "___ bell", words: ["DUMB", "BLUE", "TACO", "DOOR"] },
    ]
  },
  {
    categories: [
      { label: "Knights of the Round Table", words: ["LANCELOT", "GALAHAD", "GAWAIN", "PERCIVAL"] },
      { label: "Dances", words: ["TWIST", "FLOSS", "DAB", "MOONWALK"] },
      { label: "Dental items", words: ["BRACE", "CROWN", "PLAQUE", "FILLING"] },
      { label: "___ saw", words: ["JIG", "SEE", "CHAIN", "HACK"] },
    ]
  },
  {
    categories: [
      { label: "Hairstyles", words: ["BOB", "BRAID", "PERM", "MULLET"] },
      { label: "Apple products", words: ["MAC", "WATCH", "IPHONE", "IPOD"] },
      { label: "SpongeBob characters", words: ["PATRICK", "SQUIDWARD", "SANDY", "PLANKTON"] },
      { label: "___ apple", words: ["ADAMS", "BIG", "CRAB", "PINE"] },
    ]
  },
  {
    categories: [
      { label: "Egyptian gods", words: ["RA", "ANUBIS", "HORUS", "ISIS"] },
      { label: "Things with wings", words: ["ANGEL", "PLANE", "BUTTERFLY", "STADIUM"] },
      { label: "Beatles songs", words: ["YESTERDAY", "MICHELLE", "SOMETHING", "BLACKBIRD"] },
      { label: "Help synonyms", words: ["AID", "ASSIST", "ABET", "SERVE"] },
    ]
  },
  {
    categories: [
      { label: "Norse gods", words: ["ODIN", "THOR", "LOKI", "FREYA"] },
      { label: "Avengers", words: ["HULK", "VISION", "FALCON", "GROOT"] },
      { label: "___ hammer", words: ["SLEDGE", "JACK", "CLAW", "MC"] },
      { label: "Famous Chrises", words: ["EVANS", "PRATT", "PINE", "ROCK"] },
    ]
  },
  {
    categories: [
      { label: "Salad ingredients", words: ["LETTUCE", "CROUTON", "TOMATO", "CUCUMBER"] },
      { label: "Roman emperors", words: ["NERO", "AUGUSTUS", "TRAJAN", "HADRIAN"] },
      { label: "Types of cipher", words: ["SHIFT", "VIGENERE", "ENIGMA", "MORSE"] },
      { label: "Caesar ___", words: ["SALAD", "PALACE", "SECTION", "DRESSING"] },
    ]
  },
  {
    categories: [
      { label: "Monopoly tokens", words: ["THIMBLE", "BOOT", "TOPHAT", "WHEELBARROW"] },
      { label: "Bodies of water", words: ["LAKE", "POND", "LAGOON", "INLET"] },
      { label: "Reservoir Dogs colours", words: ["WHITE", "ORANGE", "PINK", "BLONDE"] },
      { label: "Car ___", words: ["WASH", "POOL", "PORT", "JACK"] },
    ]
  },
  {
    categories: [
      { label: "Weather phenomena", words: ["RAIN", "FOG", "SLEET", "DRIZZLE"] },
      { label: "Royal greetings", words: ["HAIL", "BOW", "CURTSY", "SALUTE"] },
      { label: "Cloud types", words: ["CIRRUS", "STRATUS", "CUMULUS", "NIMBUS"] },
      { label: "Storm ___", words: ["TROOPER", "CHASER", "SURGE", "FRONT"] },
    ]
  },
  {
    categories: [
      { label: "Sandwich types", words: ["CLUB", "REUBEN", "BLT", "PANINI"] },
      { label: "Golf equipment", words: ["TEE", "IRON", "WEDGE", "PUTTER"] },
      { label: "Laundry steps", words: ["WASH", "DRY", "FOLD", "RINSE"] },
      { label: "T-___", words: ["SHIRT", "REX", "BONE", "JUNCTION"] },
    ]
  },
  {
    categories: [
      { label: "Yoga poses", words: ["COBRA", "CHILD", "PIGEON", "CAMEL"] },
      { label: "Construction beams", words: ["PLANK", "JOIST", "RAFTER", "GIRDER"] },
      { label: "Fictional bridges", words: ["KHAZAD", "KWAI", "TERABITHIA", "MADISON"] },
      { label: "Card games", words: ["RUMMY", "HEARTS", "WAR", "EUCHRE"] },
    ]
  },
  {
    categories: [
      { label: "Mexican dishes", words: ["TACO", "BURRITO", "ENCHILADA", "TAMALE"] },
      { label: "Pepper types", words: ["BELL", "GHOST", "CAYENNE", "JALAPENO"] },
      { label: "Cluedo suspects", words: ["PLUM", "SCARLETT", "MUSTARD", "GREEN"] },
      { label: "Bell ___", words: ["HOP", "TOWER", "BOY", "JAR"] },
    ]
  },
  {
    categories: [
      { label: "Leg joints & parts", words: ["SHIN", "ANKLE", "KNEE", "CALF"] },
      { label: "Macbeth characters", words: ["DUNCAN", "BANQUO", "MACDUFF", "MALCOLM"] },
      { label: "Donut shapes", words: ["RING", "TWIST", "HOLE", "BALL"] },
      { label: "Grease ___", words: ["MONKEY", "PAINT", "PROOF", "SPOON"] },
    ]
  },
  {
    categories: [
      { label: "Wind instruments", words: ["FLUTE", "OBOE", "CLARINET", "BASSOON"] },
      { label: "Breakfast foods", words: ["TOAST", "CEREAL", "BACON", "WAFFLE"] },
      { label: "Toasts (cheers!)", words: ["SALUD", "PROST", "SKOL", "KANPAI"] },
      { label: "Champagne ___", words: ["BRUNCH", "SOCKET", "BOTTLE", "CORK"] },
    ]
  },
  {
    categories: [
      { label: "Poker terms", words: ["BLUFF", "FOLD", "RAISE", "ANTE"] },
      { label: "Phone actions", words: ["CALL", "TEXT", "RING", "MUTE"] },
      { label: "Boxing ring features", words: ["ROPE", "CORNER", "CANVAS", "STOOL"] },
      { label: "Laundry ___", words: ["BASKET", "ROOM", "DAY", "LINE"] },
    ]
  },
  {
    categories: [
      { label: "Greek letters", words: ["ALPHA", "GAMMA", "DELTA", "SIGMA"] },
      { label: "Wolf pack roles", words: ["OMEGA", "BETA", "LONE", "PUP"] },
      { label: "Watch brands", words: ["ROLEX", "SEIKO", "CASIO", "TAG"] },
      { label: "Software releases", words: ["STABLE", "NIGHTLY", "CANARY", "PATCH"] },
    ]
  },
  {
    categories: [
      { label: "High card values", words: ["ACE", "JACK", "QUEEN", "TEN"] },
      { label: "Tennis terms", words: ["LOVE", "DEUCE", "SERVE", "RALLY"] },
      { label: "Cracker ___", words: ["BARREL", "BOX", "NUT", "WHEAT"] },
      { label: "Flapjack ingredients", words: ["OATS", "BUTTER", "SYRUP", "SUGAR"] },
    ]
  },
  {
    categories: [
      { label: "Italian cities", words: ["ROME", "MILAN", "VENICE", "NAPLES"] },
      { label: "Window blinds", words: ["VENETIAN", "ROLLER", "VERTICAL", "PLEATED"] },
      { label: "Salad dressings", words: ["RANCH", "ITALIAN", "CAESAR", "FRENCH"] },
      { label: "When in ___", words: ["DOUBT", "DROUGHT", "VEGAS", "CHARGE"] },
    ]
  },
  {
    categories: [
      { label: "Snooker colours", words: ["RED", "PINK", "YELLOW", "BROWN"] },
      { label: "Karate belts", words: ["WHITE", "PURPLE", "ORANGE", "BLACK"] },
      { label: "Charlie ___", words: ["CHAPLIN", "SHEEN", "HORSE", "BUCKET"] },
      { label: "Feeling down", words: ["BLUE", "GLOOMY", "LOW", "GLUM"] },
    ]
  },
  {
    categories: [
      { label: "Olympic medals", words: ["GOLD", "SILVER", "BRONZE", "WOODEN"] },
      { label: "Lone ___", words: ["RANGER", "STAR", "WOLF", "GUNMAN"] },
      { label: "Silver ___", words: ["SPOON", "SCREEN", "LINING", "FOX"] },
      { label: "Surfer slang", words: ["DUDE", "GNARLY", "STOKED", "RAD"] },
    ]
  },
  {
    categories: [
      { label: "Famous lakes", words: ["ERIE", "TAHOE", "BAIKAL", "GENEVA"] },
      { label: "Swiss things", words: ["ALPS", "CHEESE", "FONDUE", "WATCH"] },
      { label: "Army ___", words: ["BASE", "KNIFE", "ANT", "BRAT"] },
      { label: "Hard cheeses", words: ["GOUDA", "EDAM", "COLBY", "GRANA"] },
    ]
  },
  {
    categories: [
      { label: "Big cats", words: ["LION", "TIGER", "JAGUAR", "LEOPARD"] },
      { label: "Ford models", words: ["COBRA", "BRONCO", "FOCUS", "MUSTANG"] },
      { label: "Detroit teams", words: ["LIONS", "TIGERS", "PISTONS", "REDWINGS"] },
      { label: "Snakes", words: ["VIPER", "MAMBA", "PYTHON", "ADDER"] },
    ]
  },
  {
    categories: [
      { label: "Apple varieties", words: ["GALA", "FUJI", "BRAEBURN", "JAZZ"] },
      { label: "Japanese exports", words: ["NIKON", "LEICA", "TOYOTA", "SONY"] },
      { label: "Gala ___", words: ["DINNER", "NIGHT", "EVENT", "DAY"] },
      { label: "Deadly sins", words: ["ENVY", "PRIDE", "WRATH", "SLOTH"] },
    ]
  },
  {
    categories: [
      { label: "Trigonometry", words: ["SINE", "COSINE", "TANGENT", "SECANT"] },
      { label: "Go off on a ___", words: ["WHIM", "RANT", "LIMB", "JAUNT"] },
      { label: "Tree parts", words: ["BRANCH", "BOUGH", "TWIG", "TRUNK"] },
      { label: "Bank ___", words: ["ROLL", "NOTE", "RUPT", "ROBBER"] },
    ]
  },
  {
    categories: [
      { label: "Playing card games", words: ["BRIDGE", "POKER", "EUCHRE", "WHIST"] },
      { label: "Dental work", words: ["FILLING", "CROWN", "CAP", "VENEER"] },
      { label: "Nautical terms", words: ["BOW", "STERN", "GALLEY", "HELM"] },
      { label: "Pie ___", words: ["CRUST", "CHART", "EYED", "HOLE"] },
    ]
  },
  {
    categories: [
      { label: "Famous Michaels", words: ["JORDAN", "JACKSON", "PHELPS", "CAINE"] },
      { label: "Jordan ___", words: ["RIVER", "VALLEY", "PETERSON", "ALMOND"] },
      { label: "Almond products", words: ["MILK", "PASTE", "FLOUR", "BUTTER"] },
      { label: "River features", words: ["DELTA", "BANK", "MOUTH", "BEND"] },
    ]
  },
  {
    categories: [
      { label: "Famous Davids", words: ["BOWIE", "BECKHAM", "ATTENBOROUGH", "COPPERFIELD"] },
      { label: "Knife types", words: ["STANLEY", "BUTTER", "PARING", "CLEAVER"] },
      { label: "Dickens novels", words: ["OLIVER", "DOMBEY", "DORRIT", "DROOD"] },
      { label: "Stage magicians", words: ["HOUDINI", "BLAINE", "ANGEL", "PENN"] },
    ]
  },
  {
    categories: [
      { label: "Coffee sizes", words: ["TALL", "GRANDE", "VENTI", "SHORT"] },
      { label: "Espresso styles", words: ["DOUBLE", "SINGLE", "RISTRETTO", "LUNGO"] },
      { label: "Tennis scores", words: ["LOVE", "DEUCE", "GAME", "FIFTEEN"] },
      { label: "Dice games", words: ["YAHTZEE", "CRAPS", "BUNCO", "FARKLE"] },
    ]
  },
  {
    categories: [
      { label: "Planets", words: ["URANUS", "VENUS", "MARS", "NEPTUNE"] },
      { label: "Roman gods", words: ["JUNO", "VESTA", "JANUS", "CERES"] },
      { label: "Disney dogs", words: ["PLUTO", "GOOFY", "BOLT", "NANA"] },
      { label: "Liquid metals & elements", words: ["MERCURY", "GALLIUM", "CESIUM", "BROMINE"] },
    ]
  },
  {
    categories: [
      { label: "Golf clubs", words: ["IRON", "WOOD", "WEDGE", "DRIVER"] },
      { label: "Lead a group", words: ["GUIDE", "STEER", "HEAD", "PILOT"] },
      { label: "Pencil ___", words: ["CASE", "SHARPENER", "SKIRT", "PUSHER"] },
      { label: "Periodic metals", words: ["GOLD", "TIN", "ZINC", "NICKEL"] },
    ]
  },
  {
    categories: [
      { label: "Berries", words: ["STRAWBERRY", "BLACKBERRY", "RASPBERRY", "MULBERRY"] },
      { label: "Halle ___", words: ["BERRY", "LUJAH", "BANANA", "STORM"] },
      { label: "Old phone brands", words: ["NOKIA", "MOTOROLA", "ERICSSON", "PALM"] },
      { label: "Chuck ___", words: ["NORRIS", "ROAST", "WAGON", "STEAK"] },
    ]
  },
  {
    categories: [
      { label: "Pool / billiards", words: ["CUE", "CHALK", "POCKET", "RACK"] },
      { label: "Theatre prompts", words: ["LINE", "MARK", "EXIT", "ASIDE"] },
      { label: "Pocket ___", words: ["MONEY", "WATCH", "KNIFE", "ROCKET"] },
      { label: "Spice ___", words: ["GIRL", "JAR", "TRADE", "ISLANDS"] },
    ]
  },
  {
    categories: [
      { label: "Hot drinks", words: ["COCOA", "CIDER", "TODDY", "CHAI"] },
      { label: "Spill the ___", words: ["TEA", "BEANS", "MILK", "GUTS"] },
      { label: "British slang for food", words: ["GRUB", "NOSH", "SCRAN", "TUCK"] },
      { label: "Golf ___", words: ["CART", "COURSE", "CADDIE", "SWING"] },
    ]
  },
  {
    categories: [
      { label: "Ocean depth zones", words: ["SUNLIGHT", "HADAL", "MIDNIGHT", "ABYSS"] },
      { label: "Movie sagas", words: ["TWILIGHT", "MATRIX", "HOBBIT", "ROCKY"] },
      { label: "Danger ___", words: ["MOUSE", "CLOSE", "SIGN", "MONEY"] },
      { label: "___ zone", words: ["END", "OZONE", "TIME", "COMFORT"] },
    ]
  },
  {
    categories: [
      { label: "Currencies", words: ["DOLLAR", "RUPEE", "DINAR", "RAND"] },
      { label: "Weight units", words: ["POUND", "OUNCE", "STONE", "GRAM"] },
      { label: "Stone ___", words: ["WALL", "HENGE", "MASON", "FRUIT"] },
      { label: "Rolling ___", words: ["PIN", "STONES", "HILLS", "THUNDER"] },
    ]
  },
  {
    categories: [
      { label: "Punctuation", words: ["COMMA", "APOSTROPHE", "DASH", "SEMICOLON"] },
      { label: "Sprint races", words: ["HUNDRED", "RELAY", "HURDLE", "FURLONG"] },
      { label: "Large intestine etc", words: ["COLON", "LIVER", "SPLEEN", "KIDNEY"] },
      { label: "History ___", words: ["BOOK", "BUFF", "CLASS", "MAKER"] },
    ]
  },
  {
    categories: [
      { label: "Fencing actions", words: ["LUNGE", "PARRY", "RIPOSTE", "FOIL"] },
      { label: "Kitchen wraps", words: ["CLING", "WAX", "GREASE", "PARCHMENT"] },
      { label: "Wrap ___", words: ["AROUND", "PAPER", "PARTY", "SHEET"] },
      { label: "Rap ___", words: ["BATTLE", "STAR", "SCALLION", "MUSIC"] },
    ]
  },
  {
    categories: [
      { label: "Shades of blue", words: ["NAVY", "TEAL", "AZURE", "COBALT"] },
      { label: "Armed forces", words: ["ARMY", "MARINES", "AIRFORCE", "COASTGUARD"] },
      { label: "Hard metals", words: ["NICKEL", "ZINC", "CHROME", "TITANIUM"] },
      { label: "Clothing stores", words: ["GAP", "ZARA", "UNIQLO", "MANGO"] },
    ]
  },
  {
    categories: [
      { label: "Bread types", words: ["RYE", "SOURDOUGH", "PITA", "BAGEL"] },
      { label: "Brown spirits", words: ["BOURBON", "SCOTCH", "RUM", "BRANDY"] },
      { label: "Scotch ___", words: ["TAPE", "EGG", "BROTH", "MIST"] },
      { label: "Field of ___", words: ["DREAMS", "VISION", "PLAY", "STUDY"] },
    ]
  },
  {
    categories: [
      { label: "Eye parts", words: ["IRIS", "PUPIL", "RETINA", "CORNEA"] },
      { label: "Flowers", words: ["ROSE", "LILY", "DAISY", "TULIP"] },
      { label: "School ___", words: ["BUS", "YARD", "BOY", "TRIP"] },
      { label: "Greek goddesses", words: ["HERA", "ATHENA", "NIKE", "DEMETER"] },
    ]
  },
  {
    categories: [
      { label: "Compass points", words: ["NORTH", "SOUTH", "EAST", "WEST"] },
      { label: "Wild ___", words: ["CARD", "FIRE", "FLOWER", "CAT"] },
      { label: "GoT houses", words: ["STARK", "LANNISTER", "TARGARYEN", "TULLY"] },
      { label: "Kanye albums", words: ["YEEZUS", "GRADUATION", "DONDA", "808S"] },
    ]
  },
  {
    categories: [
      { label: "Martial arts", words: ["KARATE", "JUDO", "AIKIDO", "KENDO"] },
      { label: "Rock subgenres", words: ["PUNK", "GRUNGE", "INDIE", "GLAM"] },
      { label: "Heavy ___", words: ["METAL", "WEIGHT", "DUTY", "HANDED"] },
      { label: "Kid ___", words: ["CUDI", "GLOVES", "SISTER", "BROTHER"] },
    ]
  },
  {
    categories: [
      { label: "Cold desserts", words: ["SORBET", "PARFAIT", "GELATO", "SUNDAE"] },
      { label: "Deer family", words: ["MOOSE", "ELK", "CARIBOU", "FAWN"] },
      { label: "Chocolate ___", words: ["CHIP", "BAR", "BOX", "FOUNTAIN"] },
      { label: "Hair products", words: ["MOUSSE", "GEL", "WAX", "SERUM"] },
    ]
  },
  {
    categories: [
      { label: "Casino games", words: ["BLACKJACK", "BACCARAT", "ROULETTE", "KENO"] },
      { label: "Jack ___", words: ["POT", "RABBIT", "KNIFE", "FRUIT"] },
      { label: "Tools", words: ["DRILL", "WRENCH", "PLIERS", "CHISEL"] },
      { label: "MC ___", words: ["HAMMER", "ESCHER", "FLY", "LAREN"] },
    ]
  },
  {
    categories: [
      { label: "Constellations", words: ["ORION", "LYRA", "CYGNUS", "AQUILA"] },
      { label: "Harry Potter names", words: ["DRACO", "SIRIUS", "REMUS", "NARCISSA"] },
      { label: "Zodiac signs", words: ["LEO", "ARIES", "VIRGO", "LIBRA"] },
      { label: "Bright stars", words: ["VEGA", "RIGEL", "POLARIS", "ALTAIR"] },
    ]
  },
  {
    categories: [
      { label: "Fast food chains", words: ["WENDYS", "ARBYS", "POPEYES", "CHIPOTLE"] },
      { label: "Tinker ___", words: ["BELL", "TOY", "TON", "ER"] },
      { label: "Le Carré roles", words: ["TAILOR", "SOLDIER", "SAILOR", "SPY"] },
      { label: "Peter Pan", words: ["WENDY", "HOOK", "NANA", "SMEE"] },
    ]
  },
  {
    categories: [
      { label: "Skateboard tricks", words: ["OLLIE", "KICKFLIP", "GRIND", "NOSESLIDE"] },
      { label: "Daily ___", words: ["MAIL", "BREAD", "PLANET", "ROUTINE"] },
      { label: "Roast meats", words: ["BEEF", "CHICKEN", "LAMB", "PORK"] },
      { label: "Coffee steps", words: ["BREW", "POUR", "STEEP", "FROTH"] },
    ]
  },
  {
    categories: [
      { label: "Volcano parts", words: ["CRATER", "MAGMA", "VENT", "CONE"] },
      { label: "Pokemon trainers", words: ["MISTY", "BROCK", "GARY", "OAK"] },
      { label: "Air ___", words: ["PORT", "PLANE", "BORNE", "FARE"] },
      { label: "Ash ___", words: ["TRAY", "WEDNESDAY", "CLOUD", "POT"] },
    ]
  },
  {
    categories: [
      { label: "Fictional wizards", words: ["GANDALF", "MERLIN", "DUMBLEDORE", "SARUMAN"] },
      { label: "Falcon types", words: ["KESTREL", "HOBBY", "PEREGRINE", "GYR"] },
      { label: "Hobby ___", words: ["HORSE", "CRAFT", "IST", "SHOP"] },
      { label: "Engine types", words: ["DIESEL", "JET", "STEAM", "ROCKET"] },
    ]
  },
  {
    categories: [
      { label: "Pasta shapes", words: ["PENNE", "FUSILLI", "RIGATONI", "FARFALLE"] },
      { label: "Tie a ___", words: ["KNOT", "BOW", "RIBBON", "SHOELACE"] },
      { label: "Tie ___", words: ["BREAKER", "DYE", "PIN", "CLIP"] },
      { label: "Hair accessories", words: ["BAND", "SCRUNCHIE", "GRIP", "SLIDE"] },
    ]
  },
  {
    categories: [
      { label: "Cocktails", words: ["MOJITO", "MARTINI", "NEGRONI", "DAIQUIRI"] },
      { label: "Bond's order", words: ["SHAKEN", "STIRRED", "VODKA", "OLIVE"] },
      { label: "Mix together", words: ["WHISK", "BLEND", "FOLD", "STIR"] },
      { label: "Sports cars", words: ["ASTON", "LOTUS", "BENTLEY", "MCLAREN"] },
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

// A group's colour comes from its place in the puzzle: categories run from
// easiest to trickiest (🟨 🟩 🟦 🟪 in How to play). Dark letters on all four.
const TIER = ['var(--link-1)', 'var(--link-2)', 'var(--link-3)', 'var(--link-4)'];
const TILE_GAP = 8;
const COLS = 4;

const css = `
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes revealRow{0%{transform:scaleY(0);opacity:0}100%{transform:scaleY(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
`;

// One word of a solved group flipping from its grid spot (fromX/fromY, px
// from the board's top-left) into the solved row (toX/toY), staggered by delay.
function FlyingTile({ word, fromX, fromY, toX, toY, delay, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.animate([
      { transform: `translate(${fromX}px,${fromY}px) rotateY(0deg) scale(1)`, offset: 0 },
      { transform: `translate(${fromX}px,${fromY}px) rotateY(90deg) scale(0.85)`, offset: 0.3 },
      { transform: `translate(${toX}px,${toY}px) rotateY(-90deg) scale(0.85)`, offset: 0.6 },
      { transform: `translate(${toX}px,${toY}px) rotateY(0deg) scale(1)`, offset: 1 },
    ], { duration: reduced ? 0 : 700, delay: reduced ? 0 : delay, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
  }, [fromX, fromY, toX, toY, delay]);

  return (
    <div ref={ref} style={{
      position: 'absolute', left: 0, top: 0,
      transform: `translate(${fromX}px,${fromY}px)`,
      width: '23%', height: 56,
      background: color, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
      fontWeight: 700, color: 'var(--bg)',
      pointerEvents: 'none', zIndex: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
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
  const howTo = (
    <>
      Find 4 groups of 4 words that share something in common.<br /><br />
      Select 4 words and tap <b>Submit</b>. Each correct group flies into place.<br /><br />
      🟨 Easiest → 🟩 → 🟦 → 🟪 Trickiest<br /><br />
      You have <b>4 lives</b>. Watch out for words that seem to fit multiple groups!
    </>
  )

  return (
    <GameShell game="link" date={formatDate(puzzleDate)} howTo={howTo} onArchive={() => setShowArchive(true)}>
      <style>{css}</style>


      {/* Keyed by date: picking a puzzle in the Archive starts a fresh board. */}
      <LinkBoard key={puzzleDate ?? 'today'} puzzleDate={puzzleDate} streak={streak} />


      {showArchive && (
        <Archive
          game="link"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  );
}

function LinkBoard({ puzzleDate, streak }) {
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
  const [message, setMessage] = useState(null);
  const [guessHistory, setGuessHistory] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [oneAway, setOneAway] = useState(false);
  const [flyingTiles, setFlyingTiles] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [hiddenWords, setHiddenWords] = useState([]);

  const gridRef = useRef(null);
  const solvedRef = useRef(null);
  const wordRefs = useRef({});
  const solvedRef2 = useRef([]);

  useEffect(() => { solvedRef2.current = solved; }, [solved]);

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
      color: [...TIER, 'var(--ink)'][i % 5],
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
        return { word, fromX, fromY, toX, toY, delay: ti * 60, color: TIER[catIdx] };
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

  const buildShareText = () => {
    const lines = guessHistory.map(g => g.correct ? '🟩🟩🟩🟩' : '🟥🟥🟥🟥');
    const result = won ? `Solved in ${guessHistory.length} guess${guessHistory.length !== 1 ? 'es' : ''}!` : `Could not solve today's Link`;
    return `LINK by Streakle 🔥 — ${formatDate(puzzleDate)}\n${result}\n${lines.join('\n')}\n\nPlay at: playstreakle.com/link`;
  };

  return (
    <>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '30%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `confetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < lives ? 'var(--gold)' : 'var(--border-strong)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'var(--gold)', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {message && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: oneAway ? 'var(--gold)' : 'var(--ink)', zIndex: 50, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
          {message}
        </div>
      )}

      <div ref={gridRef} style={{ position: 'relative', width: '100%', maxWidth: 500, padding: '0 12px', boxSizing: 'border-box' }}>
        <div ref={solvedRef} style={{ marginBottom: solved.length > 0 ? 6 : 0 }}>
          {solved.map(i => (
            <div key={i} style={{ background: TIER[i], borderRadius: 8, padding: '12px 16px', marginBottom: 6, textAlign: 'center', animation: 'revealRow 0.35s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.75)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{puzzle.categories[i].label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bg)' }}>{puzzle.categories[i].words.join(', ')}</div>
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
                aspectRatio: '5/3', background: isSel ? 'var(--gold)' : 'var(--surface)',
                border: `2px solid ${isSel ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
                fontWeight: 700, color: isSel ? 'var(--bg)' : 'var(--ink)',
                cursor: gameOver || won || animating ? 'default' : 'pointer',
                userSelect: 'none', textAlign: 'center', padding: '0 4px',
                transition: 'background 0.15s, border-color 0.15s',
                animation: isShaking ? 'shake 0.45s ease' : isSel ? 'pop 0.3s ease' : 'none',
                boxShadow: isSel ? '0 0 0 3px rgba(var(--gold-rgb),0.2)' : 'none',
                opacity: isHidden ? 0 : 1,
              }}>
                {word}
              </div>
            );
          })}
        </div>

        {flyingTiles.map((ft, i) => (
          <FlyingTile key={`${ft.word}-${i}`} {...ft} />
        ))}
      </div>

      {!gameOver && !won && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setSelected([])} disabled={animating} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--gold)', cursor: 'pointer', fontSize: 14, padding: '8px 20px', fontWeight: 600 }}>
            Deselect
          </button>
          <button onClick={handleSubmit} disabled={selected.length !== 4 || animating} style={{
            background: selected.length === 4 && !animating ? 'var(--gold)' : 'var(--surface)',
            border: 'none', borderRadius: 8,
            color: selected.length === 4 && !animating ? 'var(--bg)' : 'var(--faint)',
            cursor: selected.length === 4 && !animating ? 'pointer' : 'default',
            fontSize: 14, padding: '8px 28px', fontWeight: 700, transition: 'background 0.2s',
          }}>
            Submit
          </button>
        </div>
      )}

      {won && (
        <ResultCard game="link" outcome="won" title="🎉 Solved!" shareText={buildShareText}>
          <div className="rc-detail">{guessHistory.length} guess{guessHistory.length !== 1 ? 'es' : ''} · {lives} {lives === 1 ? 'life' : 'lives'} remaining</div>
        </ResultCard>
      )}

      {gameOver && !won && (
        <ResultCard game="link" outcome="lost" title="Game over!" shareText={buildShareText}>
          <div className="rc-detail" style={{ marginBottom: 10 }}>The categories were:</div>
          {puzzle.categories.map((cat, i) => !solved.includes(i) && (
            <div key={i} style={{ background: TIER[i], borderRadius: 8, padding: '8px 16px', marginBottom: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.75)', textTransform: 'uppercase' }}>{cat.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bg)' }}>{cat.words.join(', ')}</div>
            </div>
          ))}
        </ResultCard>
      )}
    </>
  );
}