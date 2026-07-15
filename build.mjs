// Dev-only inliner: folds src/engine.mjs into team-balancer.html to produce
// the shippable single file. No runtime dependency — this never runs in the
// browser. Delete this and hand-inline if you want literally zero tooling.
//
// Usage: node build.mjs
// Replaces everything between the two markers in team-balancer.html:
//   // <ENGINE>  ... // </ENGINE>

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const HTML = join(root, "team-balancer.html");

const engine = (await readFile(join(root, "src", "engine.mjs"), "utf8"))
  .replace(/^export\s+/gm, ""); // strip ESM exports for inline <script>

const html = await readFile(HTML, "utf8");
const START = "// <ENGINE>";
const END = "// </ENGINE>";
const s = html.indexOf(START);
const e = html.indexOf(END);
if (s === -1 || e === -1) {
  console.error(`Markers "${START}" / "${END}" not found in team-balancer.html`);
  process.exit(1);
}

const next = html.slice(0, s + START.length) + "\n" + engine.trimEnd() + "\n    " + html.slice(e);
await writeFile(HTML, next);
console.log("Inlined src/engine.mjs -> team-balancer.html");
