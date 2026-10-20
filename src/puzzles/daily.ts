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
