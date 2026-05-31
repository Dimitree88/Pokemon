// Genera/scarica gli asset di rendering:
//  - assets/rarity/<tier>.svg  : 3 simboli rarità (cifre EssentiarumTCG)
//  - public/sets/<setId>.png   : simboli set scaricati da pokemontcg.io (serviti per URL)
//
// NB: i simboli tipo/energia NON sono generati qui. Sono PNG pre-generati a parte e
// serviti staticamente da public/energy/<code>.png (vedi CLAUDE.md "Rendering").
//
// Uso: node scripts/make-assets.mjs

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RARITY_DIR = path.join(ROOT, "assets", "rarity");
const SETS_DIR = path.join(ROOT, "public", "sets"); // serviti per URL /sets/<id>.png

const TEXT_ATTRS = 'x="0" y="0" font-family="EssentiarumTCG" font-size="100"';

// Simboli rarità come sulle carte originali: ● comune, ◆ non comune, ★ rara.
// Stesso font EssentiarumTCG: cifre `1`/`2`/`3` (stile "Old"). Monocromatici.
// I glifi cifra sono leggermente più larghi (ink ~124×159): viewBox quadrato
// centrato sul loro inchiostro.
const RARITY = { common: "1", uncommon: "2", rare: "3" };
const RARITY_VIEWBOX = "-25 -125 175 175";

function raritySvg(char) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${RARITY_VIEWBOX}">
  <text ${TEXT_ATTRS} fill="#1c1206">${char}</text>
</svg>`;
}

async function main() {
  await mkdir(RARITY_DIR, { recursive: true });
  await mkdir(SETS_DIR, { recursive: true });

  for (const [tier, char] of Object.entries(RARITY)) {
    await writeFile(path.join(RARITY_DIR, `${tier}.svg`), raritySvg(char));
  }
  console.log(`• Simboli rarità: ${Object.keys(RARITY).length} SVG scritti`);

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
