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
    "Move the words around the pyramid so every line joins a common phrase. Read each line from top to bottom: the upper word comes first, then the word below it. Every word has to pair with both words underneath it. Drag a word to move it, or tap it and then tap where it should go. Tap a line to link two words you're sure of; linked words move together. Tap the line again to unlink them. When you're ready, tap Check under the pyramid. You get 3 checks: each one locks in your correct links (they turn green) and undoes the wrong ones, which show as a broken line wherever those two words meet again. After that comes the final check, and the whole pyramid has to be right or the game is over. Stuck? Hint puts one right pair in place but uses up a check. Undo takes back moves and links since your last check, Reveal shows the answer, and Reset starts the puzzle over. With a keyboard, use the arrow keys to move between words, Space to pick a word up and put it down, and Shift with Left, Right or Up to link the word to its neighbor that way.",
  helpExamples: WordChainHelp,
  // Check isn't here: it's a button of its own under the pyramid (see WordChain.astro)
  toolbar: {
    undo: true,
    hint: true,
    reveal: true,
    reset: true
  },
  isNew: true
};

export default config;
