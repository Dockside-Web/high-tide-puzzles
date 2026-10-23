// Anchor Chain: every line is a two-word phrase, read top to bottom ("ICE CREAM").
// The board, rules and everything else are shared with Anchor Links (see ../Anchor).
//
// TODO: this only holds placeholder words for now. Swap in the real word bank here (or load a
// schedule file); nothing else needs to change. Each day uses the next puzzle in the list.

import type { AnchorSet } from "../Anchor/anchor.ts";

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
  puzzles: [
    {
      words: [
        "HOT",
        "DOG", "WATER",
        "HOUSE", "FOOD", "FALL", "PARK",
        "PARTY", "CAT", "TRUCK", "COURT", "GUY", "OUT", "BENCH", "PLACE",
      ],
    },
  ],
};
