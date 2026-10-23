// Anchor Links: every line joins two pieces into one word, read top to bottom ("HAP" + "PEN" = "HAPPEN").
// The board, rules and everything else are shared with Anchor Chain (see ../Anchor).
//
// TODO: this only holds placeholder pieces for now. Swap in the real list here (or load a schedule
// file); nothing else needs to change. Each day uses the next puzzle in the list.

import type { AnchorSet } from "../Anchor/anchor.ts";

export const ANCHOR_LINKS: AnchorSet = {
  join: "",
  tile: "piece",
  makes: "word",
  examples: [
    { ok: true, caption: "Upper piece first: “happen”", top: "HAP", below: [{ word: "PEN", ok: true }] },
    { ok: false, caption: "Upside down: “penhap”", top: "PEN", below: [{ word: "HAP", ok: false }] },
    {
      ok: true,
      caption: "Both pieces below make a word",
      top: "PEN",
      below: [{ word: "CIL", ok: true }, { word: "GUIN", ok: true }],
    },
    {
      ok: false,
      caption: "One pair isn’t a word",
      top: "PEN",
      below: [{ word: "CIL", ok: true }, { word: "KET", ok: false }],
    },
  ],
  puzzles: [
    {
      // CARBON CARROT / BONUS BONFIRE ROTTEN ROTOR / USAGE USHER FIREMAN FIREWORK TENNIS TENDER ORBIT ORGAN
      words: [
        "CAR",
        "BON", "ROT",
        "US", "FIRE", "TEN", "OR",
        "AGE", "HER", "MAN", "WORK", "NIS", "DER", "BIT", "GAN",
      ],
      alsoAccept: ["MANAGE", "MANOR", "WORKMAN", "TENOR", "ORDER", "BITTEN", "GANDER"],
    },
  ],
};
