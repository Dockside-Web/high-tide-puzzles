import type { PuzzleConfig } from "../types";
import PyramidLinks from "./PyramidLinks.astro";
import icon from "./pyramid-links.svg";

const config: PuzzleConfig = {
  slug: "pyramid-links",
  name: "Pyramid Links",
  component: PyramidLinks,
  icon,
  color: "sun",
  instructions: "This is another test puzzle.",
  difficulties: [
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Hard" }
  ],
  plusMode: true,
  toolbar: {
    hint: false,
    reset: false
  },
  isNew: true
};

export default config;
