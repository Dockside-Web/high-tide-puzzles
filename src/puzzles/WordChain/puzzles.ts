// Word Chain's puzzles and the plain logic around them (no page code), so the pre-deploy check
// (scripts/check-puzzles.ts) runs exactly what players get.
//
// A puzzle is 15 words in a 1-2-4-8 pyramid. Positions are numbered top to bottom, left to right
// (heap order): 0 is the top, and the two words under position p are 2p+1 (left) and 2p+2 (right).
// Every line joins an upper word and a lower word into a phrase read top to bottom ("HOT DOG").
//
// TODO: PUZZLES only holds placeholder words for now. Swap in the real word bank here (or load a
// schedule file); nothing else needs to change. Each day uses the next puzzle in the list.

import { seededRandom } from "../daily.ts"; // with .ts, so the pre-deploy check can run it in plain Node

export const WORDS = 15;
/**
 * Longest word allowed. Bottom-row tiles are only ~41px wide on a 390px phone: 5 letters fill one at
 * full size, and longer words shrink to fit, so 6 is the most that stays readable.
 */
export const MAX_WORD_LENGTH = 6;

export interface WordChainPuzzle {
  /** The answer: all 15 words in their positions, uppercase */
  words: string[];
  /**
   * Other "upper lower" phrases made from these words that also count as right, wherever they
   * sit (real phrases the answer doesn't use, so a player who finds one isn't marked wrong).
   */
  alsoAccept?: string[];
}

export const PUZZLES: WordChainPuzzle[] = [
  {
    words: [
      "HOT",
      "DOG", "WATER",
      "HOUSE", "FOOD", "FALL", "PARK",
      "PARTY", "CAT", "TRUCK", "COURT", "GUY", "OUT", "BENCH", "PLACE",
    ],
  },
];

/** The first day of the list; each day after uses the next puzzle, wrapping round at the end */
const FIRST_DAY = Date.UTC(2026, 0, 1);

export const parentOf = (p: number) => (p - 1) >> 1;

/** Every phrase that counts as right: the answer's 14 lines, plus any extras. */
export function acceptedPhrases(puzzle: WordChainPuzzle) {
  const phrases = new Set(puzzle.alsoAccept ?? []);
  for (let child = 1; child < WORDS; child++) phrases.add(`${puzzle.words[parentOf(child)]} ${puzzle.words[child]}`);
  return phrases;
}

/** How many lines of a layout make an accepted phrase. */
export function rightLines(words: string[], phrases: Set<string>) {
  let right = 0;
  for (let child = 1; child < WORDS; child++) if (phrases.has(`${words[parentOf(child)]} ${words[child]}`)) right++;
  return right;
}

/** The puzzle for a "YYYY-MM-DD" date. */
export function puzzleFor(dateKey: string): WordChainPuzzle {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / 86400000);
  return PUZZLES[((day % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
}

/**
 * The day's starting layout: the words shuffled (the same way for everyone that day) until at most
 * one line already makes a phrase, so nothing is given away.
 */
export function shuffledWords(puzzle: WordChainPuzzle, seed: string): string[] {
  const random = seededRandom(seed);
  const phrases = acceptedPhrases(puzzle);
  let words = puzzle.words.slice();
  for (let attempt = 0; attempt < 200; attempt++) {
    words = puzzle.words.slice();
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    if (rightLines(words, phrases) <= 1) break;
  }
  return words;
}
