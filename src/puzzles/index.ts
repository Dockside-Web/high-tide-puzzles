import type { PuzzleConfig } from "./types";

// Each puzzle lives in its own folder with its component, icon and config.
// To add a puzzle: create the folder, then add its config here.
import buoy from "./Buoy/config";
import anchorChain from "./AnchorChain/config";
import anchorLinks from "./AnchorLinks/config";
import seaGlass from "./SeaGlass/config";
import bridges from "./Bridges/config";

export const PUZZLE_LIST: PuzzleConfig[] = [buoy, anchorChain, anchorLinks, seaGlass, bridges];

export const PUZZLES: Record<string, PuzzleConfig> = Object.fromEntries(
  PUZZLE_LIST.map((puzzle) => [puzzle.slug, puzzle])
);
