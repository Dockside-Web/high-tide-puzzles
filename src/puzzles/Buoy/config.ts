import type { PuzzleConfig } from "../types";
import Buoy from "./Buoy.astro";
import icon from "./buoy.svg";
import BuoyHelp from "./BuoyHelp.astro";

const config: PuzzleConfig = {
  slug: "buoy",
  name: "Buoy",
  component: Buoy,
  icon,
  color: "coral",
  tagline: "Match every row, column and region count.",
  instructions:
    "Place buoys on the board. The numbers along the top and left say how many buoys are in each column and row, and the small number in each region says how many buoys are inside its border. Buoys may touch. On Hard, some row and column numbers are left blank. Tap a cell once to mark it as water, again for a buoy, and again to clear it, or drag to mark several at once. With a keyboard, use the arrow keys to move, Space to change a cell and Delete to clear it.",
  helpExamples: BuoyHelp,
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
