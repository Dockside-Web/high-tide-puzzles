import type { PuzzleConfig } from "../types";
import Buoy from "./Buoy.astro";
import icon from "./buoy.svg";

const config: PuzzleConfig = {
  slug: "buoy-puzzle",
  name: "Buoy Puzzle",
  component: Buoy,
  icon,
  color: "coral",
  instructions: "This is a buoy puzzle for demonstration purposes.",
  difficulties: [
    { id: "easy", label: "Easy" },
    { id: "hard", label: "Hard" }
  ],
  plusMode: true,
  toolbar: {
    undo: true,
    hint: true,
    reset: true
  }
};

export default config;
