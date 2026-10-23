// Which game each Anchor page plays, by its slug (the board reads it off the page).

import type { AnchorSet } from "./anchor.ts";
import { ANCHOR_CHAIN } from "../AnchorChain/puzzles.ts";
import { ANCHOR_LINKS } from "../AnchorLinks/puzzles.ts";

export const ANCHOR_SETS: Record<string, AnchorSet> = {
  "anchor-chain": ANCHOR_CHAIN,
  "anchor-links": ANCHOR_LINKS,
};
