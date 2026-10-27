// The board shared by Anchor Chain (phrases: "ICE" + "CREAM") and Anchor Links (words: "HAP" + "PEN"),
// and the plain logic around it (no page code), so the pre-deploy check (scripts/check-puzzles.ts)
// runs exactly what players get. Each game's pair list and examples live in its own folder
// (puzzles.ts); everything else the two share is in this folder, including the puzzle maker.
//
// A puzzle is 15 tiles stacked 1-2-4-8. Positions are numbered top to bottom, left to right
// (heap order): 0 is the top, and the two tiles under position p are 2p+1 (left) and 2p+2 (right).
// Every line joins an upper tile and a lower tile, read top to bottom ("ICE CREAM", "HAPPEN").
//
// Each day's puzzle is grown from the game's pair list, seeded by the date, and kept only if its 15
// tiles fit together exactly one way. Swapping two tiles under the same parent (along with
// everything under them) reads the same lines, so that counts as the same answer.

import { dailyRandom, seededRandom } from "../daily.ts"; // with .ts, so the pre-deploy check can run it in plain Node

export const WORDS = 15;
/**
 * Longest tile allowed. Bottom-row tiles are only ~41px wide on a 390px phone: 5 letters fill one at
 * full size, and longer ones shrink to fit, so 6 is the most that stays readable.
 */
export const MAX_WORD_LENGTH = 6;
/** Rows below the top tile */
const DEPTH = 3;

export interface AnchorPuzzle {
  /** The answer: all 15 tiles in their positions, uppercase */
  words: string[];
}

/** One picture example in "How to play": a tile and the one or two under it */
export interface HelpExample {
  ok: boolean;
  caption: string;
  top: string;
  /** Tiles under `top`, each with whether its line is right */
  below: { word: string; ok: boolean }[];
}

/** Everything that makes one game different from the other */
export interface AnchorSet {
  /**
   * Every pair that makes a line, as text (the game's .txt file): one pair per line, upper tile
   * first, then a space, then the lower tile ("ICE CREAM", "CAR BON").
   */
  pairs: string;
  /** Between the upper and lower tile when a line is read: " " for a phrase, "" for one word */
  join: string;
  /** What a tile is ("word", "piece") and what a right line makes ("phrase", "word") */
  tile: string;
  makes: string;
  /** The picture examples in "How to play" */
  examples: HelpExample[];
}

/** Day 0 for the order the top tiles take turns in */
const FIRST_DAY = Date.UTC(2026, 0, 1);
/** Tries at the day's own top tile before trying others */
const ATTEMPTS_PER_ROOT = 40;
/** Steps allowed growing one tree before starting it again */
const GROW_BUDGET = 3000;
/** Most single-letter tiles ("A", "Y") on one board */
export const MAX_SINGLE_LETTERS = 2;

export const parentOf = (p: number) => (p - 1) >> 1;
const rowOf = (p: number) => Math.floor(Math.log2(p + 1));

/** A line as it reads, top to bottom. */
export const lineText = (set: AnchorSet, upper: string, lower: string) => `${upper}${set.join}${lower}`;

// ---------- The pair list ----------

interface PairGraph {
  /** Upper tile -> its lower tiles */
  lowers: Map<string, string[]>;
  /** Every line on the list, as it reads (what the uniqueness check goes by) */
  lines: Set<string>;
  /** Tiles that can top a tree that's `n` rows deep, ignoring repeats: canGrow[n] */
  canGrow: Set<string>[];
  /** Top tiles that can start a full puzzle, sorted */
  roots: string[];
}

/** The pair list's lines as [upper, lower], skipping blank lines (handles Windows line endings too). */
export const pairList = (set: AnchorSet) =>
  set.pairs
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((words) => words[0]) as [string, string][];

const graphs = new WeakMap<AnchorSet, PairGraph>();

export function pairGraph(set: AnchorSet): PairGraph {
  let graph = graphs.get(set);
  if (graph) return graph;
  const lowers = new Map<string, string[]>();
  const lines = new Set<string>();
  for (const [upper, lower] of pairList(set)) {
    if (!lowers.has(upper)) lowers.set(upper, []);
    lowers.get(upper)!.push(lower);
    lines.add(lineText(set, upper, lower));
  }
  // A leaf can be anything; a tile can top n rows if at least two of its lowers can top n - 1
  const tiles = new Set([...lowers.keys(), ...[...lowers.values()].flat()]);
  const canGrow = [tiles];
  for (let n = 1; n <= DEPTH; n++) {
    canGrow.push(new Set([...lowers.keys()].filter((t) => lowers.get(t)!.filter((l) => canGrow[n - 1].has(l)).length >= 2)));
  }
  graph = { lowers, lines, canGrow, roots: [...canGrow[DEPTH]].sort() };
  graphs.set(set, graph);
  return graph;
}

// ---------- Lines ----------

/** Every line that counts as right: the answer's 14. */
export function acceptedLines(set: AnchorSet, puzzle: AnchorPuzzle) {
  const lines = new Set<string>();
  for (let child = 1; child < WORDS; child++) lines.add(lineText(set, puzzle.words[parentOf(child)], puzzle.words[child]));
  return lines;
}

/** How many lines of a layout are right. */
export function rightLines(set: AnchorSet, words: string[], lines: Set<string>) {
  let right = 0;
  for (let child = 1; child < WORDS; child++) if (lines.has(lineText(set, words[parentOf(child)], words[child]))) right++;
  return right;
}

/** True if two layouts read the same 14 lines (the same answer, maybe with sides swapped). */
export function sameAnswer(set: AnchorSet, a: string[], b: string[]) {
  const lines = acceptedLines(set, { words: a });
  return rightLines(set, b, lines) === WORDS - 1;
}

// ---------- Solving ----------

/**
 * Every way (up to `limit`) the tiles fit together with every line on the pair list. Sides are
 * fixed by keeping each pair under a parent in the order the tiles were given, so swapped copies of
 * the same answer aren't counted twice.
 */
export function findAnswers(set: AnchorSet, tiles: string[], limit = 2): string[][] {
  const { lines } = pairGraph(set);
  const n = tiles.length;
  // below[i] = tiles that can go under tile i
  const below = tiles.map((upper) => tiles.flatMap((lower, j) => (lines.has(lineText(set, upper, lower)) ? [j] : [])));
  // tall[d][i] = tile i can top d rows using these tiles (repeats ignored), for pruning
  const tall: boolean[][] = [tiles.map(() => true)];
  for (let d = 1; d <= DEPTH; d++) tall.push(below.map((js) => js.filter((j) => tall[d - 1][j]).length >= 2));

  const found: string[][] = [];
  const at: number[] = new Array(WORDS); // tile index in each position
  const used: boolean[] = new Array(n).fill(false);

  function place(p: number) {
    if (found.length >= limit) return;
    if (p === WORDS) {
      found.push(at.map((i) => tiles[i]));
      return;
    }
    const rowsUnder = DEPTH - rowOf(p);
    const options = p === 0 ? tiles.map((_, i) => i) : below[at[parentOf(p)]];
    for (const i of options) {
      if (used[i] || !tall[rowsUnder][i]) continue;
      if (p > 0 && p % 2 === 0 && i < at[p - 1]) continue; // right side must come after the left
      used[i] = true;
      at[p] = i;
      place(p + 1);
      used[i] = false;
    }
  }

  place(0);
  return found;
}

// ---------- Making puzzles ----------

const shuffle = <T>(items: T[], random: () => number) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/**
 * Grows one tree under `root`: fills positions top down, each with an unused lower tile of the tile
 * above it that can still carry the rows left under it, with no more than MAX_SINGLE_LETTERS
 * single letters in all. Null if it runs out of steps.
 */
function growTree(set: AnchorSet, root: string, random: () => number): string[] | null {
  const { lowers, canGrow } = pairGraph(set);
  const words: string[] = [root];
  const used = new Set([root]);
  let singles = root.length === 1 ? 1 : 0;
  let steps = 0;

  function place(p: number): boolean {
    if (p === WORDS) return true;
    if (++steps > GROW_BUDGET) return false;
    const rowsUnder = DEPTH - rowOf(p);
    const options = shuffle(
      (lowers.get(words[parentOf(p)]) ?? []).filter(
        (t) => !used.has(t) && canGrow[rowsUnder].has(t) && (t.length > 1 || singles < MAX_SINGLE_LETTERS)
      ),
      random
    );
    for (const tile of options) {
      const single = tile.length === 1 ? 1 : 0;
      words[p] = tile;
      used.add(tile);
      singles += single;
      if (place(p + 1)) return true;
      used.delete(tile);
      singles -= single;
    }
    return false;
  }

  return place(1) ? words : null;
}

/** A puzzle under `root` whose tiles fit together only one way, or null if none turned up. */
function makePuzzle(set: AnchorSet, root: string, random: () => number, attempts: number): AnchorPuzzle | null {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const words = growTree(set, root, random);
    if (words && findAnswers(set, words, 2).length === 1) return { words };
  }
  return null;
}

/**
 * The top tile for a day number. The top tiles take turns in a shuffled order, so none comes back
 * until they've all had a day; each round is shuffled again, never starting with the last one's end.
 */
export function rootFor(slug: string, set: AnchorSet, day: number) {
  const { roots } = pairGraph(set);
  const n = roots.length;
  // With one or two there's nothing to shuffle (and swapping below would undo itself): just take turns
  if (n <= 2) return roots[((day % n) + n) % n];
  const round = (r: number) => {
    const order = shuffle(roots.slice(), seededRandom(`${slug}:tops:${r}`));
    if (n > 1 && order[0] === shuffle(roots.slice(), seededRandom(`${slug}:tops:${r - 1}`))[n - 1]) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    return order;
  };
  const r = Math.floor(day / n);
  return round(r)[day - r * n];
}

export const dayNumber = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / 86400000);
};

/** Makes the puzzle for a "YYYY-MM-DD" date from scratch (players get it through puzzleFor). */
export function generateAnchor(slug: string, set: AnchorSet, dateKey: string): AnchorPuzzle {
  const random = dailyRandom(slug, "default", dateKey);
  const day = dayNumber(dateKey);
  const root = rootFor(slug, set, day);
  // If the day's own top tile won't make a puzzle with one answer, try the others in a seeded order
  // (but not yesterday's or tomorrow's, so the top never repeats two days running)
  const neighbors = [root, rootFor(slug, set, day - 1), rootFor(slug, set, day + 1)];
  const others = shuffle(pairGraph(set).roots.filter((r) => !neighbors.includes(r)), random);
  for (const [i, top] of [root, ...others].entries()) {
    const puzzle = makePuzzle(set, top, random, i === 0 ? ATTEMPTS_PER_ROOT : 10);
    if (puzzle) return puzzle;
  }
  throw new Error(`${slug}: no puzzle with one answer for ${dateKey}`);
}

const made = new Map<string, AnchorPuzzle>();

/** The puzzle for a "YYYY-MM-DD" date (made once, then kept). */
export function puzzleFor(slug: string, set: AnchorSet, dateKey: string): AnchorPuzzle {
  const key = `${slug}:${dateKey}`;
  if (!made.has(key)) {
    for (const old of made.keys()) if (old.startsWith(`${slug}:`)) made.delete(old); // only one day is ever needed
    made.set(key, generateAnchor(slug, set, dateKey));
  }
  return made.get(key)!;
}

/**
 * The day's starting layout: the tiles shuffled (the same way for everyone that day) until at most
 * one line is already right, so nothing is given away.
 */
export function shuffledWords(set: AnchorSet, puzzle: AnchorPuzzle, seed: string): string[] {
  const random = seededRandom(seed);
  const lines = acceptedLines(set, puzzle);
  let words = puzzle.words.slice();
  for (let attempt = 0; attempt < 200; attempt++) {
    words = shuffle(puzzle.words.slice(), random);
    if (rightLines(set, words, lines) <= 1) break;
  }
  return words;
}
