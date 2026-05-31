// Scarica i simboli dei set da pokemontcg.io in public/sets/<setId>.png (serviti per URL).
//
// NB: gli altri simboli NON sono generati qui:
//  - tipo/energia, sfondi, elementi cornice: PNG pre-generati a parte in public/ (vedi CLAUDE.md);
//  - rarità (●◆★): PNG generati da scripts/make-rarity.mjs (rasterizza il font EssentiarumTCG).
//
// Uso: node scripts/make-assets.mjs

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SETS_DIR = path.join(ROOT, "public", "sets"); // serviti per URL /sets/<id>.png

async function main() {
  await mkdir(SETS_DIR, { recursive: true });

  // simboli set da pokemontcg.io
  const sets = JSON.parse(await readFile(path.join(ROOT, "data", "sets.json"), "utf8"));
  let ok = 0;
  for (const s of sets) {
    const dest = path.join(SETS_DIR, `${s.id}.png`);
    if (existsSync(dest)) { ok++; continue; }
    try {
      const res = await fetch(`https://images.pokemontcg.io/${s.id}/symbol.png`);
      if (!res.ok) { console.warn(`  ! ${s.id}: HTTP ${res.status}`); continue; }
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (e) {
      console.warn(`  ! ${s.id}: ${e.message}`);
    }
  }
  console.log(`• Simboli set scaricati: ${ok}/${sets.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
