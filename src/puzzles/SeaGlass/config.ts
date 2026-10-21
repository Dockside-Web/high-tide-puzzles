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
    "Drag every tile from the bank onto the board. Wherever two tiles touch, the edges must be the same color, and every edge on the outside of the board must be black. Tiles can't be rotated; drop one tile on another to swap them.",
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
