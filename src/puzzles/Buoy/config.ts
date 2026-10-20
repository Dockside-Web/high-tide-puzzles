import type { PuzzleConfig } from "../types";
import Buoy from "./Buoy.astro";
import icon from "./buoy.svg";

const config: PuzzleConfig = {
  slug: "buoy",
  name: "Buoy",
  component: Buoy,
  icon,
  color: "coral",
  tagline: "Match every row, column and region count.",
  instructions: "This is Buoy, shown for demonstration purposes.",
  toolbar: {
    undo: true,
    hint: true,
    reset: true
  }
};

export default config;
