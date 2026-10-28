// Link's puzzles. Each lists its four groups from easiest to trickiest; the
// game colours a group by its position, so no puzzle carries colours. Every
// split must be unique: a word that fits two labels has to be forced into one
// group by the others. Order matters to ./schedule.js — append new puzzles at
// the end and see its notes before reordering or removing any. A shipped
// puzzle's words or labels change only by a content correction logged in
// ./schedule.test.js, made before its next day starts in any time zone.

export const PUZZLES = [
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
      { label: "Greek letters", words: ["GAMMA", "DELTA", "SIGMA", "KAPPA"] },
      { label: "Wolf pack roles", words: ["ALPHA", "BETA", "OMEGA", "PUP"] },
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
      { label: "Snooker balls", words: ["RED", "PINK", "YELLOW", "BROWN"] },
      { label: "Martial arts", words: ["JUDO", "KARATE", "KENDO", "AIKIDO"] },
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
      { label: "Go off on a ___", words: ["WHIM", "RANT", "TIRADE", "JAUNT"] },
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
      { label: "Stage magicians", words: ["HOUDINI", "TELLER", "ANGEL", "PENN"] },
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
      { label: "Hair accessories", words: ["BAND", "SCRUNCHIE", "BARRETTE", "TIARA"] },
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
