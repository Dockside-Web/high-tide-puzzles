import type { SvgComponent } from "astro/types";

export type PuzzleColor = "ocean" | "coral" | "sun" | "seafoam";

export interface Difficulty {
  id: string;
  label: string;
}

/** Which toolbar buttons to show under the board. Leave the whole toolbar out to hide it. */
export interface PuzzleToolbarConfig {
  undo?: boolean;
  redo?: boolean;
  erase?: boolean;
  hint?: boolean;
  reset?: boolean;
}

/**
 * Everything the shared puzzle wrapper (PuzzleLayout) needs to know about a puzzle.
 * Optional features are off unless noted.
 */
export interface PuzzleConfig {
  slug: string;
  name: string;
  component: any; // Astro component type reference
  /** An imported .svg file, drawn inline (so it never gets stuck in the browser cache) */
  icon: SvgComponent;
  color: PuzzleColor;
  instructions: string;

  /** Difficulty tabs. Leave empty / out to hide the tabs. */
  difficulties?: Difficulty[];
  /** Show the Daily / Plus toggle. */
  plusMode?: boolean;
  /** Show the timer and pause overlay. Defaults to on. */
  timer?: boolean;
  /** Show the settings button. Defaults to on. */
  settings?: boolean;
  toolbar?: PuzzleToolbarConfig;

  isNew?: boolean;
}

/** Inline style that tints an element (and everything inside it) with a puzzle's color. */
export function puzzleColorStyle(color: PuzzleColor) {
  return `--puzzle: var(--${color}); --puzzle-strong: var(--${color}-strong);`;
}
