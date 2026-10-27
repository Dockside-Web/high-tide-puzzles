// Makes every daily puzzle from a month ago to a few years out and checks each one has exactly one
// solution. Runs before every deploy (npm run deploy) so a broken generator never goes live.
// Run on its own with: npm run check:puzzles

import { dailyRandom, localDateKey } from "../src/puzzles/daily.ts";
import {
  COLS,
  ROWS,
  colorsAreConnected,
  findSolutions,
  generateSeaGlass,
  type SeaGlassDifficulty,
} from "../src/puzzles/SeaGlass/generate.ts";
import {
  SIZE as BUOY_SIZE,
  countClues,
  findSolutions as findBuoySolutions,
  generateBuoy,
  type BuoyDifficulty,
} from "../src/puzzles/Buoy/generate.ts";
import {
  crossings,
  findPairs,
  findSolutions as findBridgesSolutions,
  generateBridges,
  isConnected,
  solveByLogic,
  type BridgesDifficulty,
} from "../src/puzzles/Bridges/generate.ts";

import {
  MAX_SINGLE_LETTERS,
  MAX_WORD_LENGTH,
  WORDS as ANCHOR_WORDS,
  acceptedLines,
  dayNumber,
  findAnswers,
  generateAnchor,
  lineText,
  pairGraph,
  pairList,
  rightLines,
  rootFor,
  sameAnswer,
  shuffledWords,
  type AnchorSet,
} from "../src/puzzles/Anchor/anchor.ts";
import { ANCHOR_SETS } from "../src/puzzles/Anchor/sets.ts";

const DAYS_BACK = 30;
const DAYS_AHEAD = 365 * 3;
const SEA_GLASS_DIFFICULTIES: SeaGlassDifficulty[] = ["easy", "hard"];
const BUOY_DIFFICULTIES: BuoyDifficulty[] = ["easy", "hard"];
const BRIDGES_DIFFICULTIES: BridgesDifficulty[] = ["easy", "hard"];
const BRIDGES_SIZES: Record<BridgesDifficulty, number> = { easy: 7, hard: 9 };

const failures: string[] = [];
const today = new Date();
let slowestMs = 0;

function checkSeaGlass(difficulty: SeaGlassDifficulty, dateKey: string, checkRepeat: boolean) {
  const blackInside = difficulty === "hard";
  const startedDay = performance.now();
  const puzzle = generateSeaGlass(dailyRandom("sea-glass", difficulty, dateKey), difficulty);
  slowestMs = Math.max(slowestMs, performance.now() - startedDay);
  const solutions = findSolutions(puzzle.bank, 2, blackInside);

  if (puzzle.bank.length !== ROWS * COLS) return "wrong number of tiles";
  if (new Set(puzzle.bank).size !== puzzle.bank.length) return "has duplicate tiles";
  if (solutions.length === 0) return "has no solution";
  if (solutions.length > 1) return "has more than one solution";
  if (solutions[0].join() !== puzzle.solution.join()) return "solves to a different board";
  if (!colorsAreConnected(puzzle.solution, blackInside)) return "has a color missing or split into more than one patch";
  if (!blackInside && findSolutions(puzzle.bank, 2, true).length === 0) return "isn't solvable under Hard's rules either (bug)";
  if (
    checkRepeat &&
    generateSeaGlass(dailyRandom("sea-glass", difficulty, dateKey), difficulty).bank.join() !== puzzle.bank.join()
  ) {
    return "isn't the same every time for this date";
  }
  return null;
}

function checkBuoy(difficulty: BuoyDifficulty, dateKey: string, checkRepeat: boolean) {
  const startedDay = performance.now();
  const puzzle = generateBuoy(dailyRandom("buoy", difficulty, dateKey), difficulty);
  slowestMs = Math.max(slowestMs, performance.now() - startedDay);
  const solutions = findBuoySolutions(puzzle, 2)!; // no step limit: a full search

  if (puzzle.regions.length !== BUOY_SIZE * BUOY_SIZE) return "wrong number of cells";
  if (solutions.length === 0) return "has no solution";
  if (solutions.length > 1) return "has more than one solution";
  if (solutions[0].join() !== puzzle.solution.join()) return "solves to a different board";
  const truth = countClues(puzzle.regions, puzzle.solution);
  const shownMatch = (shown: (number | null)[], real: number[]) => shown.every((n, i) => n === null || n === real[i]);
  if (
    !shownMatch(puzzle.rowCounts, truth.rowCounts) ||
    !shownMatch(puzzle.colCounts, truth.colCounts) ||
    puzzle.regionCounts.join() !== truth.regionCounts.join()
  ) {
    return "clues don't match the solution";
  }
  const hidden = [...puzzle.rowCounts, ...puzzle.colCounts].filter((n) => n === null).length;
  if (difficulty === "easy" ? hidden !== 0 : hidden < 5 || hidden > 7) return `hides ${hidden} numbers`;
  const zeroLines = [...puzzle.rowCounts, ...puzzle.colCounts].filter((n) => n === 0).length;
  const zeroRegions = puzzle.regionCounts.filter((n) => n === 0).length;
  if (zeroLines > 2 || zeroRegions > 3) return `shows too many 0s (${zeroLines} rows/columns, ${zeroRegions} regions)`;
  // Every region is one connected piece of at least 3 cells
  for (let g = 0; g < puzzle.regionCounts.length; g++) {
    const cells = puzzle.regions.flatMap((h, cell) => (h === g ? [cell] : []));
    if (cells.length < 3) return `region ${g} has only ${cells.length} cells`;
    const reached = new Set([cells[0]]);
    const queue = [cells[0]];
    while (queue.length) {
      const cell = queue.pop()!;
      const r = Math.floor(cell / BUOY_SIZE);
      const c = cell % BUOY_SIZE;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const n = nr * BUOY_SIZE + nc;
        if (nr < 0 || nc < 0 || nr >= BUOY_SIZE || nc >= BUOY_SIZE || puzzle.regions[n] !== g || reached.has(n)) continue;
        reached.add(n);
        queue.push(n);
      }
    }
    if (reached.size !== cells.length) return `region ${g} is split into pieces`;
  }
  if (
    checkRepeat &&
    generateBuoy(dailyRandom("buoy", difficulty, dateKey), difficulty).solution.join() !== puzzle.solution.join()
  ) {
    return "isn't the same every time for this date";
  }
  return null;
}

function checkBridges(difficulty: BridgesDifficulty, dateKey: string, checkRepeat: boolean) {
  const startedDay = performance.now();
  const puzzle = generateBridges(dailyRandom("bridges", difficulty, dateKey), difficulty);
  slowestMs = Math.max(slowestMs, performance.now() - startedDay);
  const { size, islands, pairs, solution } = puzzle;
  const solutions = findBridgesSolutions(puzzle, 2)!; // no step limit: a full search

  if (size !== BRIDGES_SIZES[difficulty]) return `is ${size}x${size}`;
  if (islands.some(({ r, c }) => r < 0 || c < 0 || r >= size || c >= size)) return "has an island off the board";
  if (islands.some((a, i) => islands.some((b, j) => i < j && Math.abs(a.r - b.r) + Math.abs(a.c - b.c) <= 1))) {
    return "has islands touching or on top of each other";
  }
  if (JSON.stringify(findPairs(islands)) !== JSON.stringify(pairs)) return "has the wrong list of neighbors";
  if (solution.some((n) => n < 0 || n > 2)) return "has a pair with more than two bridges";
  const totals = islands.map(() => 0);
  pairs.forEach((p, k) => {
    totals[p.a] += solution[k];
    totals[p.b] += solution[k];
  });
  if (islands.some((island, i) => island.target !== totals[i] || island.target === 0)) return "numbers don't match the answer";
  const cross = crossings(islands, pairs);
  if (pairs.some((_, k) => solution[k] && cross[k].some((q) => solution[q]))) return "answer has crossing bridges";
  if (!isConnected(islands.length, pairs, solution)) return "answer doesn't join every island";
  if (solutions.length === 0) return "has no solution";
  if (solutions.length > 1) return "has more than one solution";
  if (solutions[0].join() !== solution.join()) return "solves to a different board";
  const counting = solveByLogic(puzzle, false);
  if (difficulty === "easy" && !counting) return "can't be solved by counting alone";
  if (difficulty === "hard" && (counting || !solveByLogic(puzzle, true))) return "isn't the right kind of hard";
  if (
    checkRepeat &&
    generateBridges(dailyRandom("bridges", difficulty, dateKey), difficulty).solution.join() !== solution.join()
  ) {
    return "isn't the same every time for this date";
  }
  return null;
}

/** Anchor Chain's and Anchor Links' pair lists are edited by hand, so they're checked for typos. */
function checkAnchorPairs(set: AnchorSet) {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const words of pairList(set)) {
    const line = words.join(" ");
    if (words.length !== 2) {
      problems.push(`"${line}" isn't two ${set.tile}s`);
      continue;
    }
    for (const tile of words) {
      if (!/^[A-Z]+$/.test(tile)) problems.push(`"${tile}" (in "${line}") isn't one uppercase ${set.tile}`);
      else if (tile.length > MAX_WORD_LENGTH) problems.push(`"${tile}" (in "${line}") is longer than ${MAX_WORD_LENGTH} letters`);
    }
    if (words[0] === words[1]) problems.push(`"${line}" pairs a ${set.tile} with itself`);
    if (seen.has(line)) problems.push(`"${line}" is in the list twice`);
    seen.add(line);
  }
  if (!pairGraph(set).roots.length) problems.push(`no ${set.tile} can top a full puzzle`);
  return problems;
}

/** Days whose own top tile didn't work, so another one stood in (fine now and then, not every day) */
const anchorStandIns: Record<string, number> = {};
/** A line (word or phrase) back within this many days counts as a repeat; the share of lines that are, by game */
const ANCHOR_REPEAT_DAYS = 30;
const anchorRepeats: Record<string, number> = {};

/**
 * The day's puzzle: 15 different tiles whose lines are all on the pair list and fit together only
 * one way, the same every time for the date, shuffled the same way, and not starting solved.
 */
function checkAnchorDay(slug: string, set: AnchorSet, dateKey: string, checkRepeat: boolean, yesterdayTop?: string) {
  const startedDay = performance.now();
  const puzzle = generateAnchor(slug, set, dateKey);
  slowestMs = Math.max(slowestMs, performance.now() - startedDay);
  const { words } = puzzle;
  const { lines } = pairGraph(set);

  if (words.length !== ANCHOR_WORDS) return `has ${words.length} ${set.tile}s, not ${ANCHOR_WORDS}`;
  if (new Set(words).size !== words.length) return `uses a ${set.tile} twice`;
  const singles = words.filter((w) => w.length === 1).length;
  if (singles > MAX_SINGLE_LETTERS) return `has ${singles} single-letter ${set.tile}s`;
  for (let child = 1; child < ANCHOR_WORDS; child++) {
    const line = lineText(set, words[(child - 1) >> 1], words[child]);
    if (!lines.has(line)) return `"${line}" isn't on the pair list`;
  }
  const answers = findAnswers(set, words, 2);
  if (answers.length === 0) return "has no answer (bug)";
  if (answers.length > 1) return `fits together more than one way (also: ${answers.find((a) => !sameAnswer(set, a, words))!.join(" ")})`;
  if (!sameAnswer(set, answers[0], words)) return "solves to a different answer";
  if (words[0] === yesterdayTop) return `has the same top ${set.tile} as yesterday (${words[0]})`;
  if (words[0] !== rootFor(slug, set, dayNumber(dateKey))) anchorStandIns[slug] = (anchorStandIns[slug] ?? 0) + 1;
  if (checkRepeat && generateAnchor(slug, set, dateKey).words.join() !== words.join()) {
    return "isn't the same every time for this date";
  }

  const seed = `${slug}:${dateKey}`;
  const start = shuffledWords(set, puzzle, seed);
  if ([...start].sort().join() !== [...puzzle.words].sort().join()) return `starts with the wrong ${set.tile}s`;
  if (rightLines(set, start, acceptedLines(set, puzzle)) > 1) return "starts with more than one line already right";
  if (shuffledWords(set, puzzle, seed).join() !== start.join()) return "isn't shuffled the same every time for this date";
  return null;
}

const started = performance.now();
let checked = 0;

for (const difficulty of SEA_GLASS_DIFFICULTIES) {
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
    const dateKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    try {
      // Making a puzzle twice to be sure it comes out the same is slow, so only spot-check that
      const problem = checkSeaGlass(difficulty, dateKey, offset % 10 === 0);
      if (problem) failures.push(`Sea Glass ${difficulty} ${dateKey}: ${problem}`);
    } catch (error) {
      failures.push(`Sea Glass ${difficulty} ${dateKey}: ${(error as Error).message}`);
    }
    checked++;
  }
}

for (const difficulty of BUOY_DIFFICULTIES) {
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
    const dateKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    try {
      const problem = checkBuoy(difficulty, dateKey, offset % 10 === 0);
      if (problem) failures.push(`Buoy ${difficulty} ${dateKey}: ${problem}`);
    } catch (error) {
      failures.push(`Buoy ${difficulty} ${dateKey}: ${(error as Error).message}`);
    }
    checked++;
  }
}

for (const difficulty of BRIDGES_DIFFICULTIES) {
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
    const dateKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    try {
      const problem = checkBridges(difficulty, dateKey, offset % 10 === 0);
      if (problem) failures.push(`Bridges ${difficulty} ${dateKey}: ${problem}`);
    } catch (error) {
      failures.push(`Bridges ${difficulty} ${dateKey}: ${(error as Error).message}`);
    }
    checked++;
  }
}

for (const [slug, set] of Object.entries(ANCHOR_SETS)) {
  const listProblems = checkAnchorPairs(set);
  failures.push(...listProblems.map((problem) => `${slug} pair list: ${problem}`));
  if (listProblems.length) continue;
  let yesterdayTop: string | undefined;
  const lastSeen = new Map<string, number>(); // line -> the last day offset it was used
  let linesUsed = 0;
  let linesBackSoon = 0;
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
    const dateKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    try {
      const problem = checkAnchorDay(slug, set, dateKey, offset % 10 === 0, yesterdayTop);
      if (problem) failures.push(`${slug} ${dateKey}: ${problem}`);
      const { words } = generateAnchor(slug, set, dateKey);
      yesterdayTop = words[0];
      for (let child = 1; child < ANCHOR_WORDS; child++) {
        const line = lineText(set, words[(child - 1) >> 1], words[child]);
        if (offset - (lastSeen.get(line) ?? -Infinity) <= ANCHOR_REPEAT_DAYS) linesBackSoon++;
        lastSeen.set(line, offset);
        linesUsed++;
      }
    } catch (error) {
      failures.push(`${slug} ${dateKey}: ${(error as Error).message}`);
      yesterdayTop = undefined;
    }
    checked++;
  }
  anchorRepeats[slug] = linesBackSoon / linesUsed;
}

const seconds = ((performance.now() - started) / 1000).toFixed(1);
for (const [slug, count] of Object.entries(anchorStandIns)) {
  console.log(`${slug}: ${count} days used a stand-in top ${ANCHOR_SETS[slug].tile} (its own made no puzzle with one answer).`);
}
for (const [slug, share] of Object.entries(anchorRepeats)) {
  const { makes } = ANCHOR_SETS[slug];
  console.log(
    `${slug}: ${(share * 100).toFixed(1)}% of ${makes}s were also used in the ${ANCHOR_REPEAT_DAYS} days before (list has ${pairGraph(ANCHOR_SETS[slug]).lines.size}).`
  );
}

if (failures.length) {
  console.error(`${failures.length} of ${checked} puzzles failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `All ${checked} puzzles (Sea Glass, Buoy and Bridges at Easy and Hard, Anchor Chain and Anchor Links) have exactly one solution (${seconds}s, slowest day ${Math.round(slowestMs)}ms).`
);
