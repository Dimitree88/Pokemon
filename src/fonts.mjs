// Definizione dei font reali (era vintage WOTC) e generazione dei @font-face.
// card.css referenzia le famiglie per nome; i @font-face vengono iniettati:
//  - come data URI nel render PNG (Playwright + setContent: niente file://)
//  - come URL serviti da /fonts nel dev server.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// family -> file (relativo a assets/fonts). Mappatura secondo l'articolo pokemonaaah.
// `assets/fonts/` contiene SOLO i font usati, con nomi web-safe (niente spazi/parentesi
// che rompono il routing statico su Vercel) → vengono deployati. La collezione completa
// (anche i font non usati) sta in `assets/fonts-all/`, esclusa dal deploy via .vercelignore.
// Questi 6 file sono usati da dev server, render PNG e produzione.
export const FONTS = [
  { family: "GillSans",   file: "GillSans.ttf" },               // testo attacchi/poteri, danni, resto
  { family: "GillSansCB", file: "GillSansCondensedBold.ttf" },  // nomi, poteri, attacchi
  { family: "GillSansBI", file: "GillSansBoldItalic.ttf" },     // info bar, evolves from, flavor
  { family: "Futura",     file: "FuturaHeavy.ttf" },            // HP
  { family: "FuturaI",    file: "FuturaHeavyItalic.ttf" },      // illustratore, numero
  { family: "EssentiarumTCG", file: "EssentiarumTCG.ttf" },     // simboli energia/rarità
];

const face = (family, src) =>
  `@font-face{font-family:'${family}';font-weight:normal;font-style:normal;` +
  `src:url('${src}') format('truetype');}`;

// @font-face con font incorporati (data URI) — per il render headless
export function fontFaceDataCss() {
  return FONTS.map((f) => {
    const b64 = readFileSync(path.join(ROOT, "assets", "fonts", f.file)).toString("base64");
    return face(f.family, `data:font/ttf;base64,${b64}`);
  }).join("\n");
}

// @font-face che puntano agli URL serviti dal dev server (/fonts/<path>)
export function fontFaceUrlCss(base = "/fonts") {
  return FONTS.map((f) => {
    const url = `${base}/${f.file.split("/").map(encodeURIComponent).join("/")}`;
    return face(f.family, url);
  }).join("\n");
}
