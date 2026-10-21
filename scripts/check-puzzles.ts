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

const DAYS_BACK = 30;
const DAYS_AHEAD = 365 * 3;
const SEA_GLASS_DIFFICULTIES: SeaGlassDifficulty[] = ["easy", "hard"];
const BUOY_DIFFICULTIES: BuoyDifficulty[] = ["easy", "hard"];

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

const seconds = ((performance.now() - started) / 1000).toFixed(1);

if (failures.length) {
  console.error(`${failures.length} of ${checked} puzzles failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `All ${checked} puzzles (Sea Glass and Buoy, Easy and Hard) have exactly one solution (${seconds}s, slowest day ${Math.round(slowestMs)}ms).`
);
