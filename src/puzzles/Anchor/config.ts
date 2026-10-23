import type { PuzzleConfig } from "../types";
import AnchorBoard from "./AnchorBoard.astro";
import AnchorHelp from "./AnchorHelp.astro";
import { ANCHOR_SETS } from "./sets";

/**
 * The full config for an Anchor game from just what makes it different. The board, rules, color,
 * toolbar and "How to play" are the same for both; the wording follows the game's set (sets.ts).
 */
export function anchorConfig(game: Pick<PuzzleConfig, "slug" | "name" | "icon" | "tagline">): PuzzleConfig {
  const { tile, makes } = ANCHOR_SETS[game.slug];
  return {
    ...game,
    component: AnchorBoard,
    color: "sun",
    instructions: `Arrange the ${tile}s so every line, read top to bottom, makes a common ${makes}. Tap a line to link a pair you’re sure of. You get 3 checks, then a final check.`,
    helpExamples: AnchorHelp,
    // Check isn't here: it's a button of its own under the board (see AnchorBoard.astro)
    toolbar: {
      undo: true,
      hint: true,
      reveal: true,
      reset: true
    },
    isNew: true
  };
}
