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
    "Place buoys so every row, column and region holds as many as its number. Tap a cell for water, again for a buoy, again to clear it.",
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
