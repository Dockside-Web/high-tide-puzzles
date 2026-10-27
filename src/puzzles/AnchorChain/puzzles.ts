// Anchor Chain: every line is a two-word phrase, read top to bottom ("ICE CREAM"). Open compounds
// only: two words written apart, not ones usually written as one ("FIREWORK") or hyphenated.
// The board, rules and puzzle maker are shared with Anchor Links (see ../Anchor).
//
// The phrases are in phrases.txt, one per line ("ICE CREAM"), written by hand: add or remove lines
// there. Every word is 6 letters or fewer, and the pre-deploy check (npm run check:puzzles) catches
// typos and reports how often phrases come back within a month.

import type { AnchorSet } from "../Anchor/anchor.ts";
import pairs from "./phrases.txt?raw";

export const ANCHOR_CHAIN: AnchorSet = {
  join: " ",
  tile: "word",
  makes: "phrase",
  examples: [
    { ok: true, caption: "Upper word first: “ice cream”", top: "ICE", below: [{ word: "CREAM", ok: true }] },
    { ok: false, caption: "Upside down: “cream ice”", top: "CREAM", below: [{ word: "ICE", ok: false }] },
    {
      ok: true,
      caption: "Both words below pair with it",
      top: "CREAM",
      below: [{ word: "CHEESE", ok: true }, { word: "SODA", ok: true }],
    },
    {
      ok: false,
      caption: "One pair isn’t a phrase",
      top: "CREAM",
      below: [{ word: "CHEESE", ok: true }, { word: "DOG", ok: false }],
    },
  ],
  pairs,
};
