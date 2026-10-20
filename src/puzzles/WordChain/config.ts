import type { PuzzleConfig } from "../types";
import WordChain from "./WordChain.astro";
import icon from "./word-chain.svg";
import WordChainHelp from "./WordChainHelp.astro";

const config: PuzzleConfig = {
  slug: "word-chain",
  name: "Word Chain",
  component: WordChain,
  icon,
  color: "sun",
  tagline: "Link pairs of words down the pyramid.",
  instructions:
    "Drag the words around the pyramid so every line joins a common phrase. Read each line from top to bottom: the upper word comes first, then the word below it. Every word has to pair with both words underneath it. Tap a line to link two words you're sure of; linked words move together when you drag them. Tap the line again to unlink them. You get 3 checks: each one locks in your correct links (they turn green) and flashes the wrong ones. After that comes the final check, and the whole pyramid has to be right or the game is over.",
  helpExamples: WordChainHelp,
  toolbar: {
    check: true,
    hint: false,
    reset: false
  },
  isNew: true
};

export default config;
