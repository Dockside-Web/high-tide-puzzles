import type { PuzzleConfig } from "../types";
import SeaGlass from "./SeaGlass.astro";
import icon from "./sea-glass.svg";

const config: PuzzleConfig = {
  slug: "sea-glass",
  name: "Sea Glass",
  component: SeaGlass,
  icon,
  color: "seafoam",
  instructions:
    "Drag every tile from the bank onto the board. Touching edges of neighbouring tiles must be the same color, and black edges belong only on the outside border — every outside edge must be black. Tiles can't be rotated. Drop a tile on another to swap them.",
  settings: false,
  toolbar: {
    reset: true
  },
  isNew: true
};

export default config;
