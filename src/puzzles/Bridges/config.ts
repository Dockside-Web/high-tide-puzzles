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
    "Join every island into one group. Each number is how many bridges touch that island. Tap two islands to build a bridge, again for a second, again to remove.",
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
