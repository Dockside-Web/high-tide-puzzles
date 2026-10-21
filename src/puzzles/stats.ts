// Per-puzzle stats kept in this browser (no accounts): a daily streak, and times per difficulty.
// Stored under stats:<slug>. Storage can be blocked, so reads fall back to empty stats and writes
// may quietly fail.

import { localDateKey } from "./daily";

interface PuzzleStats {
  /** Days in a row with at least one difficulty solved (revealing doesn't count) */
  streak: number;
  /** The last day anything was solved, as YYYY-MM-DD */
  lastDate: string | null;
  /** Per difficulty: best time, and the day's first solve (later replays after Reset don't count) */
  times: Record<string, { best: number | null; lastDate: string; lastSeconds: number | null }>;
}

export interface SolveResult {
  streak: number;
  /** Best time before this solve */
  previousBest: number | null;
  newBest: boolean;
  /** The time for the same difficulty yesterday, if it was solved */
  yesterday: number | null;
  /** Already solved today (a replay after Reset), so the times weren't changed */
  repeat: boolean;
}

const statsKey = (slug: string) => `stats:${slug}`;

function read(slug: string): PuzzleStats {
  try {
    const raw = localStorage.getItem(statsKey(slug));
    if (raw) return JSON.parse(raw) as PuzzleStats;
  } catch {}
  return { streak: 0, lastDate: null, times: {} };
}

function write(slug: string, stats: PuzzleStats) {
  try {
    localStorage.setItem(statsKey(slug), JSON.stringify(stats));
  } catch {}
}

/** The day before a YYYY-MM-DD date. */
function dayBefore(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d - 1));
}

/** The streak as it stands today: still alive if the last solve was today or yesterday. */
export function currentStreak(slug: string, today = localDateKey()) {
  const { streak, lastDate } = read(slug);
  return lastDate === today || lastDate === dayBefore(today) ? streak : 0;
}

/** Records a solve (with its time in seconds, or null for puzzles without a timer). */
export function recordSolve(slug: string, difficulty: string, seconds: number | null, today = localDateKey()): SolveResult {
  const stats = read(slug);
  if (stats.lastDate !== today) {
    stats.streak = stats.lastDate === dayBefore(today) ? stats.streak + 1 : 1;
    stats.lastDate = today;
  }

  const times = stats.times[difficulty];
  const repeat = times?.lastDate === today;
  const previousBest = times?.best ?? null;
  const yesterday = times?.lastDate === dayBefore(today) ? times.lastSeconds : null;
  const newBest = !repeat && seconds !== null && previousBest !== null && seconds < previousBest;
  if (!repeat) {
    const best = seconds === null ? previousBest : previousBest === null ? seconds : Math.min(previousBest, seconds);
    stats.times[difficulty] = { best, lastDate: today, lastSeconds: seconds };
  }

  write(slug, stats);
  return { streak: stats.streak, previousBest, newBest, yesterday, repeat };
}
