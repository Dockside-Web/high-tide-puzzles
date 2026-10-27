// Lets plain Node (the pre-deploy check) import text files the way the site build does:
// `import pairs from "./phrases.txt?raw"` gives the file's contents as a string.
// Loaded first with: node --import ./scripts/text-imports.mjs <script>

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith("?raw")) return nextLoad(url, context);
    const text = readFileSync(new URL(url.slice(0, -"?raw".length)), "utf8");
    return { format: "module", source: `export default ${JSON.stringify(text)};`, shortCircuit: true };
  },
});
