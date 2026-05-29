// Genera uno specimen PNG di un font: una griglia con ogni carattere e la sua
// resa col font dato. Serve a capire quale simbolo produce ogni carattere.
// Uso: node scripts/font-specimen.mjs "<font.ttf>" out/specimen.png

import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const fontFile = process.argv[2];
const outFile = process.argv[3] || path.join(ROOT, "out", "font-specimen.png");

const buf = await readFile(fontFile);
const dataUrl = `data:font/ttf;base64,${buf.toString("base64")}`;

// caratteri da mostrare: ASCII stampabile + PUA E021..E025
const chars = [];
for (let c = 0x30; c <= 0x39; c++) chars.push(c);          // 0-9
for (let c = 0x41; c <= 0x5a; c++) chars.push(c);          // A-Z
for (let c = 0x61; c <= 0x7a; c++) chars.push(c);          // a-z
for (const c of [0x2b, 0x2c, 0x2e]) chars.push(c);         // + , .
for (let c = 0xe021; c <= 0xe025; c++) chars.push(c);      // PUA

const cells = chars.map((cp) => {
  const ch = String.fromCodePoint(cp);
  const hex = "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  const lbl = cp < 0x7f ? `'${ch}' ${hex}` : hex;
  return `<div class="cell">
    <div class="glyph">${ch === "<" ? "&lt;" : ch === "&" ? "&amp;" : ch}</div>
    <div class="lbl">${lbl}</div>
  </div>`;
}).join("");

// seconda riga: cerchio (o minuscola) + lettera tipo sovrapposta, per i tipi
const TYPES = ["G", "R", "W", "L", "P", "F", "C", "D", "M"];
const circled = TYPES.map((t) =>
  `<div class="cell">
     <div class="glyph stack"><span>o</span><span>${t}</span></div>
     <div class="lbl">o+${t}</div>
   </div>`).join("");

const html = `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family:"Spec"; src:url('${dataUrl}'); }
  body { margin:0; background:#fff; font-family:sans-serif; }
  .wrap { padding:24px; }
  h2 { font:600 16px sans-serif; margin:18px 0 8px; }
  .grid { display:grid; grid-template-columns:repeat(13, 72px); gap:6px; }
  .cell { border:1px solid #ddd; border-radius:6px; padding:6px 0 4px;
    display:flex; flex-direction:column; align-items:center; }
  .glyph { font-family:"Spec"; font-size:40px; line-height:1; height:46px;
    display:flex; align-items:center; justify-content:center; color:#111; }
  .glyph.stack { position:relative; width:46px; }
  .glyph.stack span { position:absolute; left:0; right:0; text-align:center; }
  .glyph.stack span:first-child { color:#c00; }   /* cerchio */
  .glyph.stack span:last-child  { color:#000; }   /* lettera tipo */
  .lbl { font:11px monospace; color:#555; margin-top:4px; }
</style>
<div class="wrap">
  <h2>Tutti i caratteri mappati</h2>
  <div class="grid">${cells}</div>
  <h2>Cerchio (o) + lettera tipo sovrapposti</h2>
  <div class="grid">${circled}</div>
</div>`;

await mkdir(path.dirname(outFile), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 800 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
const el = await page.$(".wrap");
await el.screenshot({ path: outFile });
await browser.close();
console.log("✓ specimen ->", path.relative(ROOT, outFile));
