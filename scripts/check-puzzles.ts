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

const DAYS_BACK = 30;
const DAYS_AHEAD = 365 * 3;
const SEA_GLASS_DIFFICULTIES: SeaGlassDifficulty[] = ["easy", "hard"];

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

const seconds = ((performance.now() - started) / 1000).toFixed(1);

if (failures.length) {
  console.error(`${failures.length} of ${checked} puzzles failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `All ${checked} Sea Glass puzzles (Easy and Hard) have exactly one solution (${seconds}s, slowest day ${Math.round(slowestMs)}ms).`
);
