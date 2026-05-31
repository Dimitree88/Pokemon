// Misura la geometria NATIVA finale degli elementi dopo aver applicato un JSON di tuning
// (translate/scale come il Tuner). Serve a bakeare i valori in CSS esatto.
// Uso: node scripts/measure.mjs <cardId> <tune.json>

import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const id = process.argv[2];
const tunePath = path.resolve(ROOT, process.argv[3] || ".shots/tune.json");
const BASE = process.env.BASE_URL || "http://localhost:3000";

// key → selector (allineato a components/Tuner.tsx)
const SEL = {
  toprow: ".toprow", name: ".name", nameEvo: ".name--evo", hp: ".hp", type: ".type-ico",
  evolbar: ".evolbar", evolbarThumb: ".evolbar-thumb", evolbarText: ".evolbar-text",
  art: ".art", speciesBar: ".species", speciesText: ".species-text", setico: ".setico",
  body: ".body", atkcost: ".atk-cost", atkname: ".atk-name", atktext: ".atk-text", atkdmg: ".atk-dmg", atksep: ".atk-sep",
  powername: ".power-tag, .power-name", powertext: ".power-text",
  wrrsep: ".wrr-sep",
  weakLabel: ".wrr-weak .wrr-label", weakSym: ".wrr-weak .wrr-val",
  resLabel: ".wrr-res .wrr-label", resSym: ".wrr-res .wrr-val", resVal: ".wrr-x",
  retLabel: ".wrr-ret .wrr-label", retSym: ".wrr-ret .wrr-val",
  flavor: ".flavor", flavortext: ".flavor-text, .flavor-meta",
  footerIllus: ".footer .illus", footerCopy: ".footer .copy", footerNum: ".footer .cnum", rarity: ".rarity-ico",
};

const tune = JSON.parse(await readFile(tunePath, "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/card/${id}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.documentElement.style.setProperty("--card-scale", "1"));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);

const result = await page.evaluate(({ tune, SEL }) => {
  const card = document.querySelector(".card");
  const cb = card.getBoundingClientRect();
  // applica i transform come il Tuner
  for (const [k, v] of Object.entries(tune)) {
    const sel = SEL[k]; if (!sel) continue;
    document.querySelectorAll(sel).forEach((el) => {
      el.style.translate = `${v.x}px ${v.y}px`;
      el.style.scale = String(v.s);
    });
  }
  // misura la geometria nativa (relativa all'angolo card, scale=1)
  const out = {};
  for (const k of Object.keys(tune)) {
    const el = document.querySelector(SEL[k]); if (!el) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[k] = {
      left: +(r.left - cb.left).toFixed(1), top: +(r.top - cb.top).toFixed(1),
      right: +(r.right - cb.left).toFixed(1), bottom: +(r.bottom - cb.top).toFixed(1),
      width: +r.width.toFixed(1), height: +r.height.toFixed(1),
      fontSize: cs.fontSize,
    };
  }
  return out;
}, { tune, SEL });

console.log(JSON.stringify(result, null, 2));
await browser.close();
