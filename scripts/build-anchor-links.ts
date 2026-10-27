// Builds Anchor Links' pair list from the SCOWL word list (the wordlist-english package) and writes it
// over src/puzzles/AnchorLinks/words.txt, one pair per line ("CAR BON"). Only needed when the rules
// below change; the list itself is committed. Run with: npm run build:anchor-links
//
// Every common word is split every way into two pieces at a natural break: "PO" + "ST", "IR" +
// "RITABLE", "ASH" + "AMED". Pieces are mostly just chunks of a word, with some real words among them.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const OUT = new URL("../src/puzzles/AnchorLinks/words.txt", import.meta.url);

/** SCOWL levels puzzles are built from: words most people know (40 brings in GALOSH, SERVIETTE) */
const LEVELS = [10, 20, 35];
/** Pieces are 1-6 letters ("A" + "BOUT", "ASH" + "Y"); 6 is the most a tile shows readably. The board limits single letters (see anchor.ts). */
const UPPER = { min: 1, max: 6 };
const LOWER = { min: 1, max: 6 };
/** An upper piece has to start at least this many words (it needs two under it) */
const MIN_STARTS = 2;

/** Offensive or grim anywhere in a word */
const BAD_INSIDE =
  /SEX|FUCK|SHIT|CUNT|NIGG|PORN|SLUT|WHORE|DILDO|ORGASM|NAZI|BITCH|BASTARD|PENIS|VAGIN|SPERM|TESTIC|NIPPLE|MURDER|SUICID|RAPIST|KINKY|FAGG|FAGOT|MIDGET|REDSKIN|WETBACK|RETARD|TRANNY|DYKE|KIKE|CHINK|GOOK|NEGRO|GYPS|ESKIMO|SQUAW|HONKY|SPAZ|EJACUL|MENSTRU|GENITAL|INCEST|SEDUC|EROTIC|ABORT|MASSACR|NARCOT|LAXAT|DIARRH|COCAIN|CLITOR|PUBERT|FETISH|PERVERT|SLAVE/;
/** Offensive or grim as a whole word or piece only (inside other words they're fine: SHELL, SKILL, GRAPE) */
const BAD_WHOLE = new Set(
  (
    "ASS TIT TITS CUM ANUS ANAL HOMO KKK GAY HO HOE HOES JAP GOD SIN DIE DIES DEAD GUN GUNS NUDE BUTT ARSE HELL POO PEE BRA SEX SEXY RAPE RAPES RAPED KILL KILLS KILLED KILLER DAMN CRAP BOOB BOOBS COCK DICK DRUG DRUGS ERECT FART PISS RECTAL RECTUM " +
    "SEMEN URINE URINATE URINAL UTERUS UTERI HEROIN BOWEL BOWELS BUTTOCK BUTTOCKS CONDOM CORPSE ENEMA FECES ERECTION " +
    "HARLOT HORNY LESBIAN MISTRESS MORON MORONIC NAKED NUDITY OPIUM PUKE STRIPPER TORTURE VOMIT IMBECILE IDIOT IDIOTIC " +
    "STUPID STUPIDITY BOOZE BOSOM DRUNKARD DRUNKEN DAMNATION BEHEAD GORE BLOODY GENOCIDE SATANIC").split(" ")
);
/** Plain grammar endings: BUILD + ING is too easy to count as a find */
const ENDINGS = new Set("ED ING INGS LY NESS LESS MENT MENTS".split(" "));

const words = new Set<string>();
for (const level of LEVELS) {
  for (const variant of ["english", "american"]) {
    const list: string[] = require(`wordlist-english/${variant}-words-${level}.json`);
    for (const w of list) if (/^[a-z]+$/.test(w)) words.add(w.toUpperCase()); // no names, no apostrophes
  }
}
const has = (w: string) => words.has(w);
const bad = (w: string) => BAD_INSIDE.test(w) || BAD_WHOLE.has(w);

/** True for a plural, past tense, -ing form, -ly adverb or comparative of another word on the list */
function isInflected(w: string) {
  const cut = (n: number) => w.slice(0, -n);
  const doubled = (stem: string) => stem.at(-1) === stem.at(-2) && has(stem.slice(0, -1));
  if (w.endsWith("S") && (has(cut(1)) || (w.endsWith("ES") && has(cut(2))) || (w.endsWith("IES") && has(cut(3) + "Y")))) return true;
  if (w.endsWith("ED") && (has(cut(2)) || has(cut(1)) || (w.endsWith("IED") && has(cut(3) + "Y")) || doubled(cut(2)))) return true;
  if (w.endsWith("ING") && (has(cut(3)) || has(cut(3) + "E") || doubled(cut(3)))) return true;
  if (w.endsWith("LY") && (has(cut(2)) || (w.endsWith("ILY") && has(cut(3) + "Y")) || has(cut(1) + "E"))) return true;
  if (w.endsWith("IER") && has(cut(3) + "Y")) return true;
  if (w.endsWith("IEST") && has(cut(4) + "Y")) return true;
  if (w.endsWith("EST") && (has(cut(3)) || has(cut(2)) || doubled(cut(3)))) return true;
  if (w.endsWith("ER") && has(cut(2)) && has(cut(2) + "EST")) return true;
  return false;
}

// Consonant runs that start and end real words ("STR", "NK"), so pieces can be held to them: a lower
// piece has to start like a word (not "TCHUP"), an upper one has to end like one (not "NEUTR")
const leading = (w: string) => w.match(/^[^AEIOU]*/)![0];
const trailing = (w: string) => w.match(/[^AEIOU]*$/)![0];
const runs = (take: (w: string) => string) => {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(take(w), (counts.get(take(w)) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n >= 5).map(([run]) => run));
};
const STARTS = runs(leading);
const ENDS = runs(trailing);

/** Upper pieces can be all consonants, like a word's start ("ST"); longer lower ones need a vowel */
const okUpper = (p: string) => p.length >= UPPER.min && p.length <= UPPER.max && ENDS.has(trailing(p)) && !bad(p);
const okLower = (p: string) =>
  p.length >= LOWER.min && p.length <= LOWER.max && (p.length === 1 || (/[AEIOUY]/.test(p) && STARTS.has(leading(p)))) && !bad(p) && !ENDINGS.has(p);

// Every natural split of every base word: the cut doesn't fall between two vowels or inside CH, SH, TH...
const splits: [string, string][] = [];
for (const w of words) {
  if (bad(w) || isInflected(w)) continue;
  for (let i = UPPER.min; i <= w.length - LOWER.min; i++) {
    const [a, b] = [w.slice(0, i), w.slice(i)];
    if (a === b) continue; // PAPA, DODO: a tile can't go under itself
    if (!okUpper(a) || !okLower(b)) continue;
    if (/[AEIOU]/.test(w[i - 1]) && /[AEIOU]/.test(w[i])) continue;
    if (/^(CH|SH|TH|PH|WH|CK|NG|GH|QU)$/.test(w[i - 1] + w[i])) continue;
    splits.push([a, b]);
  }
}

// A piece can go on top only if it starts enough words; any piece can go underneath
const starts = new Map<string, number>();
for (const [a] of splits) starts.set(a, (starts.get(a) ?? 0) + 1);
const uppers = new Set([...starts].filter(([, n]) => n >= MIN_STARTS).map(([p]) => p));

const pairs = new Map<string, Set<string>>();
for (const [a, b] of splits) {
  if (!uppers.has(a)) continue;
  if (!pairs.has(a)) pairs.set(a, new Set());
  pairs.get(a)!.add(b);
}

const lines = [...pairs].flatMap(([upper, lows]) => [...lows].map((lower) => `${upper} ${lower}`)).sort();
writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Wrote ${lines.length} pairs (${pairs.size} upper pieces) from ${words.size} words to AnchorLinks/words.txt.`);
