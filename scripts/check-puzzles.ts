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

const seconds = ((performance.now() - started) / 1000).toFixed(1);

if (failures.length) {
  console.error(`${failures.length} of ${checked} puzzles failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `All ${checked} puzzles (Sea Glass, Buoy and Bridges, Easy and Hard) have exactly one solution (${seconds}s, slowest day ${Math.round(slowestMs)}ms).`
);
