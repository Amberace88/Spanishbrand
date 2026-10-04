/**
 * STATEMENT art — entry point.
 *
 *   node scripts/statement-art.mjs           # everything
 *   node scripts/statement-art.mjs brocha    # only pieces whose name contains "brocha"
 *
 * Kit (output, motifs): scripts/statement-kit.mjs · engine: scripts/statement-lib.mjs ·
 * pieces: scripts/statement-pieces.mjs · designs: src/lib/catalog/statement.ts.
 */
import { readFile, writeFile } from "node:fs/promises";
import { loadLion, placement, manifestAdds, LOG, MANIFEST, PLACEMENT } from "./statement-kit.mjs";
import { pieces } from "./statement-pieces.mjs";

await loadLion();
await pieces();

// placement + manifest (merge: keep entries of pieces not re-rendered)
const prevPlace = JSON.parse(await readFile(PLACEMENT, "utf8").catch(() => "{}"));
await writeFile(PLACEMENT, JSON.stringify(Object.fromEntries(Object.entries({ ...prevPlace, ...placement }).sort(([a], [b]) => a.localeCompare(b))), null, 1) + "\n");
const man = JSON.parse(await readFile(MANIFEST, "utf8"));
await writeFile(MANIFEST, JSON.stringify({ ...man, ...manifestAdds }, null, 2) + "\n");
console.log(LOG.join("\n"));
console.log(`${LOG.length} pieces`);
