// Sea Glass puzzle maker and solver. Plain logic with no page code, so the pre-deploy check
// (scripts/check-puzzles.ts) runs exactly what players get.
//
// A tile is 4 letters: its edge colors in [top, right, bottom, left] order.
// K = black, S = seafoam, O = ocean, Y = sun, C = coral.
// Every outside edge is black and every edge between two tiles must match. On Easy, black is only
// on the outside border; on Hard, a few edges inside the board are black too.
//
// On the solved board each edge between two tiles is a diamond of one color (a triangle from each
// tile). Every color forms one connected patch: its diamonds join up through shared sides. On Hard
// the black inside the board is one connected patch as well.

export const ROWS = 4;
export const COLS = 7;

export type SeaGlassDifficulty = "easy" | "hard";

const COLORS = ["S", "O", "Y", "C"];
/** Colors plus black, so black inside the board can be stored like a color */
const PAINTS = [...COLORS, "K"];
const BLACK = PAINTS.indexOf("K");

/** How many edges inside the board are black */
const INSIDE_BLACK: Record<SeaGlassDifficulty, { min: number; max: number }> = {
  easy: { min: 0, max: 0 },
  hard: { min: 5, max: 8 },
};

/**
 * Share of boards with black inside that may have an all-black tile. Left alone the search makes
 * one nearly every day (a corner tile only needs its 2 inside edges black), so most boards still rule
 * it out. Boards that allow one pass the one-solution check more often, so 1 in 6 works out to about
 * a third of Hard days.
 */
const ALL_BLACK_CHANCE = 1 / 6;

// About 40% of attempts succeed on Easy and 15% on Hard, so this is effectively never reached
const MAX_ATTEMPTS = 150;
const NUDGES = 20000;

/**
 * Every edge between two tiles gets a number. tileEdges[i] lists tile i's edges in
 * [top, right, bottom, left] order (-1 on the outside border), and neighbors[e] lists the edges
 * whose diamonds share a side with edge e's: the sides next to it within the same tile.
 */
const { tileEdges, neighbors, edgeCount, edgeTiles } = (() => {
  const side = (r: number, c: number) => r * (COLS - 1) + c; // between (r, c) and (r, c + 1)
  const stack = (r: number, c: number) => ROWS * (COLS - 1) + r * COLS + c; // between (r, c) and (r + 1, c)
  const edgeCount = ROWS * (COLS - 1) + (ROWS - 1) * COLS;

  const tileEdges = Array.from({ length: ROWS * COLS }, (_, i) => {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    return [
      r === 0 ? -1 : stack(r - 1, c),
      c === COLS - 1 ? -1 : side(r, c),
      r === ROWS - 1 ? -1 : stack(r, c),
      c === 0 ? -1 : side(r, c - 1),
    ];
  });

  const neighbors: number[][] = Array.from({ length: edgeCount }, () => []);
  for (const edges of tileEdges) {
    for (let s = 0; s < 4; s++) {
      const a = edges[s];
      const b = edges[(s + 1) % 4];
      if (a >= 0 && b >= 0) {
        neighbors[a].push(b);
        neighbors[b].push(a);
      }
    }
  }
  // The (up to 2) tiles each edge belongs to
  const edgeTiles: number[][] = Array.from({ length: edgeCount }, () => []);
  tileEdges.forEach((edges, i) => edges.forEach((e) => e >= 0 && edgeTiles[e].push(i)));

  return { tileEdges, neighbors, edgeCount, edgeTiles };
})();

export interface SeaGlassPuzzle {
  /** Tiles in their solved positions, row by row */
  solution: string[];
  /** The same tiles, shuffled into the order they start in the bank */
  bank: string[];
}

/**
 * Makes a puzzle from a seeded random number generator. Keeps making boards (no duplicate tiles,
 * each color in one connected patch) until one has exactly one solution, so the same seed always
 * lands on the same puzzle.
 */
export function generateSeaGlass(random: () => number, difficulty: SeaGlassDifficulty): SeaGlassPuzzle {
  const blackRange = INSIDE_BLACK[difficulty];
  const blackInside = blackRange.max > 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = randomBoard(random, blackRange);
    if (!solution || findSolutions(solution, 2, blackInside).length !== 1) continue;
    return { solution, bank: shuffle(solution, random) };
  }
  throw new Error(`Sea Glass (${difficulty}): no puzzle with exactly one solution after ${MAX_ATTEMPTS} attempts`);
}

/**
 * Starts from random edge colors (which rarely repeat a tile), then keeps recoloring one edge to
 * match a neighbor, keeping each change that doesn't make things worse, until no two tiles are the
 * same and every color is one patch. Returns the tiles, or null if it got stuck.
 *
 * For Hard, a black patch of the right size is grown first to start from. The search can then move
 * it like any color, as long as it stays one piece within the size range. Some boards (see
 * ALL_BLACK_CHANCE) may also end up with an all-black tile; the rest never make one.
 * (Holding the black still often walls a color off, or leaves two identical black tiles.)
 *
 * (Growing each color out as one solid blob instead makes lots of identical one-color tiles.)
 */
function randomBoard(random: () => number, blackRange: { min: number; max: number }) {
  const colors = Array.from({ length: edgeCount }, () => Math.floor(random() * COLORS.length));
  const blackCount = blackRange.min + Math.floor(random() * (blackRange.max - blackRange.min + 1));

  if (blackCount > 0) {
    const frontier = [Math.floor(random() * edgeCount)];
    for (let placed = 0; placed < blackCount; placed++) {
      const edge = frontier.splice(Math.floor(random() * frontier.length), 1)[0];
      colors[edge] = BLACK;
      frontier.push(...neighbors[edge].filter((n) => colors[n] !== BLACK && !frontier.includes(n)));
    }
  }

  const allBlackOk = blackCount > 0 && random() < ALL_BLACK_CHANCE;
  const board = trackProblems(colors, blackRange, allBlackOk);

  for (let step = 0; step < NUDGES && board.problems() > 0; step++) {
    const edge = Math.floor(random() * edgeCount);
    const before = colors[edge];
    const problems = board.problems();
    const after = colors[neighbors[edge][Math.floor(random() * neighbors[edge].length)]];
    if (after === before) continue;

    board.recolor(edge, after);
    if (board.problems() > problems) board.recolor(edge, before);
  }
  return board.problems() === 0 ? toTiles(colors) : null;
}

/** Cuts a board of edge colors (indexes into PAINTS) into tiles; outer edges are black. */
function toTiles(colors: number[]) {
  return tileEdges.map((edges) => edges.map((e) => (e < 0 ? "K" : PAINTS[colors[e]])).join(""));
}

/**
 * Keeps count of how far a board is from done while the search recolors it one edge at a time:
 * duplicate tiles, all-black tiles (unless `allBlackOk`), extra patches (or a missing patch) per
 * color, extra black patches, and how far the amount of black is outside its range.
 *
 * Recoloring one edge only changes the two tiles on it and the patches of its old and new color,
 * so only those are recounted. (Recounting the whole board every step made Hard take seconds.)
 */
function trackProblems(colors: number[], blackRange: { min: number; max: number }, allBlackOk: boolean) {
  // Each tile as a number: its 4 sides in base 5 (a paint each, black on the outside border)
  const tileCode = (tile: number) =>
    tileEdges[tile].reduce((code, e) => code * PAINTS.length + (e < 0 ? BLACK : colors[e]), 0);
  const ALL_BLACK = PAINTS.length ** 4 - 1;

  const tiles = tileEdges.map((_, i) => tileCode(i));
  const copies = new Uint8Array(PAINTS.length ** 4); // how many tiles have each code
  let distinctTiles = 0;
  let blackCount = colors.filter((c) => c === BLACK).length;

  function addTile(tile: number) {
    tiles[tile] = tileCode(tile);
    if (copies[tiles[tile]]++ === 0) distinctTiles++;
  }
  function removeTile(tile: number) {
    if (--copies[tiles[tile]] === 0) distinctTiles--;
  }
  tiles.forEach((_, i) => addTile(i));

  // Patches of one paint, found by flood fill. `visited` holds a stamp per fill so it never needs clearing.
  const visited = new Uint32Array(edgeCount);
  const queue = new Int32Array(edgeCount);
  let stamp = 0;
  function countPatches(paint: number) {
    let patches = 0;
    for (let start = 0; start < edgeCount; start++) {
      if (colors[start] !== paint || visited[start] === stamp + 1) continue;
      patches++;
      visited[start] = stamp + 1;
      let length = 0;
      queue[length++] = start;
      while (length) {
        for (const n of neighbors[queue[--length]]) {
          if (colors[n] === paint && visited[n] !== stamp + 1) {
            visited[n] = stamp + 1;
            queue[length++] = n;
          }
        }
      }
    }
    stamp++;
    return patches;
  }
  const patches = PAINTS.map((_, paint) => countPatches(paint));

  return {
    problems() {
      let problems = tiles.length - distinctTiles + (allBlackOk ? 0 : copies[ALL_BLACK]);
      problems += Math.max(0, blackRange.min - blackCount, blackCount - blackRange.max);
      for (let paint = 0; paint < PAINTS.length; paint++) {
        // No black at all is fine on Easy (and on Hard the range above already counts it)
        if (patches[paint] === 0) problems += paint === BLACK ? 0 : 3;
        else problems += patches[paint] - 1;
      }
      return problems;
    },

    recolor(edge: number, paint: number) {
      const old = colors[edge];
      if (old === paint) return;
      edgeTiles[edge].forEach(removeTile);
      colors[edge] = paint;
      edgeTiles[edge].forEach(addTile);
      blackCount += Number(paint === BLACK) - Number(old === BLACK);
      patches[old] = countPatches(old);
      patches[paint] = countPatches(paint);
    },
  };
}

/**
 * True when the solved board uses every color and each color is one connected patch. With
 * `blackInside`, the black inside the board must also be there and be one patch.
 */
export function colorsAreConnected(solution: string[], blackInside: boolean) {
  // Read each edge's color off the board (from the tile on its top or left)
  const colorOf: string[] = [];
  tileEdges.forEach((edges, i) => {
    edges.forEach((e, s) => {
      if (e >= 0) colorOf[e] ??= solution[i][s];
    });
  });

  return (blackInside ? PAINTS : COLORS).every((color) => {
    const patch = colorOf.flatMap((c, e) => (c === color ? [e] : []));
    if (patch.length === 0) return false;
    const reached = new Set([patch[0]]);
    const queue = [patch[0]];
    while (queue.length) {
      for (const n of neighbors[queue.pop()!]) {
        if (colorOf[n] === color && !reached.has(n)) {
          reached.add(n);
          queue.push(n);
        }
      }
    }
    return reached.size === patch.length;
  });
}

/**
 * Every way to lay out these tiles that follows the rules, stopping once `limit` are found.
 * Fills the board in reading order, so each space only has to match the tiles above and to its left.
 * `blackInside` allows (matching) black edges between tiles, as on Hard.
 */
export function findSolutions(tiles: string[], limit: number, blackInside: boolean): string[][] {
  const solutions: string[][] = [];
  const used = tiles.map(() => false);
  const board: string[] = [];

  function fill(i: number) {
    if (i === ROWS * COLS) {
      solutions.push([...board]);
      return;
    }
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const top = r === 0 ? "K" : board[i - COLS][2];
    const left = c === 0 ? "K" : board[i - 1][1];
    const tried = new Set<string>(); // identical tiles would give the same layout twice

    for (let t = 0; t < tiles.length && solutions.length < limit; t++) {
      const tile = tiles[t];
      if (used[t] || tried.has(tile)) continue;
      if (tile[0] !== top || tile[3] !== left) continue;
      // The outside must be black; inside, black is only allowed on Hard
      if (c === COLS - 1 ? tile[1] !== "K" : tile[1] === "K" && !blackInside) continue;
      if (r === ROWS - 1 ? tile[2] !== "K" : tile[2] === "K" && !blackInside) continue;

      tried.add(tile);
      used[t] = true;
      board[i] = tile;
      fill(i + 1);
      used[t] = false;
    }
  }

  fill(0);
  return solutions;
}

function shuffle<T>(items: T[], random: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
