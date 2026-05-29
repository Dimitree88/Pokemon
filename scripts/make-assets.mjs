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

// Simboli energia resi col font EssentiarumTCG (stile "Old", lettere MAIUSCOLE):
// la `o` minuscola è il cerchio di sfondo, la lettera del tipo (G/R/W/L/P/F/C/D/M)
// è l'icona; si sovrappongono allo stesso centro. Vedi memoria essentiarum-tcg-glyph-map.
// Il @font-face EssentiarumTCG è iniettato dal documento (src/fonts.mjs), così
// l'SVG inline usa il font del documento sia nel render PNG che nel dev server.
// Geometria misurata dei glifi EssentiarumTCG a font-size 100, penna in (0,0)
// (vedi scripts/inspect-font.mjs / getBBox): `o` (cerchio, advance 0) e le lettere
// tipo condividono lo stesso centro-inchiostro ~(57.5, -37.5). Le lettere sono più
// alte del cerchio (h159 vs 116): inquadriamo l'intero inchiostro in un viewBox
// quadrato centrato, così nulla viene tagliato.
const TEXT_ATTRS = 'x="0" y="0" font-family="EssentiarumTCG" font-size="100"';
const VIEWBOX = "-30 -125 175 175"; // quadrato centrato su (57.5,-37.5), lato 175

function energySvg(code) {
  const { color, glyphFill } = ENERGY[code];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">
  <text ${TEXT_ATTRS} fill="${color}" stroke="#3a3320" stroke-width="5" style="paint-order:stroke">o</text>
  <text ${TEXT_ATTRS} fill="${glyphFill}">${code}</text>
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
