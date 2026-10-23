import type { PuzzleConfig } from "../types";
import SeaGlass from "./SeaGlass.astro";
import icon from "./sea-glass.svg";
import SeaGlassHelp from "./SeaGlassHelp.astro";

const config: PuzzleConfig = {
  slug: "sea-glass",
  name: "Sea Glass",
  component: SeaGlass,
  icon,
  color: "seafoam",
  tagline: "Fit the tiles so every edge matches.",
  instructions:
    "Drag the tiles onto the board so touching edges match and the outside edge is black. Drop a tile on another to swap them.",
  helpExamples: SeaGlassHelp,
  difficulties: [
    { id: "easy", label: "Easy" },
    { id: "hard", label: "Hard" }
  ],
  toolbar: {
    reveal: true,
    reset: true
  },
  isNew: true
};

export default config;
