// Genera/scarica gli asset di rendering:
//  - assets/energy/<CODE>.svg  : 9 simboli energia (disco colorato + glifo)
//  - assets/sets/<setId>.png   : simboli set scaricati da pokemontcg.io
//
// Uso: node scripts/make-assets.mjs

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENERGY_DIR = path.join(ROOT, "assets", "energy");
const SETS_DIR = path.join(ROOT, "assets", "sets");

// Colori energia (palette in stile TCG)
const ENERGY = {
  G: { color: "#6CB33F", glyphFill: "#ffffff" }, // Grass
  R: { color: "#E8513A", glyphFill: "#ffffff" }, // Fire
  W: { color: "#3F8FD6", glyphFill: "#ffffff" }, // Water
  L: { color: "#F5C518", glyphFill: "#7a5a00" }, // Lightning
  P: { color: "#9B59B6", glyphFill: "#ffffff" }, // Psychic
  F: { color: "#C8763C", glyphFill: "#ffffff" }, // Fighting
  C: { color: "#E9E3D3", glyphFill: "#8a8276" }, // Colorless
  D: { color: "#3C4651", glyphFill: "#cfd6dd" }, // Darkness
  M: { color: "#9AA3AB", glyphFill: "#ffffff" }, // Metal
};

// Glifi (su viewBox 100x100, disco centrato in 50,50 r=46)
const GLYPH = {
  G: '<path d="M50 24 C72 34 72 64 50 80 C28 64 28 34 50 24 Z"/><path d="M50 30 L50 76" stroke="#6CB33F" stroke-width="4" fill="none"/>',
  R: '<path d="M52 22 C58 38 72 44 62 62 C68 58 68 50 66 48 C74 60 66 80 50 80 C33 80 30 60 43 50 C42 58 47 60 50 56 C43 45 50 33 52 22 Z"/>',
  W: '<path d="M50 24 C50 24 72 52 72 64 A22 22 0 1 1 28 64 C28 52 50 24 50 24 Z"/>',
  L: '<polygon points="57,20 33,55 47,55 41,82 70,44 54,44"/>',
  P: '<circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="9" fill="#9B59B6"/>',
  F: '<path d="M36 44 q14 -16 28 0 l0 18 q-14 14 -28 0 Z"/><rect x="38" y="36" width="6" height="12" rx="3"/><rect x="47" y="33" width="6" height="14" rx="3"/><rect x="56" y="36" width="6" height="12" rx="3"/>',
  C: '<polygon points="50,24 58,42 76,50 58,58 50,76 42,58 24,50 42,42"/>',
  D: '<path d="M62 30 A24 24 0 1 0 62 70 A19 19 0 1 1 62 30 Z"/>',
  M: '<polygon points="50,22 57,38 74,38 60,49 65,66 50,56 35,66 40,49 26,38 43,38"/>',
};

function energySvg(code) {
  const { color, glyphFill } = ENERGY[code];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="46" fill="${color}" stroke="#3a3320" stroke-width="3"/>
  <g fill="${glyphFill}">${GLYPH[code]}</g>
</svg>`;
}

async function main() {
  await mkdir(ENERGY_DIR, { recursive: true });
  await mkdir(SETS_DIR, { recursive: true });

  for (const code of Object.keys(ENERGY)) {
    await writeFile(path.join(ENERGY_DIR, `${code}.svg`), energySvg(code));
  }
  console.log(`• Simboli energia: ${Object.keys(ENERGY).length} SVG scritti`);

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
