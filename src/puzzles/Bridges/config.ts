import type { PuzzleConfig } from "../types";
import Bridges from "./Bridges.astro";
import icon from "./bridges.svg";
import BridgesHelp from "./BridgesHelp.astro";

const config: PuzzleConfig = {
  slug: "bridges",
  name: "Bridges",
  component: Bridges,
  icon,
  color: "ocean",
  tagline: "Connect the islands with bridges.",
  instructions:
    "Connect the islands with bridges. Each number says how many bridges touch that island. Bridges run straight across or down, never cross, and at most two can join the same pair of islands. Every island has to end up joined into one group. Easy is a smaller board; Hard is bigger, with more islands. Tap two islands in a line to build a bridge, or tap the gap between them. Tap again for a second bridge, and once more to remove them. With a keyboard, use the arrow keys to move between islands and Shift with an arrow to build a bridge that way.",
  helpExamples: BridgesHelp,
  difficulties: [
    { id: "easy", label: "Easy" },
    { id: "hard", label: "Hard" }
  ],
  toolbar: {
    undo: true,
    hint: true,
    reveal: true,
    reset: true
  },
  isNew: true
};

export default config;
