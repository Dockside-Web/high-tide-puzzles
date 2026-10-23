// The board shared by Anchor Chain (phrases: "ICE" + "CREAM") and Anchor Links (words: "HAP" + "PEN"),
// and the plain logic around it (no page code), so the pre-deploy check (scripts/check-puzzles.ts)
// runs exactly what players get. Each game's puzzle list and examples live in its own folder
// (puzzles.ts); everything else the two share is in this folder.
//
// A puzzle is 15 tiles stacked 1-2-4-8. Positions are numbered top to bottom, left to right
// (heap order): 0 is the top, and the two tiles under position p are 2p+1 (left) and 2p+2 (right).
// Every line joins an upper tile and a lower tile, read top to bottom ("ICE CREAM", "HAPPEN").

import { seededRandom } from "../daily.ts"; // with .ts, so the pre-deploy check can run it in plain Node

export const WORDS = 15;
/**
 * Longest tile allowed. Bottom-row tiles are only ~41px wide on a 390px phone: 5 letters fill one at
 * full size, and longer ones shrink to fit, so 6 is the most that stays readable.
 */
export const MAX_WORD_LENGTH = 6;

export interface AnchorPuzzle {
  /** The answer: all 15 tiles in their positions, uppercase */
  words: string[];
  /**
   * Other lines made from these tiles that also count as right, wherever they sit, written as they
   * read ("ICE CREAM", "MANAGE"): real ones the answer doesn't use, so a player who finds one isn't
   * marked wrong.
   */
  alsoAccept?: string[];
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
  puzzles: AnchorPuzzle[];
  /** Between the upper and lower tile when a line is read: " " for a phrase, "" for one word */
  join: string;
  /** What a tile is ("word", "piece") and what a right line makes ("phrase", "word") */
  tile: string;
  makes: string;
  /** The picture examples in "How to play" */
  examples: HelpExample[];
}

/** The first day of the list; each day after uses the next puzzle, wrapping round at the end */
const FIRST_DAY = Date.UTC(2026, 0, 1);

export const parentOf = (p: number) => (p - 1) >> 1;

/** A line as it reads, top to bottom. */
export const lineText = (set: AnchorSet, upper: string, lower: string) => `${upper}${set.join}${lower}`;

/** Every line that counts as right: the answer's 14, plus any extras. */
export function acceptedLines(set: AnchorSet, puzzle: AnchorPuzzle) {
  const lines = new Set(puzzle.alsoAccept ?? []);
  for (let child = 1; child < WORDS; child++) lines.add(lineText(set, puzzle.words[parentOf(child)], puzzle.words[child]));
  return lines;
}

/** How many lines of a layout are right. */
export function rightLines(set: AnchorSet, words: string[], lines: Set<string>) {
  let right = 0;
  for (let child = 1; child < WORDS; child++) if (lines.has(lineText(set, words[parentOf(child)], words[child]))) right++;
  return right;
}

/** The puzzle for a "YYYY-MM-DD" date. */
export function puzzleFor(set: AnchorSet, dateKey: string): AnchorPuzzle {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / 86400000);
  return set.puzzles[((day % set.puzzles.length) + set.puzzles.length) % set.puzzles.length];
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
    words = puzzle.words.slice();
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    if (rightLines(set, words, lines) <= 1) break;
  }
  return words;
}
