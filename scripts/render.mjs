// Renderizza una carta in PNG: JSON -> HTML -> screenshot via Playwright.
// Uso: node scripts/render.mjs [cardId]   (default base1-4)

import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildDocument, CARD_W, CARD_H } from "../src/card-template.mjs";
import { fontFaceDataCss } from "../src/fonts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CODES = ["G", "R", "W", "L", "P", "F", "C", "D", "M"];

// I riferimenti file:// vengono bloccati da Chromium con setContent (origine
// about:blank): incorporiamo le immagini come data URI.
async function toDataUrl(file, mime) {
  const buf = await readFile(file);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function loadEnergy() {
  const m = {};
  for (const c of CODES) {
    m[c] = await readFile(path.join(ROOT, "assets", "energy", `${c}.svg`), "utf8");
  }
  return m;
}

async function loadRarity() {
  const m = {};
  for (const tier of ["common", "uncommon", "rare"]) {
    m[tier] = await readFile(path.join(ROOT, "assets", "rarity", `${tier}.svg`), "utf8");
  }
  return m;
}

// L'arte si usa SOLO dal file locale (assets/art/<id>.png), se presente.
// Niente download dal web: le immagini verranno caricate a mano in futuro.
function localArt(cardId) {
  const dest = path.join(ROOT, "assets", "art", `${cardId}.png`);
  return existsSync(dest) ? dest : null;
}

async function main() {
  const cardId = process.argv[2] || "base1-4";
  const scale = Math.max(0.1, parseFloat(process.argv[3]) || 1); // node ... <cardId> [scale]
  const setId = cardId.split("-").slice(0, -1).join("-");

  const card = JSON.parse(await readFile(path.join(ROOT, "data", "cards", setId, `${cardId}.json`), "utf8"));
  const sets = JSON.parse(await readFile(path.join(ROOT, "data", "sets.json"), "utf8"));
  const set = sets.find((s) => s.id === setId);

  const energy = await loadEnergy();
  const rarity = await loadRarity();
  const artPath = localArt(cardId);
  const setSymbolPath = path.join(ROOT, "assets", "sets", `${setId}.png`);

  const ctx = {
    energy,
    rarity,
    artUrl: artPath ? await toDataUrl(artPath, "image/png") : "",
    setSymbolUrl: existsSync(setSymbolPath) ? await toDataUrl(setSymbolPath, "image/png") : "",
    blankUrl: null,
  };

  const cssInline = await readFile(path.join(ROOT, "src", "card.css"), "utf8");
  const html = buildDocument(card, set, ctx, {
    cssInline,
    scale,
    headExtra: `<style>${fontFaceDataCss()}</style>`,
  });

  await mkdir(path.join(ROOT, "out"), { recursive: true });
  const outFile = path.join(ROOT, "out", `${cardId}.png`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: Math.ceil(CARD_W * scale), height: Math.ceil(CARD_H * scale) },
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  const el = await page.$(".card-box");
  await el.screenshot({ path: outFile });
  await browser.close();

  console.log(`✓ ${cardId} -> ${path.relative(ROOT, outFile)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
