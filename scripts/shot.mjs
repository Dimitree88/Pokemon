// Screenshot di una carta dal dev server, a zoom 100% (nativo), per confronto/allineamento.
// Uso: node scripts/shot.mjs <cardId> [outPath]
//   es: node scripts/shot.mjs base1-5 .shots/base1-5.png

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const id = process.argv[2];
if (!id) { console.error("manca <cardId>"); process.exit(1); }
const out = path.resolve(ROOT, process.argv[3] || `.shots/${id}.png`);
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/card/${id}`, { waitUntil: "networkidle" });
// zoom 100% = scala nativa (1px CSS = 1px carta)
await page.evaluate(() => document.documentElement.style.setProperty("--card-scale", "1"));
// opzionale: sostituisci lo sfondo (4° arg, es. /backgrounds/C.png) per una vista realistica
// senza la reference dietro.
const bgOverride = process.argv[4];
if (bgOverride) {
  await page.evaluate((bg) => {
    document.querySelector(".card")?.style.setProperty("--bg", `url('${bg}')`);
  }, bgOverride);
}
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250);
await mkdir(path.dirname(out), { recursive: true });
const box = page.locator(".card-box");
await box.screenshot({ path: out });
const bb = await box.boundingBox();
console.log(`✓ ${out}  (${Math.round(bb.width)}×${Math.round(bb.height)})`);
await browser.close();
