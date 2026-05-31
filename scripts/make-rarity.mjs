// Genera i 3 simboli rarità come PNG ad alta risoluzione, rasterizzando i glifi del font
// EssentiarumTCG (cifre "1"=● comune, "2"=◆ non comune, "3"=★ rara, stile "Old") con
// Playwright (Chromium) + sharp. I glifi sono resi NERI su sfondo trasparente; nel
// rendering vengono usati come MASK CSS, quindi il colore lo decide il `background-color`
// (scuro sulla carta, grigio nel menu) — un solo PNG per tier serve entrambi i contesti.
//
// Uso: node scripts/make-rarity.mjs   (one-shot: i PNG finiscono in public/rarity/)

import { chromium } from "playwright";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "rarity");
const FONT = path.join(ROOT, "assets", "fonts-all", "EssentiarumTCG.ttf");
const GLYPHS = { common: "1", uncommon: "2", rare: "3" };
const FONT_PX = 700;     // dimensione di rendering del glifo
const VIEW = 1900;       // viewport quadrato: deve contenere TUTTO il glifo (ink > line-box)
const SCALE = 3;         // deviceScaleFactor → alta risoluzione
const PAD = 24;          // margine trasparente attorno al glifo ritagliato (px @SCALE)

async function fontDataUri() {
  // fallback: se il font non è in assets/fonts-all, prova public/fonts
  for (const p of [FONT, path.join(ROOT, "public", "fonts", "EssentiarumTCG.ttf")]) {
    try { return `data:font/ttf;base64,${(await readFile(p)).toString("base64")}`; } catch {}
  }
  throw new Error("EssentiarumTCG.ttf non trovato (assets/fonts-all o public/fonts)");
}

async function main() {
  const src = await fontDataUri();
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: E; src: url(${src}) format('truetype'); }
    * { margin: 0; padding: 0; }
    html, body { background: transparent; }
    body { width: ${VIEW}px; height: ${VIEW}px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    #g { font-family: E; font-size: ${FONT_PX}px; line-height: 1; color: #000; }
  </style></head><body><span id="g"></span></body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: VIEW, height: VIEW },
    deviceScaleFactor: SCALE,
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  await mkdir(OUT, { recursive: true });
  for (const [tier, ch] of Object.entries(GLYPHS)) {
    await page.evaluate((c) => { document.getElementById("g").textContent = c; }, ch);
    await page.evaluate(() => document.fonts.ready);
    // Screenshot dell'intero viewport (il glifo è centrato e interamente contenuto) → niente clip.
    const shot = await page.screenshot({ omitBackground: true });
    // ritaglio tight sull'inchiostro + piccolo margine trasparente uniforme
    const tight = await sharp(shot).trim().toBuffer();
    const { width, height } = await sharp(tight).metadata();
    await sharp(tight)
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(OUT, `${tier}.png`));
    console.log(`• ${tier}.png  (${width}×${height} + ${PAD}px pad)`);
  }
  await browser.close();
  console.log(`✓ 3 simboli rarità scritti in public/rarity/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
