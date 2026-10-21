// Buoy puzzle maker and solver. Plain logic with no page code, so the pre-deploy check
// (scripts/check-puzzles.ts) runs exactly what players get.
//
// A 9x9 board is split into regions. Some cells hold buoys (buoys may touch). The clues are how many
// buoys are in each row, each column and each region, and they have to lead to exactly one layout.
// On Hard, some of the row and column numbers are hidden (region numbers always show).

export const SIZE = 9;
const CELLS = SIZE * SIZE;

export type BuoyDifficulty = "easy" | "hard";

/** How many of the 18 row and column numbers are hidden */
const HIDDEN: Record<BuoyDifficulty, { min: number; max: number }> = {
  easy: { min: 0, max: 0 },
  hard: { min: 5, max: 7 },
};

/** How many regions to split the board into, and roughly what share of cells get a buoy */
const REGIONS = { min: 16, max: 22 };
const BUOY_SHARE = { min: 0.18, max: 0.24 };
/** Finished boards must have this many buoys (nudging can drift the count) */
const BUOYS = { min: 12, max: 22 };
/**
 * Most 0s a board may show (rows and columns together, then regions). A 0 rules out a whole line
 * or region at once, so boards with one answer lean heavily on them and come out too easy unless
 * they're capped.
 */
const MAX_ZERO_LINES = 2;
const MAX_ZERO_REGIONS = 3;
/** Regions smaller than this get merged into a neighbor */
const MIN_REGION_SIZE = 3;

const MAX_ATTEMPTS = 200;
const NUDGES = 1000;
/** Solver steps allowed per attempt before giving up on it (keeps rare slow boards from stalling the page) */
const SOLVER_BUDGET = 15000;

export interface BuoyPuzzle {
  /** Each cell's region number, row by row */
  regions: number[];
  /** Each cell: true if it holds a buoy, row by row */
  solution: boolean[];
  /** Buoys per row and column; null where the number is hidden */
  rowCounts: (number | null)[];
  colCounts: (number | null)[];
  /** Buoys per region, indexed by region number */
  regionCounts: number[];
}

/**
 * Makes a puzzle from a seeded random number generator: random regions and random buoys, kept only
 * when the clues they give have exactly one solution. Random boards rarely do, so a board with two
 * solutions gets nudged (one cell flipped where they disagree) and checked again. The same seed
 * always lands on the same puzzle.
 *
 * For Hard, which numbers to hide is picked first, and the board is nudged until it has exactly one
 * solution without them. (Hiding numbers from a finished Easy board rarely works: those boards are
 * only just pinned down by every number.)
 */
export function generateBuoy(random: () => number, difficulty: BuoyDifficulty): BuoyPuzzle {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const regions = randomRegions(random);
    const share = BUOY_SHARE.min + random() * (BUOY_SHARE.max - BUOY_SHARE.min);
    const solution = Array.from({ length: CELLS }, () => random() < share);
    const hidden = pickHidden(random, HIDDEN[difficulty]);

    for (let nudge = 0; nudge <= NUDGES; nudge++) {
      const clues = countClues(regions, solution);
      const puzzle = {
        regions,
        solution,
        rowCounts: clues.rowCounts.map((n, r) => (hidden.has(r) ? null : n)),
        colCounts: clues.colCounts.map((n, c) => (hidden.has(SIZE + c) ? null : n)),
        regionCounts: clues.regionCounts,
      };
      const found = findSolutions(puzzle, 2, SOLVER_BUDGET);
      const buoys = solution.filter(Boolean).length;
      const tooFew = buoys < BUOYS.min;
      const tooMany = buoys > BUOYS.max;
      // Shown 0s only: a hidden line's 0 isn't a clue
      const zeroRows = puzzle.rowCounts.map((n) => n === 0);
      const zeroCols = puzzle.colCounts.map((n) => n === 0);
      const zeroRegions = puzzle.regionCounts.map((n) => n === 0);
      const zeroLines = [...zeroRows, ...zeroCols].filter(Boolean).length;
      const tooManyZeros = zeroLines > MAX_ZERO_LINES || zeroRegions.filter(Boolean).length > MAX_ZERO_REGIONS;
      if (found?.length === 1 && !tooFew && !tooMany && !tooManyZeros) return puzzle;

      // Flip a cell: one that moves the buoy count back into range, else a buoy into a 0 row,
      // column or region, else one where two answers disagree, else (the solver gave up) any cell
      const cells = [...Array(CELLS).keys()];
      const inZero = (cell: number) =>
        zeroRows[Math.floor(cell / SIZE)] || zeroCols[cell % SIZE] || zeroRegions[regions[cell]];
      const choices =
        tooFew || tooMany
          ? cells.filter((cell) => solution[cell] === tooMany)
          : tooManyZeros
            ? cells.filter(inZero)
            : found
              ? cells.filter((cell) => found[0][cell] !== found[1][cell])
              : cells;
      const cell = choices[Math.floor(random() * choices.length)];
      solution[cell] = !solution[cell];
    }
  }
  throw new Error(`Buoy: no puzzle with exactly one solution after ${MAX_ATTEMPTS} attempts`);
}

/** Which row and column numbers to hide: 0-8 are rows, 9-17 are columns. */
function pickHidden(random: () => number, range: { min: number; max: number }) {
  const count = range.min + Math.floor(random() * (range.max - range.min + 1));
  const hidden = new Set<number>();
  while (hidden.size < count) hidden.add(Math.floor(random() * SIZE * 2));
  return hidden;
}

/**
 * Grows regions out from random starting cells, one random neighbor at a time, then merges any
 * that came out too small into a neighbor. Region numbers end up 0, 1, 2... in reading order.
 */
function randomRegions(random: () => number) {
  const count = REGIONS.min + Math.floor(random() * (REGIONS.max - REGIONS.min + 1));
  const region = new Array<number>(CELLS).fill(-1);
  const frontier: number[] = [];
  for (let placed = 0; placed < count; ) {
    const cell = Math.floor(random() * CELLS);
    if (region[cell] !== -1) continue;
    region[cell] = placed++;
    frontier.push(cell);
  }
  while (frontier.length) {
    const cell = frontier.splice(Math.floor(random() * frontier.length), 1)[0];
    for (const n of neighbors(cell)) {
      if (region[n] === -1) {
        region[n] = region[cell];
        frontier.push(n);
      }
    }
  }

  // Merge small regions into the neighbor they share the most sides with (repeat until none are left)
  for (let merged = true; merged; ) {
    merged = false;
    const sizes = new Map<number, number>();
    region.forEach((g) => sizes.set(g, (sizes.get(g) ?? 0) + 1));
    for (const [g, size] of sizes) {
      if (size >= MIN_REGION_SIZE) continue;
      const touching = new Map<number, number>();
      region.forEach((h, cell) => {
        if (h !== g) return;
        for (const n of neighbors(cell)) if (region[n] !== g) touching.set(region[n], (touching.get(region[n]) ?? 0) + 1);
      });
      const into = [...touching].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
      region.forEach((h, cell) => h === g && (region[cell] = into));
      merged = true;
      break;
    }
  }

  const renumber = new Map<number, number>();
  return region.map((g) => {
    if (!renumber.has(g)) renumber.set(g, renumber.size);
    return renumber.get(g)!;
  });
}

function neighbors(cell: number) {
  const r = Math.floor(cell / SIZE);
  const c = cell % SIZE;
  const out: number[] = [];
  if (r > 0) out.push(cell - SIZE);
  if (r < SIZE - 1) out.push(cell + SIZE);
  if (c > 0) out.push(cell - 1);
  if (c < SIZE - 1) out.push(cell + 1);
  return out;
}

/** The row, column and region counts for a layout of buoys. */
export function countClues(regions: number[], buoys: boolean[]) {
  const rowCounts = new Array<number>(SIZE).fill(0);
  const colCounts = new Array<number>(SIZE).fill(0);
  const regionCounts = new Array<number>(Math.max(...regions) + 1).fill(0);
  buoys.forEach((buoy, cell) => {
    if (!buoy) return;
    rowCounts[Math.floor(cell / SIZE)]++;
    colCounts[cell % SIZE]++;
    regionCounts[regions[cell]]++;
  });
  return { rowCounts, colCounts, regionCounts };
}

/**
 * Every buoy layout that fits the clues, stopping once `limit` are found. Fills the board in reading
 * order, giving up on a branch as soon as a row, column or region can no longer reach its count.
 * A hidden row or column number (null) puts no limit on that line.
 * Returns null if it runs past `budget` steps without finishing.
 */
export function findSolutions(
  puzzle: Pick<BuoyPuzzle, "regions" | "rowCounts" | "colCounts" | "regionCounts">,
  limit: number,
  budget = Infinity
): boolean[][] | null {
  const { regions } = puzzle;
  // A hidden line starts at 127 needed, so placing a buoy never runs it out
  const rowNeed = Int8Array.from(puzzle.rowCounts, (n) => n ?? 127);
  const colNeed = Int8Array.from(puzzle.colCounts, (n) => n ?? 127);
  const rowOpen = puzzle.rowCounts.map((n) => n === null);
  const colOpen = puzzle.colCounts.map((n) => n === null);
  const regionNeed = Int8Array.from(puzzle.regionCounts);

  // How many cells of each cell's region come after it in reading order
  const regionCellsAfter = new Int8Array(CELLS);
  const seen = new Int8Array(regionNeed.length);
  for (let cell = CELLS - 1; cell >= 0; cell--) regionCellsAfter[cell] = seen[regions[cell]]++;

  const solutions: boolean[][] = [];
  const board: boolean[] = new Array(CELLS).fill(false);
  let steps = 0;

  /** After deciding a cell: can its row, column and region still reach their counts? */
  const canFinish = (cell: number, r: number, c: number, g: number) =>
    (rowOpen[r] || rowNeed[r] <= SIZE - 1 - c) &&
    (colOpen[c] || colNeed[c] <= SIZE - 1 - r) &&
    regionNeed[g] <= regionCellsAfter[cell];

  function fill(cell: number): void {
    if (cell === CELLS) {
      solutions.push([...board]);
      return;
    }
    if (++steps > budget) return;
    const r = Math.floor(cell / SIZE);
    const c = cell % SIZE;
    const g = regions[cell];

    // Buoy here
    if (rowNeed[r] > 0 && colNeed[c] > 0 && regionNeed[g] > 0) {
      rowNeed[r]--;
      colNeed[c]--;
      regionNeed[g]--;
      board[cell] = true;
      if (canFinish(cell, r, c, g)) {
        fill(cell + 1);
      }
      board[cell] = false;
      rowNeed[r]++;
      colNeed[c]++;
      regionNeed[g]++;
      if (solutions.length >= limit || steps > budget) return;
    }

    // No buoy here
    if (canFinish(cell, r, c, g)) {
      fill(cell + 1);
    }
  }

  fill(0);
  return steps > budget ? null : solutions;
}
