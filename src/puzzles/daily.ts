// Shared daily-puzzle helpers. A day's puzzle is never stored anywhere: each generator is fed a
// random number generator seeded with the puzzle's slug, difficulty and the player's local date, so everyone
// whose calendar shows the same day gets the same puzzle, and it changes at their own midnight.

/** The player's local date as "YYYY-MM-DD" (their time zone, not UTC). */
export function localDateKey(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A repeatable random number generator: the same seed always gives the same sequence of numbers
 * in [0, 1), in every browser. (Hash the seed into 32 bits, then run mulberry32.)
 */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let state = (h ^ (h >>> 16)) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The random number generator for one puzzle, at one difficulty, on one day. */
export function dailyRandom(slug: string, difficulty: string, dateKey: string) {
  return seededRandom(`${slug}:${difficulty}:${dateKey}`);
}

// ---------- Making puzzles ahead ----------
// Some generators take a noticeable moment (Hard Buoy can take most of a second on a phone), so
// each day's puzzles are kept once made, and the difficulties not on screen are made ahead of time
// while the page is idle. Switching tabs then just picks up the finished puzzle.

/** Runs `work` when the browser is idle (or soon, where requestIdleCallback is missing). */
const whenIdle = (work: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(work, { timeout: 2000 }) : setTimeout(work, 200);

export function dailyPuzzles<D extends string, P>(
  slug: string,
  difficulties: D[],
  make: (random: () => number, difficulty: D) => P
) {
  const made = new Map<string, P>();
  const key = (difficulty: D, dateKey: string) => `${difficulty}:${dateKey}`;

  return {
    /** True if this puzzle is already made, so getting it is instant. */
    has: (difficulty: D, dateKey: string) => made.has(key(difficulty, dateKey)),

    /** The puzzle for one difficulty on one day, made now if it isn't ready yet. */
    get(difficulty: D, dateKey: string) {
      const k = key(difficulty, dateKey);
      if (!made.has(k)) {
        // Only one day is ever needed; forget the rest
        for (const old of made.keys()) if (!old.endsWith(dateKey)) made.delete(old);
        made.set(k, make(dailyRandom(slug, difficulty, dateKey), difficulty));
      }
      return made.get(k)!;
    },

    /** Makes the day's other difficulties in the background, one per idle moment. */
    prepare(dateKey: string) {
      const next = difficulties.find((d) => !made.has(key(d, dateKey)));
      if (!next) return;
      whenIdle(() => {
        this.get(next, dateKey);
        this.prepare(dateKey);
      });
    },
  };
}

// ---------- Saved progress ----------
// Each day's board is saved in this browser under progress:<slug>:<difficulty>:<date>, so leaving
// or refreshing picks up where the player was. Storage can be blocked or full, so every call is
// allowed to fail quietly; the puzzle still works, it just won't remember.

const PROGRESS_PREFIX = "progress";
const KEEP_DAYS = 2;

function progressKey(slug: string, difficulty: string, dateKey: string) {
  return `${PROGRESS_PREFIX}:${slug}:${difficulty}:${dateKey}`;
}

export function loadProgress<T>(slug: string, difficulty: string, dateKey: string): T | null {
  try {
    const raw = localStorage.getItem(progressKey(slug, difficulty, dateKey));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveProgress(slug: string, difficulty: string, dateKey: string, progress: unknown) {
  try {
    localStorage.setItem(progressKey(slug, difficulty, dateKey), JSON.stringify(progress));
  } catch {}
}

/**
 * Calls back when another tab finishes (solves, reveals or loses) one of this puzzle's boards.
 * A tab left open on the same board would otherwise keep its timer running, and its saves would
 * write over the finished board.
 */
export function onFinishedElsewhere(slug: string, callback: (difficulty: string, dateKey: string) => void) {
  window.addEventListener("storage", (e) => {
    if (!e.key?.startsWith(`${PROGRESS_PREFIX}:${slug}:`) || !e.newValue) return;
    try {
      if (JSON.parse(e.newValue).status === "playing") return;
    } catch {
      return;
    }
    const [, , difficulty, dateKey] = e.key.split(":");
    callback(difficulty, dateKey);
  });
}

/** Drops a puzzle's saved boards from more than a couple of days ago. */
export function forgetOldProgress(slug: string, today = new Date()) {
  const cutoff = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - KEEP_DAYS));
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${PROGRESS_PREFIX}:${slug}:`)) continue;
      const dateKey = key.slice(key.lastIndexOf(":") + 1);
      if (dateKey < cutoff) localStorage.removeItem(key); // YYYY-MM-DD sorts like a date
    }
  } catch {}
}

/**
 * Calls back with the new date key whenever the player's local date changes: at midnight if the
 * page is open, or when they come back to a tab left open from an earlier day.
 */
export function onNewDay(callback: (dateKey: string) => void) {
  let current = localDateKey();

  function check() {
    const key = localDateKey();
    if (key === current) return;
    current = key;
    callback(key);
  }

  // Timers pause while a laptop sleeps, so the visibility/focus checks catch what this misses
  function scheduleMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    setTimeout(() => {
      check();
      scheduleMidnight();
    }, midnight.getTime() - now.getTime() + 500);
  }

  scheduleMidnight();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
  window.addEventListener("focus", check);
}
