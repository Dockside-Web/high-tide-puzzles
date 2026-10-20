import type { PuzzleConfig } from "../types";
import Bridges from "./Bridges.astro";
import icon from "./bridges.svg";

const config: PuzzleConfig = {
  slug: "bridges",
  name: "Bridges",
  component: Bridges,
  icon,
  color: "ocean",
  tagline: "Connect the islands with bridges.",
  instructions:
    "Connect the islands with bridges. Each number says how many bridges touch that island. Bridges run straight across or down, never cross, and at most two can join the same pair of islands. Tap two islands in a line to build a bridge, or tap the gap between them. Tap again for a second bridge, and once more to remove them.",
  toolbar: {
    undo: true,
    reset: true
  },
  isNew: true
};

export default config;
