import { useState, useEffect, useCallback } from "react";
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';

const WORDS = [
  { word: "BRINY", def: "Salty like the sea.", fact: "The ocean contains about 35 grams of salt per litre. Ancient sailors called the sea 'the briny deep', and the phrase stuck around for centuries." },
  { word: "STOIC", def: "Enduring hardship without complaint.", fact: "Marcus Aurelius, a Roman emperor, wrote his private Stoic journals never intending them to be published. We know them as Meditations." },
  { word: "AXIOM", def: "A statement accepted as self-evidently true.", fact: "Euclid built all of geometry on just 5 axioms. Mathematicians spent 2,000 years trying to prove his 5th one — and couldn't. It gave birth to entirely new geometries." },
  { word: "EMBER", def: "A glowing fragment from a dying fire.", fact: "Embers can stay hot enough to reignite a fire for up to 72 hours after flames die out. Many wildfires start not from direct flames but from embers carried miles ahead by wind." },
  { word: "QUIRK", def: "A peculiar habit or characteristic.", fact: "Quirk originally meant a clever verbal trick in the 16th century. It only took on its modern meaning of an odd personal habit in the 1800s." },
  { word: "FJORD", def: "A long, narrow sea inlet between steep cliffs.", fact: "Norway's Sognefjord is the world's deepest at 1,308 metres — deeper than the height of the Burj Khalifa." },
  { word: "LUCID", def: "Clear and easy to understand; or vividly aware.", fact: "Lucid dreaming has been scientifically verified. In studies, dreamers signalled researchers with pre-agreed eye movements from inside the dream." },
  { word: "ZESTY", def: "Full of energy; having a strong, pleasant flavour.", fact: "Zest originally referred to the outer peel of a citrus fruit. The oils in the peel are so aromatic that rubbing it releases flavour compounds that juice alone doesn't contain." },
  { word: "CYNIC", def: "A person who believes people act only out of self-interest.", fact: "Diogenes, the most famous Cynic philosopher, reportedly lived in a large ceramic jar and told Alexander the Great to stop blocking his sunlight." },
  { word: "PIXIE", def: "A mythical fairy-like creature, often mischievous.", fact: "Pixies originate from Cornwall and Devon in England. They were said to lead travellers astray — still called being 'pixy-led' in some parts of England today." },
  { word: "TROVE", def: "A collection of valuable things.", fact: "In 2009, a man in England found 3,500 Anglo-Saxon gold and silver coins with a metal detector and was awarded £3.3 million by the Crown." },
  { word: "BLISS", def: "Perfect happiness; serene joy.", fact: "'Ignorance is bliss' comes from Thomas Gray's 1742 poem. The full line is: 'Where ignorance is bliss, 'tis folly to be wise.'" },
  { word: "CRYPT", def: "An underground room or vault, especially beneath a church.", fact: "Crypts were built to hold the remains of saints, believed to have miraculous powers. The word comes from the Greek kryptós, meaning hidden." },
  { word: "DWARF", def: "A mythological small being; or a very small star.", fact: "A teaspoon of white dwarf star material would weigh about 5 tonnes on Earth. They are roughly the size of Earth but contain half the Sun's mass." },
  { word: "FLINT", def: "A hard rock that produces sparks when struck.", fact: "Flint was humanity's first tool material, used for over 2 million years. It can be knapped into blades sharper than modern surgical steel." },
  { word: "GLEAN", def: "To gather information gradually from various sources.", fact: "Gleaning originally meant collecting leftover grain after a harvest — a legal right for the poor in medieval Europe. The Book of Ruth is largely a story about gleaning." },
  { word: "IRONY", def: "Saying the opposite of what you mean; or a twist of fate.", fact: "The Titanic sinking on its maiden voyage — the 'unsinkable ship' — is situational irony at its most devastating." },
  { word: "KNACK", def: "A special skill or talent for doing something.", fact: "Knack appeared in English around 1300 meaning a clever trick, before shifting to mean natural talent. Some linguists link it to the Dutch knak — the sound of something done with precise skill." },
  { word: "MAXIM", def: "A short statement expressing a general truth.", fact: "Benjamin Franklin was history's most prolific maxim writer — Poor Richard's Almanack is essentially a maxim collection." },
  { word: "OPTIC", def: "Relating to the eye or vision.", fact: "Your optic nerve has a blind spot. Your brain fills in the gap using surrounding visual information — essentially hallucinating the missing piece." },
  { word: "PLUMB", def: "Perfectly vertical; or to measure depth.", fact: "Plumbers got their name from the Latin plumbum, meaning lead — they once worked exclusively with lead pipes." },
  { word: "QUALM", def: "An uneasy feeling of doubt or anxiety.", fact: "Qualm originally meant a sudden feeling of faintness in the 16th century. It gradually shifted from a physical sensation to a moral one." },
  { word: "RELIC", def: "An object surviving from an earlier time; often sacred.", fact: "Medieval relic trade was rife with fraud. Across Europe, churches claimed enough pieces of the True Cross to build a small house." },
  { word: "SMIRK", def: "A self-satisfied, often irritating smile.", fact: "Smirk shares its Old English root with the word smile — they originally both just meant 'to smile'. Its conceited quality developed gradually over centuries." },
  { word: "TRAWL", def: "To search thoroughly; or to fish by dragging a net.", fact: "Scientists have compared bottom trawling's impact on deep-sea coral formations to clear-cutting ancient forests." },
  { word: "ENVOY", def: "A diplomatic representative sent on a special mission.", fact: "During the Cold War, secret envoys opened back-channel negotiations between enemies who couldn't publicly acknowledge talking to each other." },
  { word: "HEFTY", def: "Large, heavy, and powerful.", fact: "Hefty only appeared in American English around the 1860s, derived from heave. Before that, you'd say 'stout', 'burly', or 'ponderous'." },
  { word: "LUSTY", def: "Full of vigour and strength.", fact: "Lusty originally just meant healthy or cheerful in Middle English. Shakespeare used it constantly in this sense." },
  { word: "NYMPH", def: "A mythological spirit of nature in female form.", fact: "Greek mythology had dozens of types of nymphs — naiads in freshwater, nereids in the sea, dryads in trees, oreads in mountains." },
  { word: "APHID", def: "A tiny insect that feeds on plant sap.", fact: "Ants actually farm aphids — protecting them from predators in exchange for the sweet honeydew they secrete." },
];

const VALID_WORDS = new Set([
  "aback","abase","abash","abate","abbey","abbot","abhor","abide","abode","abort",
  "about","above","abuse","abyss","ached","aches","acorn","acres","acted","acute",
  "adage","adept","admit","adobe","adopt","adore","adorn","adult","affix","afoot",
  "after","again","agate","agile","aging","aglow","agony","agora","agree","ahead",
  "aided","aired","aisle","alarm","album","alder","allay","alley","allot","allow",
  "alloy","aloft","alone","aloof","aloud","alpha","altar","alter","amaze","amber",
  "amble","amend","amino","among","ample","amuse","angel","anger","angle","angst",
  "anime","anise","ankle","annex","antic","anvil","aorta","apart","apple","apply",
  "apron","aptly","arbor","ardor","arena","argon","argue","arise","armor","aroma",
  "arose","array","ashen","askew","aspen","asset","astir","atone","attic","audit",
  "augur","avail","avant","avoid","awash","awful","awoke","azure","badge","badly",
  "bagel","banal","bandy","bangs","banjo","barge","baron","basal","basic","basil",
  "basis","baste","batch","bathe","baton","batty","bayou","beach","beady","beard",
  "beast","beech","befit","began","begat","beget","begun","beige","belle","belly",
  "bench","beret","berth","beset","bezel","bible","biker","binge","biome","birch",
  "bison","biter","blade","blame","bland","blank","blare","blaze","bleak","bleed",
  "bless","blind","bliss","bloat","block","bloke","blood","blown","bluff","blunt",
  "blurb","blurt","blush","boast","bogus","boost","booth","botch","bound","boxer",
  "braid","brake","brave","brash","brawl","brawn","braze","break","breed","breve",
  "briar","brine","brink","briny","broil","brook","brood","broth","brown","brunt",
  "brute","budge","buggy","built","bulge","bully","burly","burro","bylaw","byway",
  "cabal","cache","cadre","camel","cameo","candy","canny","canoe","carat","cargo",
  "carol","carry","catch","cause","cedar","chain","chaos","charm","chasm","cheap",
  "cheat","check","cheek","chess","chide","chief","chili","chime","chimp","china",
  "choir","choke","chomp","chose","civic","civil","clack","claim","clamp","clang",
  "clank","clash","clasp","cleat","clerk","click","cliff","climb","cling","cloak",
  "clone","close","cloth","cloud","clout","clown","cobra","comet","comic","comma",
  "conch","condo","coral","coupe","covet","crack","craft","crane","crank","crash",
  "craze","creak","creed","creek","creep","crest","crimp","crisp","croak","crone",
  "crook","cross","crude","cruel","crumb","cubic","curly","curve","cyber","cynic",
  "daily","dairy","daisy","dance","dandy","darts","datum","dazed","decal","decay",
  "decoy","defer","deity","delta","dense","depot","derby","detox","deuce","diode",
  "dirge","disco","ditty","diver","dizzy","dodge","dogma","dolce","dolly","donor",
  "dopey","dowdy","dowel","dowry","dozen","draft","drain","drape","drawl","drawn",
  "dread","dream","dregs","dress","dried","drift","drill","drone","drool","droop",
  "dross","drove","duchy","dully","dunce","dusky","dusty","dwarf","dwelt","dying",
  "eagle","early","earns","earth","easel","eaten","ebony","eight","eject","elite",
  "elope","elude","elves","email","emcee","ember","empty","enact","endow","ensue",
  "envoy","epoch","equal","equip","erupt","essay","evade","event","every","exact",
  "exalt","exert","exile","exist","expel","extra","exult","eyrie","fable","facet",
  "faint","fairy","false","fancy","fatal","fault","fauna","feast","fence","ferry",
  "fetch","fiend","fiery","fifth","fifty","fight","filth","finch","first","fishy",
  "fixed","fizzy","fjord","flair","flame","flank","flare","flask","fleck","fleet",
  "flesh","fling","flint","flirt","flock","flood","floor","floss","flour","flout",
  "flown","fluff","fluke","flume","flunk","flute","foamy","foggy","folly","forge",
  "forgo","forte","forum","found","foyer","frail","frame","frank","fraud","frill",
  "frond","frost","froth","froze","fungi","funky","funny","furor","fuzzy","gamer",
  "gaudy","gauze","gavel","gecko","genre","ghost","girth","given","glade","gland",
  "glare","glaze","gleam","glean","glide","glint","gloat","gloom","gloss","glove",
  "glyph","gnash","gnome","going","golem","goose","gorge","gouge","gourd","grace",
  "graft","grail","grain","grime","grimy","gripe","groan","groin","groom","grout",
  "grove","growl","gruel","gruff","guile","guise","gully","gusto","gypsy","habit",
  "hairy","haste","haunt","haven","havoc","haute","heady","hefty","heist","herbs",
  "heron","hippo","hitch","hoard","hoary","hobby","holly","homer","honor","horde",
  "hotel","hound","hover","humph","hutch","hyena","hyper","icily","ideal","idiom",
  "idiot","igloo","image","inane","incur","index","inept","inert","infer","ingot",
  "inner","inset","inter","intro","irate","irony","ivory","jaunt","jazzy","jewel",
  "jiffy","joust","judge","juice","juicy","jumbo","junto","karma","kayak","kebab",
  "khaki","kinky","kitty","knack","kneel","knelt","knife","knock","knoll","known",
  "labor","lance","lanky","lapel","laser","latch","later","latte","layer","leaky",
  "leapt","learn","lease","leech","legal","lemon","levee","level","libel","light",
  "lilac","limbo","lingo","liver","llama","local","lodge","lofty","login","loner",
  "loopy","lorry","lotus","lowly","lucid","lucre","lusty","lying","mafia","magic",
  "major","manic","manly","manor","maple","march","masse","match","maxim","maybe",
  "mealy","mercy","merit","metal","might","mimic","mirth","miser","mocha","modal",
  "model","mogul","moldy","money","monks","month","moody","moose","moral","moron",
  "mossy","motif","motto","mound","mourn","muddy","mulch","mural","murky","musty",
  "myrrh","naive","nanny","nasal","nasty","naval","needy","nerve","newly","niece",
  "nifty","night","ninja","noble","noise","north","notch","novel","nudge","nurse",
  "nymph","occur","olive","onset","optic","orbit","other","otter","ought","outdo",
  "outer","oxide","paddy","paint","panel","panic","pansy","pasta","pause","peach",
  "pearl","penal","penny","pesky","petty","phase","phony","piano","picky","piggy",
  "pilot","pinch","piney","pitch","pithy","pixel","pizza","place","plaid","plank",
  "plane","plaza","pleat","pluck","plumb","plume","plunk","poach","poise","polyp",
  "poppy","porky","posse","prawn","press","price","pride","prime","primp","print",
  "prism","probe","prone","prong","prowl","prude","psalm","pudgy","pulse","punch",
  "puppy","purge","pygmy","qualm","rabbi","rabid","radar","radix","rainy","rally",
  "ramen","ranch","randy","rapid","raspy","ratty","raven","rebus","recap","reedy",
  "reign","relax","relay","relic","remix","repay","repel","reset","resin","retro",
  "reuse","revel","rhino","ridge","risky","rival","river","rivet","robin","rocky",
  "rouge","rough","rowdy","ruddy","rugby","ruler","rumba","rusty","sadly","saint",
  "salsa","salty","salvo","sandy","sassy","satin","satyr","sauce","saucy","savor",
  "savvy","scald","scalp","scaly","scamp","scant","scare","scarf","scary","scene",
  "scone","scoop","scorn","scout","scowl","scram","scrap","scree","screw","scrub",
  "seedy","seize","serum","setup","shack","shade","shake","shale","shall","shame",
  "shark","shawl","shear","sheen","shelf","shell","shift","shine","shirt","shock",
  "shone","shook","shore","shrug","sigma","silky","sinew","skimp","skirt","skull",
  "skunk","slain","slang","slant","slash","sleek","sleet","slept","slice","slide",
  "slime","slosh","sloth","slump","slunk","slurp","smack","smash","smear","smirk",
  "smite","smock","smote","snack","snaky","snare","snarl","sneak","sneer","snide",
  "sniff","snore","snort","snout","snowy","snuck","snuff","solar","solve","sooth",
  "space","spade","spare","spark","spasm","spawn","speck","spell","spend","spice",
  "spike","spine","spite","spook","spoon","spout","spree","sprig","spunk","squat",
  "squid","stack","stain","stair","stale","stalk","stall","stamp","stand","stark",
  "start","stash","state","steal","steam","steep","steer","stern","stiff","sting",
  "stock","stoic","stomp","stone","stood","stool","stoop","storm","story","stout",
  "stove","strap","straw","stray","strip","strut","stuck","study","stump","stunk",
  "stunt","suave","suite","sulky","sunny","surge","surly","swain","swamp","swear",
  "sweat","sweep","swept","swine","swirl","swoop","taboo","taffy","talon","taunt",
  "tawny","terse","thick","thief","thing","think","thorn","those","three","threw",
  "throe","thumb","tiara","tidal","tiger","tilde","timid","tipsy","titan","tonal",
  "topic","torch","total","towel","toxic","trace","track","trail","trait","tramp",
  "trash","trawl","tread","treat","trend","trial","tribe","trick","trill","tripe",
  "trite","troll","tromp","troop","troth","trove","truce","tryst","tuber","tulle",
  "tumor","tuner","tunic","tuple","tutor","udder","ultra","uncut","undue","unfit",
  "union","unite","unlit","unmet","unset","until","unzip","upper","upset","usher",
  "valid","valor","valve","vapid","vault","vaunt","venom","verse","vicar","vigor",
  "viral","virus","visor","vista","vital","vivid","vixen","vocal","vodka","vogue",
  "vomit","voter","vouch","wacky","waltz","warty","waste","watch","water","weary",
  "wedge","weedy","weird","whale","whack","whiff","whirl","whisk","white","whole",
  "whose","wield","wimpy","windy","witty","woody","woozy","wordy","world","wormy",
  "worst","wrath","wring","wrist","wrote","wryly","yacht","yearn","yield","young",
  "yours","yucky","yummy","zappy","zebra","zesty","zippy","zombi","crane","grace",
  "brave","bland","brake","price","twice","dense","tense","chess","brass","grass",
  "fizzy","ditty","kitty","batty","catty","fatty","patty","ratty","natty","gabby",
  "tabby","lobby","bobby","hobby","clamp","cramp","tramp","stamp","champ","swamp",
  "clank","blank","plank","frank","prank","crank","drank","flank","snare","spare",
  "share","stare","grout","clove","drove","grove","stove","blade","grade","trade",
  "shade","evade","braid","trail","snail","frail","quail","pearl","early","girly",
  "label","gavel","growl","howl","jowl","fowl","scowl","drawl","crawl","spawn",
  "drawn","brawn","prawn","dream","cream","steam","gleam","drain","grain","brain",
  "train","plain","frame","shame","whale","shale","scale","metal","petal","total",
  "local","vocal","tonal","moral","coral","mural","viral","gloom","bloom","broom",
  "swoon","croon","prune","crude","brood","blood","flood","stoop","droop","snoop",
  "swoop","drool","stool","spool","bacon","wagon","mason","prism","chasm","spasm",
  "realm","psalm","balmy","grimy","foamy","roomy","loamy","seamy","aphid","bliss",
  "crypt","envoy","flint","glean","hefty","irony","knack","lusty","maxim","nymph",
  "optic","plumb","qualm","relic","smirk","trawl","fjord","lucid","quirk","ember",
  "axiom",
]);

function getDailyWord() {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return WORDS[seed % WORDS.length];
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const ROWS = 6, COLS = 5;
const KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const ST = { empty:'empty', correct:'correct', present:'present', absent:'absent' };
const CLR = { empty:'#16213e', active:'#1e2d4a', correct:'#538d4e', present:'#b59f3b', absent:'#3a3a4a' };

const css = `
@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(6px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}75%{transform:translateX(-2px)}90%{transform:translateX(2px)}}
@keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}}
@keyframes letterPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes cardFlip{0%{transform:rotateY(0deg)}100%{transform:rotateY(180deg)}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
`;

export default function WordsGame() {
  const { streak } = useStreak('words');
  const [daily] = useState(() => getDailyWord());
  const [guesses, setGuesses] = useState(Array(ROWS).fill(''));
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState('');
  const [tileStates, setTileStates] = useState({});
  const [keyStates, setKeyStates] = useState({});
  const [shakeRow, setShakeRow] = useState(null);
  const [bounceRow, setBounceRow] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [message, setMessage] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const [revealingTiles, setRevealingTiles] = useState({});

  const showMsg = (msg, dur=1800) => { setMessage(msg); setTimeout(()=>setMessage(null), dur); };

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*600,
      color:['#538d4e','#b59f3b','#aaaaff','#f5a623','#fff'][i%5], size:5+Math.random()*8
    }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const evaluate = useCallback((guess) => {
    const result = Array(COLS).fill(ST.absent);
    const target = daily.word.split('');
    const guessArr = guess.split('');
    const used = Array(COLS).fill(false);
    for (let i=0;i<COLS;i++) {
      if (guessArr[i]===target[i]) { result[i]=ST.correct; used[i]=true; }
    }
    for (let i=0;i<COLS;i++) {
      if (result[i]===ST.correct) continue;
      for (let j=0;j<COLS;j++) {
        if (!used[j]&&guessArr[i]===target[j]) { result[i]=ST.present; used[j]=true; break; }
      }
    }
    return result;
  }, [daily.word]);

  const submitGuess = useCallback(() => {
    if (input.length!==COLS) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not enough letters'); return;
    }
    if (!VALID_WORDS.has(input.toLowerCase()) && !WORDS.some(w=>w.word===input)) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not a valid word!'); return;
    }
    const result = evaluate(input);
    const rowIdx = current;
    const submittedInput = input;
    setGuesses(prev=>{const n=[...prev];n[rowIdx]=submittedInput;return n;});
    setInput('');

    result.forEach((st,colIdx)=>{
      setTimeout(()=>{
        const key=`${rowIdx}-${colIdx}`;
        setTileStates(prev=>({...prev,[key]:st}));
        setRevealingTiles(prev=>({...prev,[key]:true}));
        setTimeout(()=>setRevealingTiles(prev=>{const n={...prev};delete n[key];return n;}),800);
      }, colIdx*150);
    });

    const totalDelay = (COLS-1)*150+800;

    setTimeout(()=>{
      const newKeyStates={...keyStates};
      submittedInput.split('').forEach((ch,i)=>{
        const prev=newKeyStates[ch];
        if (result[i]===ST.correct) newKeyStates[ch]=ST.correct;
        else if (result[i]===ST.present&&prev!==ST.correct) newKeyStates[ch]=ST.present;
        else if (!prev) newKeyStates[ch]=ST.absent;
      });
      setKeyStates(newKeyStates);
      const isWin=result.every(s=>s===ST.correct);
      if (isWin) {
        setBounceRow(rowIdx); setTimeout(()=>setBounceRow(null),1000);
        saveResult({ game: 'words', completed: true });
        setTimeout(()=>{setWon(true);setGameOver(true);spawnConfetti();setShowFact(true);},400);
      } else if (rowIdx+1>=ROWS) {
        saveResult({ game: 'words', completed: false });
        setTimeout(()=>{setGameOver(true);setShowFact(true);showMsg(daily.word,3000);},200);
      } else {
        setCurrent(c=>c+1);
      }
    }, totalDelay);
  }, [input, current, keyStates, evaluate, daily.word]);

  const handleKey = useCallback((key) => {
    if (gameOver) return;
    if (key==='ENTER') { submitGuess(); return; }
    if (key==='⌫'||key==='BACKSPACE') { setInput(i=>i.slice(0,-1)); return; }
    if (/^[A-Z]$/.test(key)&&input.length<COLS) setInput(i=>i+key);
  }, [gameOver, input, submitGuess]);

  useEffect(()=>{
    const handler=(e)=>handleKey(e.key.toUpperCase());
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, [handleKey]);

  const getLetter=(r,c)=>{
    if (guesses[r]) return guesses[r][c]||'';
    if (r===current) return input[c]||'';
    return '';
  };

  const getTileColor=(r,c)=>{
    const st=tileStates[`${r}-${c}`];
    return st?CLR[st]:CLR.empty;
  };

  const buildShare=()=>{
    const emoji={[ST.correct]:'🟩',[ST.present]:'🟨',[ST.absent]:'⬛'};
    const rows=guesses.slice(0,won?current+1:ROWS).filter(g=>g)
      .map((_,i)=>Array.from({length:COLS},(__,j)=>emoji[tileStates[`${i}-${j}`]]||'⬛').join(''));
    const result=won?`${current+1}/${ROWS}`:'X/6';
    return `WORDS by Streakle 🔥 — ${formatDate()}\n${result}\n${rows.join('\n')}\n\nPlay at: playstreakle.com/words`;
  };

  const handleShare=async()=>{
    const text=buildShare();
    try {
      if (navigator.share) await navigator.share({text});
      else {await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    } catch {await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };

  return (
    <div style={{minHeight:'100vh',background:'#1a1a2e',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:24,paddingBottom:32,fontFamily:"'Segoe UI',sans-serif",color:'#e0e0e0',position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <UserMenu />
      <a href="/" style={{position:'absolute',left:16,top:24,color:'#aaaaff',textDecoration:'none',fontSize:13,fontWeight:600}}>← Back</a>

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:2,color:'#fff'}}>WORDS</div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#f5a623',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #4a4a8a',borderRadius:6,color:'#aaaaff',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
      </div>

      <div style={{fontSize:13,color:'#6666aa',marginBottom:10,marginTop:6}}>{formatDate()}</div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'#f5a623', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {showHow&&(
        <div style={{background:'#0f1535',border:'1px solid #4a4a8a',borderRadius:10,padding:16,maxWidth:320,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#aaaaff'}}>How to play</b><br/>
          Guess the 5-letter word in 6 tries.<br/><br/>
          🟩 Right letter, right spot<br/>
          🟨 Right letter, wrong spot<br/>
          ⬛ Letter not in the word<br/><br/>
          After the game, discover something fascinating about the word!
        </div>
      )}

      {message&&(
        <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',background:'#e0e0e0',borderRadius:8,padding:'8px 20px',fontSize:14,fontWeight:700,color:'#1a1a2e',zIndex:50,animation:'slideUp 0.2s ease',whiteSpace:'nowrap'}}>
          {message}
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
        {Array.from({length:ROWS},(_,rowIdx)=>{
          const isShaking=shakeRow===rowIdx;
          const isBouncing=bounceRow===rowIdx;
          return (
            <div key={rowIdx} style={{display:'flex',gap:6,animation:isShaking?'shake 0.5s ease':'none'}}>
              {Array.from({length:COLS},(_,colIdx)=>{
                const letter=getLetter(rowIdx,colIdx);
                const tileColor=getTileColor(rowIdx,colIdx);
                const colored=tileColor!==CLR.empty;
                const revealing=!!revealingTiles[`${rowIdx}-${colIdx}`];
                return (
                  <div key={colIdx} style={{width:52,height:52,perspective:'200px',flexShrink:0,animation:isBouncing?`bounce 0.4s ${colIdx*80}ms ease`:'none'}}>
                    <div style={{
                      width:'100%',height:'100%',position:'relative',
                      transformStyle:'preserve-3d',
                      animation:revealing?'cardFlip 0.80s ease forwards':'none',
                      transform:colored&&!revealing?'rotateY(180deg)':'rotateY(0deg)',
                    }}>
                      <div style={{
                        position:'absolute',inset:0,
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        background:letter?CLR.active:CLR.empty,
                        border:`2px solid ${letter?'#aaaaff':'#2a3a5a'}`,
                        borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:22,fontWeight:800,color:'#fff',
                        animation:letter&&!colored?'letterPop 0.1s ease':'none',
                      }}>{letter}</div>
                      <div style={{
                        position:'absolute',inset:0,
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        transform:'rotateY(180deg)',
                        background:tileColor,border:'2px solid transparent',
                        borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:22,fontWeight:800,color:'#fff',
                      }}>{letter}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showFact&&(
        <div style={{background:'#0f1535',border:`1px solid ${won?'#538d4e':'#4a4a8a'}`,borderRadius:12,padding:'16px 20px',maxWidth:340,width:'90%',marginBottom:16,animation:'slideUp 0.5s ease'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:won?'#4caf50':'#f5a623',textTransform:'uppercase',marginBottom:6}}>
            {won?"✅ Today's word":"❌ Today's word was"}
          </div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:3,color:'#fff',marginBottom:4}}>{daily.word}</div>
          <div style={{fontSize:13,color:'#aaaaff',fontStyle:'italic',marginBottom:10}}>{daily.def}</div>
          <div style={{fontSize:13,color:'#aaa',lineHeight:1.65}}>{daily.fact}</div>
        </div>
      )}

      {gameOver&&(
        <div style={{position:'relative',display:'inline-block',marginBottom:20}}>
          <button onClick={handleShare} style={{background:'#4a4a8a',color:'#fff',border:'none',borderRadius:8,padding:'10px 28px',fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.2s'}}
            onMouseOver={e=>e.currentTarget.style.background='#6666bb'}
            onMouseOut={e=>e.currentTarget.style.background='#4a4a8a'}>
            📋 Share result
          </button>
          {copied&&<div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>Copied!</div>}
        </div>
      )}

      {!gameOver&&(
        <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center'}}>
          {KEYBOARD.map((row,ri)=>(
            <div key={ri} style={{display:'flex',gap:5}}>
              {row.map(key=>{
                const st=keyStates[key];
                const wide=key==='ENTER'||key==='⌫';
                return (
                  <button key={key} onClick={()=>handleKey(key)} style={{
                    minWidth:wide?56:34,height:46,
                    background:st===ST.correct?CLR.correct:st===ST.present?CLR.present:st===ST.absent?CLR.absent:'#2a3a5a',
                    border:'none',borderRadius:6,color:'#fff',
                    fontSize:wide?11:14,fontWeight:700,
                    cursor:'pointer',userSelect:'none',
                    transition:'background 0.3s',padding:'0 4px',
                  }}>{key}</button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:32,fontSize:12,color:'#4a4a8a',textAlign:'center'}}>
        <a href="/privacy" style={{color:'#4a4a8a',textDecoration:'none'}}>Privacy Policy / Politique de confidentialité</a>
      </div>
    </div>
  );
}