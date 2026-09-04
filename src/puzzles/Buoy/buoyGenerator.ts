// Seeded Pseudo-Random Number Generator (Mulberry32)
function createPRNG(seedString: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
  }
  return function () {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GridCell {
  region: number;
  count: number | null;
}

export interface GeneratedPuzzle {
  colTargets: number[];
  rowTargets: number[];
  gridData: GridCell[][];
  solution: boolean[][];
}

export function generateDailyPuzzle(dateString?: string): GeneratedPuzzle {
  const dateKey = dateString || new Date().toISOString().split("T")[0];
  const rng = createPRNG(dateKey);

  let puzzle: GeneratedPuzzle | null = null;
  let attempts = 0;

  // Retry until a balanced layout is constructed
  while (!puzzle && attempts < 50) {
    attempts++;
    puzzle = tryGeneratePuzzle(rng);
  }

  return puzzle || fallbackPuzzle();
}

function tryGeneratePuzzle(rng: () => number): GeneratedPuzzle | null {
  // 1. Generate 9 to 11 contiguous, well-balanced regions using Flood Fill
  const regionMap: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  const targetRegionCount = 10;

  // Choose random seeds for regions
  const seeds: { r: number; c: number; id: number }[] = [];
  while (seeds.length < targetRegionCount) {
    const r = Math.floor(rng() * 9);
    const c = Math.floor(rng() * 9);
    if (!seeds.some(s => s.r === r && s.c === c)) {
      const id = seeds.length + 1;
      seeds.push({ r, c, id });
      regionMap[r][c] = id;
    }
  }

  // Expand seeds evenly
  let unassigned = 81 - targetRegionCount;
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  while (unassigned > 0) {
    let expandedThisRound = false;
    for (const seed of seeds) {
      // Find unassigned neighbors around this region's current cells
      const borderCells: { r: number; c: number }[] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (regionMap[r][c] === seed.id) {
            for (const [dr, dc] of directions) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && regionMap[nr][nc] === 0) {
                borderCells.push({ r: nr, c: nc });
              }
            }
          }
        }
      }

      if (borderCells.length > 0) {
        // Pick a random border cell to expand into
        const target = borderCells[Math.floor(rng() * borderCells.length)];
        if (regionMap[target.r][target.c] === 0) {
          regionMap[target.r][target.c] = seed.id;
          unassigned--;
          expandedThisRound = true;
        }
      }
    }

    if (!expandedThisRound) break; // Prevents infinite loop if isolated
  }

  // Cleanup any stray unassigned cells
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (regionMap[r][c] === 0) {
        const neighbors = directions
          .map(([dr, dc]) => ({ r: r + dr, c: c + dc }))
          .filter(({ r, c }) => r >= 0 && r < 9 && c >= 0 && c < 9 && regionMap[r][c] !== 0);

        if (neighbors.length > 0) {
          const choice = neighbors[Math.floor(rng() * neighbors.length)];
          regionMap[r][c] = regionMap[choice.r][choice.c];
        } else {
          regionMap[r][c] = 1;
        }
      }
    }
  }

  // 2. Place buoys adhering to non-touching (orthogonal + diagonal) rules
  const solution: boolean[][] = Array.from({ length: 9 }, () => Array(9).fill(false));
  const regionBuoyCounts: Record<number, number> = {};

  // Shuffle cells to randomize placement order
  const allCells: { r: number; c: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) allCells.push({ r, c });
  }
  allCells.sort(() => rng() - 0.5);

  function canPlaceBuoy(r: number, c: number): boolean {
    // Check 3x3 surrounding area so buoys don't touch
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          if (solution[nr][nc]) return false;
        }
      }
    }
    return true;
  }

  let totalBuoysPlaced = 0;
  for (const { r, c } of allCells) {
    const reg = regionMap[r][c];
    regionBuoyCounts[reg] = regionBuoyCounts[reg] || 0;

    // Cap at max 2 buoys per region for balanced difficulty
    if (regionBuoyCounts[reg] < 2 && canPlaceBuoy(r, c) && rng() > 0.4) {
      solution[r][c] = true;
      regionBuoyCounts[reg]++;
      totalBuoysPlaced++;
    }
  }

  // Reject if too few buoys (too easy/empty)
  if (totalBuoysPlaced < 12) return null;

  // 3. Calculate row and column totals
  const rowTargets = solution.map(row => row.filter(Boolean).length);
  const colTargets = Array.from({ length: 9 }, (_, c) =>
    solution.reduce((acc, row) => acc + (row[c] ? 1 : 0), 0)
  );

  // 4. Construct grid output with clues pinned to top-left of each region
  const regionVisited = new Set<number>();
  const gridData: GridCell[][] = Array.from({ length: 9 }, () => []);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const reg = regionMap[r][c];
      let clueCount: number | null = null;

      if (!regionVisited.has(reg)) {
        regionVisited.add(reg);
        clueCount = regionBuoyCounts[reg] || 0;
      }

      gridData[r].push({
        region: reg,
        count: clueCount
      });
    }
  }

  return { colTargets, rowTargets, gridData, solution };
}

// Solid fallback puzzle if RNG fails max attempts
function fallbackPuzzle(): GeneratedPuzzle {
  return generateDailyPuzzle("2026-01-01");
}
