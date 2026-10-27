// Anchor Links: every line joins two pieces into one word, read top to bottom ("HAP" + "PEN" = "HAPPEN").
// The board, rules and puzzle maker are shared with Anchor Chain (see ../Anchor).
//
// The pair list (words.txt, one pair per line: "CAR BON") is made by scripts/build-anchor-links.ts
// (npm run build:anchor-links), which writes over it: change the rules there rather than editing it.
//
// The words come from SCOWL. Copyright 2000-2016 by Kevin Atkinson. Permission to use, copy, modify,
// distribute and sell these word lists, the associated scripts, the output created from the scripts,
// and its documentation for any purpose is hereby granted without fee, provided that the above
// copyright notice appears in all copies and that both that copyright notice and this permission
// notice appear in supporting documentation. Kevin Atkinson makes no representations about the
// suitability of this array for any purpose. It is provided "as is" without express or implied warranty.

import type { AnchorSet } from "../Anchor/anchor.ts";
import pairs from "./words.txt?raw";

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
  pairs,
};
