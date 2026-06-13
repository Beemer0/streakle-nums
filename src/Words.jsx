import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { evaluate } from './evaluate';
import validWordsRaw from './validWords.txt?raw';
import { useSeo, PAGE_SEO } from './seo';

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
  { word: "GLYPH", def: "A symbol or carved character.", fact: "The word comes from the Greek 'glyphē', a carving. 'Hieroglyph' literally means 'sacred carving'." },
  { word: "QUELL", def: "To suppress or put an end to.", fact: "From Old English 'cwellan', to kill — the same root that gives us 'quail', to lose courage." },
  { word: "EPOCH", def: "A notable period in history.", fact: "Geologists divide time into eons, eras, periods and epochs. We currently live in the Holocene epoch." },
  { word: "NADIR", def: "The lowest point.", fact: "An astronomy term for the point directly beneath an observer — the opposite of the zenith. Both words come from Arabic." },
  { word: "VERVE", def: "Energy and enthusiasm.", fact: "Borrowed from French, where it first meant a special talent in writing. It traces back to Latin 'verba', words." },
  { word: "CACHE", def: "A hidden store of things.", fact: "From the French 'cacher', to hide. In computing it means fast-access storage — and it's pronounced 'cash', not 'cashay'." },
  { word: "DROLL", def: "Amusing in a quaint, odd way.", fact: "From the Dutch 'drollig', comical. It entered English in the 1600s." },
  { word: "KNELL", def: "The solemn sound of a bell.", fact: "A 'death knell' tolls for a funeral. John Donne wrote, 'never send to know for whom the bell tolls'." },
  { word: "SAVOR", def: "To taste and enjoy fully.", fact: "From Latin 'sapere', to taste — the same root as 'sapient', wise. Taste and discernment were long linked." },
  { word: "EERIE", def: "Strange and unsettling.", fact: "Originally a Scots and northern English word meaning 'fearful'. Its modern spooky sense is comparatively recent." },
  { word: "GAMUT", def: "The complete range of something.", fact: "From medieval music: 'gamma ut' was the scale's lowest note, so the gamut spanned every note from bottom to top." },
  { word: "HOARD", def: "A hidden store of valuables.", fact: "Not to be confused with 'horde', a crowd. The instinct is shared with squirrels and magpies that stash more than they need." },
  { word: "TEMPO", def: "The speed of a piece of music.", fact: "Italian for 'time'. The metronome, invented around 1815, measures tempo in beats per minute." },
  { word: "CRAVE", def: "To long for intensely.", fact: "From Old English 'crafian', to demand as a right — the meaning softened from legal claim to yearning." },
  { word: "DELVE", def: "To dig or research deeply.", fact: "It literally meant to dig with a spade. 'When Adam delved and Eve span' rallied England's 1381 Peasants' Revolt." },
  { word: "FROND", def: "A large divided leaf, as of a fern.", fact: "Ferns are ancient — they predate the dinosaurs and flowering plants, spreading by spores rather than seeds." },
  { word: "GUILE", def: "Cunning or sly deceit.", fact: "From Old French, and related to 'wile'. 'Guileless' means innocent — literally, without cunning." },
  { word: "HAVEN", def: "A place of safety.", fact: "It first meant a harbour for ships. Copenhagen — 'merchants' haven' — still carries the sense of a sheltered port." },
  { word: "INEPT", def: "Clumsy or incompetent.", fact: "Its opposite is 'apt'. Both come from Latin 'aptus', fitted — so 'inept' literally means not fitted for the task." },
  { word: "JAUNT", def: "A short pleasure trip.", fact: "It once meant to tire a horse by riding it back and forth; the leisurely meaning came later." },
  { word: "KAYAK", def: "A narrow paddled boat.", fact: "An Inuit invention, originally sealskin stretched over a wood or bone frame. The word is a palindrome." },
  { word: "LATHE", def: "A machine that spins material for shaping.", fact: "One of the oldest machine tools, used since ancient Egypt. The potter's wheel is a vertical cousin." },
  { word: "MIRTH", def: "Amusement and laughter.", fact: "From Old English 'myrgth', joy — related to 'merry'. It has been in continuous use for over 800 years." },
  { word: "NICHE", def: "A specialised role or position.", fact: "From French, originally an architectural recess for a statue. In ecology, an organism's niche is its 'job' in the system." },
  { word: "PRISM", def: "A transparent shape that splits light.", fact: "Newton used one in 1666 to show white light is made of colours, founding the science of spectroscopy." },
  { word: "RIVET", def: "A metal fastening pin; or to grip attention.", fact: "Rosie the Riveter symbolised WWII women workers. To be 'riveted' is to be fixed in place by fascination." },
  { word: "SLEEK", def: "Smooth and glossy.", fact: "A variant of 'slick'. It first described well-groomed, healthy-looking hair or fur." },
  { word: "TRYST", def: "A private romantic meeting.", fact: "From Old French, a tryst was first an appointed station to wait at during a hunt — then a lovers' rendezvous." },
  { word: "USHER", def: "One who shows people to their seats.", fact: "From Latin 'ostiarius', doorkeeper, from 'ostium', door. To 'usher in' is to introduce or herald." },
  { word: "VOUCH", def: "To affirm or guarantee.", fact: "From Latin 'vocare', to call — the root of 'voice' and 'vocation'. A voucher 'calls' something into proof." },
  { word: "WHARF", def: "A landing place for ships.", fact: "Likely from Old English 'hwearf', a bank or shore. The rare word 'wharfinger' means a person who owns a wharf." },
  { word: "YACHT", def: "A light sailing or motor vessel.", fact: "From Dutch 'jacht', short for 'hunting ship' — once used to chase pirates. The silent 'ch' betrays its Dutch origin." },
  { word: "ZEBRA", def: "A striped African relative of the horse.", fact: "No two zebras share the same stripe pattern, like fingerprints. The stripes may help deter biting flies." },
  { word: "AMBLE", def: "To walk at a leisurely pace.", fact: "It first named a horse's gait. A 'preamble' literally walks before the main text." },
  { word: "BROOD", def: "To dwell gloomily; or a family of young.", fact: "Both senses come from a hen sitting on her eggs — incubating either chicks or dark thoughts." },
  { word: "CHIDE", def: "To scold mildly.", fact: "An Old English word with no clear relatives in other languages — a rare native survivor. Its past tense can be 'chid' or 'chided'." },
  { word: "DROSS", def: "Worthless matter or waste.", fact: "Originally the scum that forms on molten metal; now it means any rubbish, especially among something valuable." },
  { word: "ELUDE", def: "To escape or evade.", fact: "From Latin 'eludere', to cheat at a game. 'Elusive' and 'illusion' share the root 'ludere', to play." },
  { word: "FETID", def: "Smelling foul.", fact: "From Latin 'fetere', to stink. The corpse flower's fetid odour mimics rotting meat to attract pollinators." },
  { word: "GROVE", def: "A small wood or cluster of trees.", fact: "Ancient cultures kept sacred groves. 'Academy' comes from a grove near Athens where Plato taught." },
  { word: "HEIST", def: "A robbery.", fact: "A 20th-century American twist on 'hoist' — to lift, and so to steal. Crime films made it a household word." },
  { word: "IDIOM", def: "A phrase whose meaning isn't literal.", fact: "From Greek 'idios', one's own. 'Kick the bucket' is an idiom that baffles anyone translating it word for word." },
  { word: "JOUST", def: "A lance combat between mounted knights.", fact: "From Latin 'iuxtare', to approach. Medieval tournaments could draw thousands of spectators." },
  { word: "KUDOS", def: "Praise for an achievement.", fact: "From Greek 'kydos', glory. Despite the 's', it's singular — there is no single 'kudo'." },
  { word: "LITHE", def: "Slender and supple.", fact: "From Old English 'lithe', gentle or mild. 'Lithe' was once an old name for the months of June and July." },
  { word: "MUNCH", def: "To chew steadily and audibly.", fact: "Edvard Munch painted 'The Scream'. The verb itself is likely an imitation of the sound of chewing." },
  { word: "NUDGE", def: "A gentle push or prompt.", fact: "Behavioural economists Thaler and Sunstein made it famous in 2008 — small prompts that steer big choices." },
  { word: "OZONE", def: "A form of oxygen with three atoms.", fact: "From Greek 'ozein', to smell — named for its sharp scent after lightning. The ozone layer screens out UV rays." },
  { word: "PIQUE", def: "To stir interest, or to irritate.", fact: "From French 'piquer', to prick. To be 'piqued' can mean intrigued or annoyed — both a kind of sting." },
  { word: "QUASH", def: "To reject or suppress forcibly.", fact: "A legal term for voiding a decision, from Latin 'quassare', to shatter — a cousin of 'squash'." },
  { word: "ROUSE", def: "To wake or stir up.", fact: "It began as a falconry term for a hawk shaking its feathers. 'Arouse' is its close cousin." },
  { word: "TAWNY", def: "An orange-brown colour.", fact: "From Old French 'tanné', tanned — the colour of tanned leather. The tawny owl takes its name from it." },
  { word: "UMBER", def: "A brown earth pigment.", fact: "From the Italian region Umbria, or Latin 'umbra', shadow. Raw and burnt umber are staples of the artist's palette." },
  { word: "VENOM", def: "Poison delivered by an animal.", fact: "Venom is injected by bites or stings; poison is absorbed or eaten. From Latin 'venenum', which once also meant a love potion." },
  { word: "WAGER", def: "A bet.", fact: "From Old North French 'wagier', to pledge. It shares an origin with 'gage' and 'wage' — all about something staked." },
  { word: "YIELD", def: "To produce, or to give way.", fact: "From Old English 'gieldan', to pay. On a road sign it means give way; on a farm it means output." },
  { word: "ZILCH", def: "Nothing; zero.", fact: "American slang from the 1960s. 'Mr. Zilch' was a stock 'nobody' character in a 1930s humour magazine." },
  { word: "ABHOR", def: "To detest.", fact: "From Latin 'abhorrere', to shrink back in horror. It shares its root with 'horror' and 'horrid'." },
  { word: "BLOAT", def: "To swell with fluid or gas.", fact: "In cattle, bloat can be life-threatening. The word is related to 'blow' and the puffed-up blowfish." },
  { word: "CREDO", def: "A statement of beliefs.", fact: "Latin for 'I believe' — the opening word of the Nicene Creed. Now used for any guiding principle." },
  { word: "EMCEE", def: "A master of ceremonies.", fact: "It's simply the initials 'M.C.' spelled out, and it became both a noun and a verb in 20th-century entertainment." },
  { word: "FLORA", def: "The plant life of a region.", fact: "Named after the Roman goddess of flowers. Its animal counterpart, 'fauna', honours a Roman nature deity." },
  { word: "GORGE", def: "A narrow ravine; or to eat greedily.", fact: "From Latin 'gurges', whirlpool or throat. A gorge is carved by water; to gorge is to fill the throat." },
  { word: "HUTCH", def: "A cage for small animals, or a cupboard.", fact: "From Latin 'hutica', a chest. Rabbit hutches and china hutches share the same 'storage box' idea." },
  { word: "INGOT", def: "A block of cast metal.", fact: "Possibly from 'in' plus Old English 'goten', poured. National gold reserves are stored as standardised ingots, or bars." },
  { word: "JETTY", def: "A structure projecting into water.", fact: "From French 'jetée', thrown out. A jetty is literally 'thrown out' from shore to break waves or moor boats." },
  { word: "KIOSK", def: "A small open booth.", fact: "From Turkish 'köşk', a garden pavilion, via Persian. The meaning shrank from grand pavilion to humble newsstand." },
  { word: "MOTIF", def: "A recurring theme or element.", fact: "From French, related to 'motive'. In music a motif is a short idea — like the four notes opening Beethoven's Fifth." },
  { word: "NOMAD", def: "A wanderer with no fixed home.", fact: "From Greek 'nomas', roaming for pasture. An estimated 30 to 40 million people still live nomadically today." },
  { word: "OASIS", def: "A fertile spot in a desert.", fact: "From an Egyptian word via Greek. Oases form where underground water reaches the surface. The plural is 'oases'." },
  { word: "PRUDE", def: "One who is excessively proper.", fact: "From French 'prudefemme', a good and honourable woman — the meaning soured into prim disapproval." },
  { word: "QUOTA", def: "A fixed share or limit.", fact: "From Latin 'quota pars', 'how great a part'. Import quotas and hiring quotas both cap a number." },
  { word: "RUGBY", def: "A team sport with an oval ball.", fact: "Named after Rugby School in England, where legend says a pupil first picked up the ball and ran in 1823." },
  { word: "SHEEN", def: "A soft lustre.", fact: "From Old English 'sciene', beautiful — related to 'shine'. Paint finishes are graded by sheen, from matte to gloss." },
  { word: "TONIC", def: "Something invigorating; or a musical keynote.", fact: "From Greek 'tonikos', of tone. Tonic water's quinine once fought malaria — hence the gin and tonic." },
  { word: "UNDUE", def: "Excessive or unwarranted.", fact: "'Undue influence' is a legal term for improper pressure. Here 'due' means proper or owed." },
  { word: "VOGUE", def: "The prevailing fashion.", fact: "From French, where it first meant 'rowing'. What's in vogue is 'sailing along' on the current trend; the magazine launched in 1892." },
  { word: "WINCE", def: "To flinch in pain.", fact: "From Old French 'guenchir', to dodge. A wince is the body dodging a hurt before the mind catches up." },
  { word: "XENON", def: "A heavy, unreactive noble gas.", fact: "From Greek 'xenos', stranger — fitting for a rare, aloof element. Xenon lights up car headlamps and powers ion thrusters." },
  { word: "YODEL", def: "To sing with rapid pitch leaps.", fact: "An Alpine herding call designed to carry across valleys, from the German 'jodeln'." },
  { word: "ZIPPY", def: "Bright, lively and fast.", fact: "An American coinage from 'zip', itself an imitation of a quick rushing sound." },
  { word: "AROMA", def: "A pleasant smell.", fact: "From the Greek word for spice. Humans can distinguish on the order of a trillion smells — far more than once believed." },
  { word: "BAYOU", def: "A marshy, slow-moving waterway.", fact: "From the Choctaw 'bayuk', by way of Louisiana French. Bayous are emblematic of the Mississippi Delta." },
  { word: "CEDAR", def: "An evergreen coniferous tree.", fact: "Cedar wood resists rot and insects, prizing it for chests and pencils. A cedar stands at the centre of Lebanon's flag." },
  { word: "DOGMA", def: "A principle laid down as unquestionably true.", fact: "From Greek 'dogma', opinion or decree. To be 'dogmatic' is to assert beliefs as beyond doubt." },
  { word: "EMBED", def: "To fix firmly within something.", fact: "War reporters 'embedded' with troops share their movements. The past tense doubles the 'd' to 'embedded'." },
  { word: "FABLE", def: "A short tale with a moral.", fact: "Aesop's fables, told around 600 BC, still teach today — the tortoise and the hare, the boy who cried wolf." },
  { word: "GECKO", def: "A small climbing lizard.", fact: "Geckos scale glass using microscopic hairs on their toes, an effect that inspires real adhesives. The name imitates their chirp." },
  { word: "HALVE", def: "To divide into two equal parts.", fact: "The 'l' is silent, as in 'half' and 'calf'. To 'go halves' is to split a cost down the middle." },
  { word: "INLAY", def: "A decorative inset of material.", fact: "Furniture and instruments use inlaid wood, shell or metal. Mother-of-pearl inlay shimmers along guitar fretboards." },
  { word: "JOLLY", def: "Happy and cheerful.", fact: "Possibly from Old French 'jolif', festive. The origin of the pirate 'Jolly Roger' flag is still debated." },
  { word: "KNAVE", def: "A dishonest man; or the jack in cards.", fact: "From Old English 'cnafa', a boy or servant. The card 'knave' was renamed 'jack' to avoid confusion with the king." },
  { word: "LUNAR", def: "Relating to the moon.", fact: "A lunar month runs about 29.5 days. 'Lunatic' reflects an old belief that the moon could unsettle the mind." },
  { word: "MEDAL", def: "A metal disc given for achievement.", fact: "From Latin 'metallum'. An Olympic 'gold' is mostly silver, with roughly six grams of gold plating." },
  { word: "NOOSE", def: "A loop with a running knot.", fact: "From Old Occitan 'nous', a knot, from Latin 'nodus'. A slip knot tightens the more it is pulled." },
  { word: "OFFAL", def: "The edible internal organs of an animal.", fact: "Literally 'off-fall' — what falls away in butchering. Haggis and pâté are celebrated offal dishes." },
  { word: "PIVOT", def: "A point on which something turns.", fact: "From French. In basketball a player may pivot on one foot; in business a startup 'pivots' to a new strategy." },
  { word: "QUIRE", def: "Twenty-four or twenty-five sheets of paper.", fact: "A twentieth of a ream. From Latin 'quaterni', sets of four, since early quires were folded in fours." },
  { word: "RANCH", def: "A large livestock farm.", fact: "From Spanish 'rancho', a group who eat together. The cattle ranches of the American West shaped its mythology." },
  { word: "SUEDE", def: "Leather with a soft, napped finish.", fact: "From the French for 'gloves of Sweden', where the style came from. Suede is the fuzzy underside of the hide." },
  { word: "TRACT", def: "An expanse of land; or a short pamphlet.", fact: "From Latin 'tractus', a stretch. The digestive 'tract' and a 'tract of land' both describe an extent." },
  { word: "VIXEN", def: "A female fox; or a fierce woman.", fact: "From Old English 'fyxen'. It preserves a rare feminine '-en' ending, turning 'fox' into 'vixen'." },
  { word: "WALTZ", def: "A ballroom dance in triple time.", fact: "From German 'walzen', to roll or revolve. When it arrived around 1800, its close hold scandalised polite society." },
  { word: "XYLEM", def: "Water-conducting tissue in plants.", fact: "From Greek 'xylon', wood. Xylem carries water up from the roots while its partner, phloem, carries sugars down." },
  { word: "YEARN", def: "To long for something intensely.", fact: "From Old English 'giernan', to desire. It is distantly related to the Greek 'chairein', to rejoice." },
  { word: "BRAVO", def: "A shout of approval.", fact: "Italian for 'skilful'. In opera 'bravo' praises a man, 'brava' a woman and 'bravi' a group — though English uses 'bravo' for all." },
  { word: "CIVIC", def: "Relating to a city or its citizens.", fact: "From Latin 'civis', citizen — the root of 'city', 'civil' and 'citizen'. The word itself is a palindrome." },
  { word: "DECOY", def: "Something used to lure or mislead.", fact: "From Dutch 'de kooi', the cage — originally a pond trap for wildfowl. Hunters still carve wooden decoy ducks." },
  { word: "ETHOS", def: "The characteristic spirit of a culture.", fact: "Greek for 'character'. Aristotle named ethos, pathos and logos as the three pillars of persuasion." },
  { word: "FAUNA", def: "The animal life of a region.", fact: "Named for a Roman goddess, sister of Faunus. It pairs with 'flora', the plant life." },
  { word: "GAVEL", def: "A small mallet used to call order.", fact: "Its exact origin is uncertain. A judge bangs a gavel for order; an auctioneer bangs one to seal a sale." },
  { word: "PARRY", def: "To deflect or ward off a blow.", fact: "A fencing term from French 'parez', ward off. To 'parry a question' is to dodge it gracefully." },
  { word: "OMEGA", def: "The last letter of the Greek alphabet.", fact: "'I am the Alpha and the Omega' means the beginning and the end. 'Omega' also marks the last of any set." },
  { word: "QUART", def: "A quarter of a gallon.", fact: "Literally 'a fourth', from Latin 'quartus'. A US quart and an imperial quart differ by about a fifth." },
];

// Full Wordle-style valid-guess list (~14.8k 5-letter words).
// Source data lives in validWords.txt (github.com/tabatkins/wordle-list).
const VALID_WORDS = new Set(validWordsRaw.trim().toLowerCase().split(/\s+/))

function getDailyWord(dateStr) {
  const seedDate = dateStr ?? new Date().toLocaleDateString('en-CA')
  const seed = parseInt(seedDate.replace(/-/g, ''))
  return WORDS[seed % WORDS.length]
}

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const ROWS = 6, COLS = 5;
const KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const ST = { empty:'empty', correct:'correct', present:'present', absent:'absent' };
const CLR = { empty:'#1C1A16', active:'#2C2418', correct:'#538d4e', present:'#b59f3b', absent:'#161412' };

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
  useSeo(PAGE_SEO.words)
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)
  const daily = useMemo(() => getDailyWord(puzzleDate), [puzzleDate])
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
  const [hc, setHc] = useState(() => {
    try { return localStorage.getItem('streakle-hc') === '1' } catch { return false }
  });
  const palette = hc ? { ...CLR, correct: '#f5793a', present: '#85c0f9' } : CLR;
  const toggleHc = () => setHc(v => {
    const n = !v;
    try { localStorage.setItem('streakle-hc', n ? '1' : '0') } catch { /* storage unavailable */ }
    return n;
  });
  const revealingRef = useRef(false);

  const showMsg = (msg, dur=1800) => { setMessage(msg); setTimeout(()=>setMessage(null), dur); };

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*600,
      color:['#538d4e','#b59f3b','#C9A84C','#C9A84C','#fff'][i%5], size:5+Math.random()*8
    }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const submitGuess = useCallback(() => {
    if (revealingRef.current) return;
    if (input.length!==COLS) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not enough letters'); return;
    }
    if (!VALID_WORDS.has(input.toLowerCase()) && !WORDS.some(w=>w.word===input)) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not a valid word!'); return;
    }
    const result = evaluate(input, daily.word);
    revealingRef.current = true;
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
      setKeyStates(prev=>{
        const next={...prev};
        submittedInput.split('').forEach((ch,i)=>{
          const p=next[ch];
          if (result[i]===ST.correct) next[ch]=ST.correct;
          else if (result[i]===ST.present&&p!==ST.correct) next[ch]=ST.present;
          else if (!p) next[ch]=ST.absent;
        });
        return next;
      });
      revealingRef.current = false;
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
  }, [input, current, daily.word]);

  const handleKey = useCallback((key) => {
    if (gameOver || revealingRef.current) return;
    if (key==='ENTER') { submitGuess(); return; }
    if (key==='⌫'||key==='BACKSPACE') { setInput(i=>i.slice(0,-1)); return; }
    if (/^[A-Z]$/.test(key)&&input.length<COLS) setInput(i=>i+key);
  }, [gameOver, input, submitGuess]);

  useEffect(()=>{
    const handler=(e)=>handleKey(e.key.toUpperCase());
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, [handleKey]);

  useEffect(() => {
    if (!puzzleDate) return
    setGuesses(Array(ROWS).fill(''))
    setCurrent(0)
    setInput('')
    setTileStates({})
    setKeyStates({})
    setShakeRow(null)
    setBounceRow(null)
    setGameOver(false)
    setWon(false)
    setMessage(null)
    setConfetti([])
    setCopied(false)
    setShowFact(false)
    setRevealingTiles({})
    revealingRef.current = false
  }, [puzzleDate])

  const getLetter=(r,c)=>{
    if (guesses[r]) return guesses[r][c]||'';
    if (r===current) return input[c]||'';
    return '';
  };

  const getTileColor=(r,c)=>{
    const st=tileStates[`${r}-${c}`];
    return st?palette[st]:palette.empty;
  };

  const buildShare=()=>{
    const emoji=hc?{[ST.correct]:'🟧',[ST.present]:'🟦',[ST.absent]:'⬛'}:{[ST.correct]:'🟩',[ST.present]:'🟨',[ST.absent]:'⬛'};
    const rows=guesses.slice(0,won?current+1:ROWS).filter(g=>g)
      .map((_,i)=>Array.from({length:COLS},(__,j)=>emoji[tileStates[`${i}-${j}`]]||'⬛').join(''));
    const result=won?`${current+1}/${ROWS}`:'X/6';
    return `WORDS by Streakle 🔥 — ${formatDate(puzzleDate)}\n${result}\n${rows.join('\n')}\n\nPlay at: playstreakle.com/words`;
  };

  const handleShare=async()=>{
    const text=buildShare();
    try {
      if (navigator.share) await navigator.share({text});
      else {await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    } catch {await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };

  return (
    <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:0,paddingBottom:32,color:'#F5F0E8',position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <UserMenu />
      <div style={{width:'100%',display:'flex',alignItems:'center',padding:'12px 16px 0',minHeight:44}}>
        <a href="/" style={{color:'#C9A84C',textDecoration:'none',fontSize:13,fontWeight:600}}>← Back</a>
      </div>

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <h1 style={{fontSize:32,fontWeight:900,letterSpacing:2,color:'#fff',margin:0}}>WORDS</h1>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#C9A84C',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px'}}>
          📅 Archive
        </button>
      </div>

      <div style={{fontSize:13,color:'#7A6E5F',marginBottom:10,marginTop:6}}>{formatDate(puzzleDate)}</div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {showHow&&(
        <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:10,padding:16,maxWidth:320,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#C9A84C'}}>How to play</b><br/>
          Guess the 5-letter word in 6 tries.<br/><br/>
          {hc?'🟧':'🟩'} Right letter, right spot<br/>
          {hc?'🟦':'🟨'} Right letter, wrong spot<br/>
          ⬛ Letter not in the word<br/><br/>
          After the game, discover something fascinating about the word!
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #2C2820',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <span>High contrast colours</span>
            <button onClick={toggleHc} role="switch" aria-checked={hc} aria-label="High contrast colours" style={{
              background:hc?'#f5793a':'#2C2820',border:'none',borderRadius:11,width:44,height:22,
              cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0,
            }}>
              <span style={{
                position:'absolute',top:2,left:hc?24:2,width:18,height:18,borderRadius:'50%',
                background:'#fff',transition:'left 0.2s',
              }}/>
            </button>
          </div>
        </div>
      )}

      {message&&(
        <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',background:'#F5F0E8',borderRadius:8,padding:'8px 20px',fontSize:14,fontWeight:700,color:'#0F0E0C',zIndex:50,animation:'slideUp 0.2s ease',whiteSpace:'nowrap'}}>
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
                        border:`2px solid ${letter?'#C9A84C':'#2C2820'}`,
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
        <div style={{background:'#1C1A16',border:`1px solid ${won?'#538d4e':'#2C2820'}`,borderRadius:12,padding:'16px 20px',maxWidth:340,width:'90%',marginBottom:16,animation:'slideUp 0.5s ease'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:won?'#4caf50':'#C9A84C',textTransform:'uppercase',marginBottom:6}}>
            {won?"✅ Today's word":"❌ Today's word was"}
          </div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:3,color:'#fff',marginBottom:4}}>{daily.word}</div>
          <div style={{fontSize:13,color:'#C9A84C',fontStyle:'italic',marginBottom:10}}>{daily.def}</div>
          <div style={{fontSize:13,color:'#aaa',lineHeight:1.65}}>{daily.fact}</div>
        </div>
      )}

      {gameOver&&(
        <div style={{position:'relative',display:'inline-block',marginBottom:20}}>
          <button onClick={handleShare} style={{background:'#C9A84C',color:'#0F0E0C',border:'none',borderRadius:8,padding:'10px 28px',fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.2s'}}
            onMouseOver={e=>e.currentTarget.style.background='#D4B45A'}
            onMouseOut={e=>e.currentTarget.style.background='#C9A84C'}>
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
                    background:st===ST.correct?palette.correct:st===ST.present?palette.present:st===ST.absent?palette.absent:'#4A433A',
                    border:'none',borderRadius:6,
                    color:st===ST.absent?'#5A5248':'#fff',
                    fontSize:wide?11:14,fontWeight:700,
                    cursor:'pointer',userSelect:'none',
                    transition:'background 0.3s, color 0.3s',padding:'0 4px',
                  }}>{key}</button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:32,fontSize:12,color:'#5A5040',textAlign:'center'}}>
        <a href="/privacy" style={{color:'#5A5040',textDecoration:'none'}}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="words"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </main>
  );
}