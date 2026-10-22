// Bridges puzzle maker and solver. Plain logic with no page code, so the pre-deploy check
// (scripts/check-puzzles.ts) runs exactly what players get.
//
// Islands sit on a square grid. Bridges run straight across or down between two islands with
// nothing in between, never cross, and at most two join the same pair. Each island's number is how
// many bridges touch it, and every island has to end up connected into one group.

export type BridgesDifficulty = "easy" | "hard";

interface Settings {
  size: number;
  islands: { min: number; max: number };
  /** Share of bridges that are doubles */
  doubles: number;
  /** Chance of joining each extra pair of neighbors once the islands are all linked (makes loops) */
  extra: number;
}

const SETTINGS: Record<BridgesDifficulty, Settings> = {
  easy: { size: 7, islands: { min: 10, max: 14 }, doubles: 0.3, extra: 0.25 },
  hard: { size: 9, islands: { min: 18, max: 24 }, doubles: 0.4, extra: 0.35 },
};

const MAX_ATTEMPTS = 3000;
/** Solver steps allowed per attempt before giving up on it (keeps rare slow boards from stalling the page) */
const SOLVER_BUDGET = 20000;

export interface Island {
  r: number;
  c: number;
  /** How many bridges touch it */
  target: number;
}

/** Two islands in the same row or column with nothing between them: the only places a bridge can go */
export interface Pair {
  a: number;
  b: number;
  horizontal: boolean;
}

export interface BridgesPuzzle {
  size: number;
  islands: Island[];
  pairs: Pair[];
  /** Bridges on each pair (0, 1 or 2), in the order of `pairs` */
  solution: number[];
}

/**
 * Makes a puzzle from a seeded random number generator: grows a connected network of bridges from
 * one island, adds a few extra bridges, reads off the numbers, and keeps it only when the numbers
 * have exactly one answer and need the right kind of thinking for the difficulty:
 * - Easy: solvable by counting alone (what an island still needs vs. what its neighbors can take).
 * - Hard: counting alone gets stuck; it also takes keeping every island connected, or trying a
 *   bridge and seeing it fail. It never needs a blind guess.
 * The same seed always lands on the same puzzle.
 */
export function generateBridges(random: () => number, difficulty: BridgesDifficulty): BridgesPuzzle {
  const settings = SETTINGS[difficulty];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const puzzle = randomPuzzle(random, settings);
    if (!puzzle) continue;
    const found = findSolutions(puzzle, 2, SOLVER_BUDGET);
    if (found?.length !== 1) continue;
    const counting = solveByLogic(puzzle, false);
    if (difficulty === "easy" ? counting : !counting && solveByLogic(puzzle, true)) return puzzle;
  }
  throw new Error(`Bridges: no ${difficulty} puzzle after ${MAX_ATTEMPTS} attempts`);
}

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

/**
 * Grows the network: starts with one island, then over and over picks an island and a direction
 * and puts a new island 2+ cells away, joined by a bridge. New islands never touch another island
 * and never sit on a bridge, and bridges never cross. Returns null if it couldn't fit enough islands.
 */
function randomPuzzle(random: () => number, { size, islands: count, doubles, extra }: Settings): BridgesPuzzle | null {
  const want = count.min + Math.floor(random() * (count.max - count.min + 1));
  const islandAt = new Int16Array(size * size).fill(-1);
  const bridgeOn = new Uint8Array(size * size); // a bridge runs over this cell
  const spots: [number, number][] = [];
  const built = new Map<string, number>(); // "a,b" (a < b) -> bridges

  const inside = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size;
  const free = (r: number, c: number) => inside(r, c) && islandAt[r * size + c] === -1 && !bridgeOn[r * size + c];
  const touchesIsland = (r: number, c: number) =>
    DIRECTIONS.some(([dr, dc]) => inside(r + dr, c + dc) && islandAt[(r + dr) * size + c + dc] !== -1);
  const addIsland = (r: number, c: number) => {
    islandAt[r * size + c] = spots.length;
    spots.push([r, c]);
  };
  const bridgeCount = () => (random() < doubles ? 2 : 1);

  addIsland(Math.floor(random() * size), Math.floor(random() * size));
  for (let tries = 0; spots.length < want && tries < 2000; tries++) {
    const from = Math.floor(random() * spots.length);
    const [r, c] = spots[from];
    const [dr, dc] = DIRECTIONS[Math.floor(random() * 4)];
    const options: number[] = [];
    for (let k = 1; free(r + dr * k, c + dc * k); k++) {
      if (k >= 2 && !touchesIsland(r + dr * k, c + dc * k)) options.push(k);
    }
    if (!options.length) continue;
    const k = options[Math.floor(random() * options.length)];
    for (let step = 1; step < k; step++) bridgeOn[(r + dr * step) * size + c + dc * step] = 1;
    addIsland(r + dr * k, c + dc * k);
    built.set(`${Math.min(from, spots.length - 1)},${Math.max(from, spots.length - 1)}`, bridgeCount());
  }
  if (spots.length < want) return null;

  // Number islands in reading order, so the board reads naturally and pairs come out sorted
  const order = spots.map((_, i) => i).sort((x, y) => spots[x][0] - spots[y][0] || spots[x][1] - spots[y][1]);
  const newId = new Map(order.map((old, i) => [old, i]));
  const islands = order.map((old) => ({ r: spots[old][0], c: spots[old][1], target: 0 }));
  const bridges = new Map<string, number>();
  for (const [key, n] of built) {
    const [x, y] = key.split(",").map((s) => newId.get(Number(s))!);
    bridges.set(`${Math.min(x, y)},${Math.max(x, y)}`, n);
  }

  const pairs = findPairs(islands);
  const solution = pairs.map((p) => bridges.get(`${p.a},${p.b}`) ?? 0);

  // A few extra bridges between neighbors not yet joined (loops make it less of a tree to unpick)
  const cross = crossings(islands, pairs);
  pairs.forEach((_, p) => {
    if (solution[p] || random() >= extra) return;
    if (cross[p].some((q) => solution[q] > 0)) return;
    solution[p] = bridgeCount();
  });

  pairs.forEach((p, i) => {
    islands[p.a].target += solution[i];
    islands[p.b].target += solution[i];
  });
  return { size, islands, pairs, solution };
}

/** Every pair of islands that could be bridged: each island's nearest neighbor to the right and below. */
export function findPairs(islands: Omit<Island, "target">[]): Pair[] {
  const pairs: Pair[] = [];
  islands.forEach((island, a) => {
    let right = -1;
    let below = -1;
    islands.forEach((o, b) => {
      if (o.r === island.r && o.c > island.c && (right === -1 || o.c < islands[right].c)) right = b;
      if (o.c === island.c && o.r > island.r && (below === -1 || o.r < islands[below].r)) below = b;
    });
    if (right !== -1) pairs.push({ a, b: right, horizontal: true });
    if (below !== -1) pairs.push({ a, b: below, horizontal: false });
  });
  return pairs;
}

/** For each pair, the pairs whose bridges would cross it (one across, one down, meeting between islands). */
export function crossings(islands: Omit<Island, "target">[], pairs: Pair[]): number[][] {
  return pairs.map((p) =>
    pairs.flatMap((q, j) => {
      if (p.horizontal === q.horizontal) return [];
      const [h, v] = p.horizontal ? [p, q] : [q, p];
      const row = islands[h.a].r;
      const col = islands[v.a].c;
      const crossesHere =
        row > islands[v.a].r && row < islands[v.b].r && col > islands[h.a].c && col < islands[h.b].c;
      return crossesHere ? [j] : [];
    })
  );
}

/** True if the pairs with bridges on them join every island into one group. */
export function isConnected(islandCount: number, pairs: Pair[], counts: ArrayLike<number>) {
  const reached = new Uint8Array(islandCount);
  const queue = [0];
  reached[0] = 1;
  let seen = 1;
  while (queue.length) {
    const i = queue.pop()!;
    pairs.forEach((p, k) => {
      if (!counts[k] || (p.a !== i && p.b !== i)) return;
      const other = p.a === i ? p.b : p.a;
      if (reached[other]) return;
      reached[other] = 1;
      seen++;
      queue.push(other);
    });
  }
  return seen === islandCount;
}

// ---------- Solving ----------
// Each pair keeps the fewest and most bridges it could still have (lo..hi, within 0..2). Narrowing
// them until nothing changes is how a person reasons through the puzzle.

interface Board {
  islands: Island[];
  pairs: Pair[];
  /** Pairs touching each island */
  touching: number[][];
  cross: number[][];
}

function makeBoard(puzzle: Pick<BridgesPuzzle, "islands" | "pairs">): Board {
  const { islands, pairs } = puzzle;
  const touching = islands.map((_, i) => pairs.flatMap((p, k) => (p.a === i || p.b === i ? [k] : [])));
  return { islands, pairs, touching, cross: crossings(islands, pairs) };
}

/**
 * Narrows lo/hi in place until nothing changes. Returns false if the board can't be finished.
 * `connect` adds the connection rules: islands that would be cut off from the rest are ruled out,
 * as people do with two 1s side by side or two 2s joined by a double.
 */
function narrow(board: Board, lo: Int8Array, hi: Int8Array, connect: boolean): boolean {
  const { islands, pairs, touching, cross } = board;
  for (let changed = true; changed; ) {
    changed = false;
    const tighten = (k: number, newLo: number, newHi: number) => {
      if (newLo > lo[k]) {
        lo[k] = newLo;
        changed = true;
      }
      if (newHi < hi[k]) {
        hi[k] = newHi;
        changed = true;
      }
      return lo[k] <= hi[k];
    };

    // A built bridge rules out every bridge that would cross it
    for (let k = 0; k < pairs.length; k++) {
      if (lo[k] > 0) for (const q of cross[k]) if (!tighten(q, 0, 0)) return false;
    }

    // Each island's bridges have to add up to its number
    for (let i = 0; i < islands.length; i++) {
      let sumLo = 0;
      let sumHi = 0;
      for (const k of touching[i]) {
        sumLo += lo[k];
        sumHi += hi[k];
      }
      const target = islands[i].target;
      if (sumLo > target || sumHi < target) return false;
      for (const k of touching[i]) {
        if (!tighten(k, target - (sumHi - hi[k]), target - (sumLo - lo[k]))) return false;
      }
    }

    if (!connect) continue;

    // Joining two islands mustn't close them off as a group of their own (unless that's everyone)
    if (islands.length > 2) {
      for (let k = 0; k < pairs.length; k++) {
        const { a, b } = pairs[k];
        const ta = islands[a].target;
        const tb = islands[b].target;
        if (ta === tb && ta <= 2 && !tighten(k, lo[k], ta - 1)) return false;
      }
    }

    // Every island must still be reachable over pairs that could hold a bridge
    if (!isConnected(islands.length, pairs, hi)) return false;

    // A finished group (every island in it at its number) must be everyone
    const groupOf = new Int16Array(islands.length).fill(-1);
    for (let start = 0; start < islands.length; start++) {
      if (groupOf[start] !== -1) continue;
      const members = [start];
      groupOf[start] = start;
      let open = false;
      for (let m = 0; m < members.length; m++) {
        for (const k of touching[members[m]]) {
          if (lo[k] < hi[k]) open = true;
          if (!lo[k]) continue;
          const other = pairs[k].a === members[m] ? pairs[k].b : pairs[k].a;
          if (groupOf[other] === -1) {
            groupOf[other] = start;
            members.push(other);
          }
        }
      }
      if (!open && members.length < islands.length) return false;
    }
  }
  return true;
}

/**
 * Solves the way a person would, without guessing: narrow, and when that stalls (with `deep`),
 * try each still-open choice on its own and rule it out if narrowing then hits a dead end.
 * True if that finishes the board.
 */
export function solveByLogic(puzzle: Pick<BridgesPuzzle, "islands" | "pairs">, deep: boolean): boolean {
  const board = makeBoard(puzzle);
  const lo = new Int8Array(board.pairs.length);
  const hi = new Int8Array(board.pairs.length).fill(2);
  if (!narrow(board, lo, hi, deep)) return false;

  for (let progress = true; progress; ) {
    progress = false;
    if (lo.every((n, k) => n === hi[k])) return isConnected(board.islands.length, board.pairs, lo);
    if (!deep) return false;
    for (let k = 0; k < board.pairs.length && !progress; k++) {
      for (let value = lo[k]; value <= hi[k] && lo[k] < hi[k]; value++) {
        const tryLo = lo.slice();
        const tryHi = hi.slice();
        tryLo[k] = tryHi[k] = value;
        if (narrow(board, tryLo, tryHi, true)) continue;
        // `value` leads nowhere: drop it from the end of the range it sits at
        if (value === lo[k]) lo[k]++;
        else if (value === hi[k]) hi[k]--;
        else continue;
        if (!narrow(board, lo, hi, true)) return false;
        progress = true;
        break;
      }
    }
  }
  return false;
}

/**
 * Every set of bridges that fits the numbers and rules, stopping once `limit` are found. Narrows,
 * then branches on the open pair with the fewest choices. Returns null if it runs past `budget`
 * steps without finishing.
 */
export function findSolutions(
  puzzle: Pick<BridgesPuzzle, "islands" | "pairs">,
  limit: number,
  budget = Infinity
): number[][] | null {
  const board = makeBoard(puzzle);
  const solutions: number[][] = [];
  let steps = 0;

  function search(lo: Int8Array, hi: Int8Array): void {
    if (++steps > budget || !narrow(board, lo, hi, true)) return;
    let pick = -1;
    for (let k = 0; k < lo.length; k++) {
      if (lo[k] < hi[k] && (pick === -1 || hi[k] - lo[k] < hi[pick] - lo[pick])) pick = k;
    }
    if (pick === -1) {
      if (isConnected(board.islands.length, board.pairs, lo)) solutions.push(Array.from(lo));
      return;
    }
    for (let value = lo[pick]; value <= hi[pick]; value++) {
      const nextLo = lo.slice();
      const nextHi = hi.slice();
      nextLo[pick] = nextHi[pick] = value;
      search(nextLo, nextHi);
      if (solutions.length >= limit || steps > budget) return;
    }
  }

  search(new Int8Array(board.pairs.length), new Int8Array(board.pairs.length).fill(2));
  return steps > budget ? null : solutions;
}
