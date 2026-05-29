// Dev server con anteprima live e auto-reload per iterare sulla carta.
// Uso: node scripts/serve.mjs   ->   http://localhost:5173/?card=base1-4
//
// Si aggiornano DA SOLI (senza riavviare) modificando: src/card.css, src/card-template.mjs,
// src/fonts.mjs e gli asset in assets/ (simboli energia/rarità rigenerati con `npm run assets`).
// Tutti questi sono letti/importati a ogni richiesta; il watcher su src/ e assets/
// ricarica la pagina via SSE. L'UNICO file che richiede il riavvio è questo (serve.mjs).

import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { existsSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 5173;
const CODES = ["G", "R", "W", "L", "P", "F", "C", "D", "M"];

// Simboli energia + rarità: riletti a ogni richiesta, così rigenerarli (npm run
// assets) si riflette senza riavviare il server.
async function loadSymbols() {
  const energy = {}, rarity = {};
  for (const c of CODES) energy[c] = await readFile(path.join(ROOT, "assets", "energy", `${c}.svg`), "utf8");
  for (const tier of ["common", "uncommon", "rare"]) rarity[tier] = await readFile(path.join(ROOT, "assets", "rarity", `${tier}.svg`), "utf8");
  return { energy, rarity };
}

// indice carte (921 file): costruito una volta all'avvio, è il solo dato "pesante".
const sets = JSON.parse(await readFile(path.join(ROOT, "data", "sets.json"), "utf8"));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function listCards() {
  const out = [];
  for (const s of sets) {
    const dir = path.join(ROOT, "data", "cards", s.id);
    if (!existsSync(dir)) continue;
    for (const f of await readdir(dir)) {
      if (!f.endsWith(".json")) continue;
      const card = JSON.parse(await readFile(path.join(dir, f), "utf8"));
      out.push({ id: card.id, name: card.name, number: card.number, setId: s.id, setName: s.name });
    }
  }
  return out;
}
const cardIndex = await listCards();

const MIME = {
  ".png": "image/png", ".css": "text/css", ".svg": "image/svg+xml",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2",
};
async function serveFile(res, file) {
  if (!existsSync(file)) { res.writeHead(404).end("not found"); return; }
  const body = await readFile(file);
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(body);
}

// ---- live reload (SSE) ----
const clients = new Set();
let timer = null;
const notifyReload = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { for (const c of clients) c.write("data: reload\n\n"); }, 120);
};
// watch su src/ (css, template, font) e assets/ (simboli rigenerati) → reload pagina.
watch(path.join(ROOT, "src"), { recursive: true }, notifyReload);
watch(path.join(ROOT, "assets"), { recursive: true }, notifyReload);

const DEV_CSS = `
  .side { position:fixed; left:0; top:0; width:288px; height:100vh; overflow-y:auto;
    background:#1b1b1b; color:#ddd; font:13px/1.3 sans-serif; border-right:1px solid #000; }
  .side h1 { font-size:13px; padding:12px 12px 8px; position:sticky; top:0; background:#1b1b1b; }
  .side .search { position:sticky; top:36px; background:#1b1b1b; padding:0 12px 8px; }
  .side input { width:100%; padding:6px 8px; background:#333; color:#eee; border:1px solid #555; border-radius:4px; }
  .side .hint { padding:0 12px 8px; color:#777; font-size:11px; }
  .setgrp { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#8a8a8a;
    padding:10px 12px 3px; background:#222; position:sticky; top:74px; }
  .ci { display:flex; gap:6px; align-items:baseline; padding:4px 12px; color:#cfcfcf; text-decoration:none; }
  .ci:hover { background:#2c2c2c; }
  .ci.on { background:#2e7d46; color:#fff; }
  .ci .num { color:#888; min-width:30px; }
  .ci .cid { margin-left:auto; color:#777; font-size:10px; }
  .viewport { margin-left:288px; min-height:100vh; box-sizing:border-box; overflow:auto;
    display:flex; align-items:safe center; justify-content:safe center; padding:24px; }
  .zoom { display:flex; flex-wrap:wrap; gap:4px; align-items:center; padding:0 12px 8px; color:#8a8a8a; font-size:11px; }
  .zoom button { background:#333; color:#ccc; border:1px solid #555; border-radius:4px;
    padding:3px 7px; cursor:pointer; font:11px sans-serif; }
  .zoom button:hover { background:#444; } .zoom button.on { background:#2e7d46; color:#fff; border-color:#2e7d46; }`;

function sidebar(cardId) {
  let rows = "";
  let curSet = null;
  for (const c of cardIndex) {
    if (c.setId !== curSet) {
      curSet = c.setId;
      rows += `<div class="setgrp">${esc(c.setName)}</div>`;
    }
    const on = c.id === cardId ? " on" : "";
    const k = `${c.id} ${c.name}`.toLowerCase();
    rows += `<a class="ci${on}" href="?card=${c.id}" data-k="${esc(k)}" ${on ? 'id="current"' : ""}>` +
      `<span class="num">${esc(c.number)}</span><span>${esc(c.name)}</span><span class="cid">${esc(c.id)}</span></a>`;
  }
  return `<aside class="side">
    <h1>Pokémon Vintage — ${cardIndex.length} carte</h1>
    <div class="search"><input id="flt" placeholder="cerca per nome o id…" autocomplete="off"></div>
    <div class="hint">modifica <code>src/card.css</code> → reload automatico</div>
    <div class="zoom">zoom:
      <button data-z="0.5">50%</button>
      <button data-z="0.75">75%</button>
      <button data-z="1">100%</button>
      <button data-z="1.5">150%</button>
      <button data-z="2">200%</button>
    </div>
    ${rows}
  </aside>`;
}

const DEV_JS = `
  const flt=document.getElementById('flt');
  flt.addEventListener('input',()=>{const k=flt.value.toLowerCase();
    document.querySelectorAll('.ci').forEach(a=>{a.style.display=a.dataset.k.includes(k)?'':'none'})});
  const cur=document.getElementById('current'); if(cur) cur.scrollIntoView({block:'center'});
  // zoom live: un solo --card-scale scala tutta la carta in modo proporzionale
  const box=document.querySelector('.card-box');
  const zb=[...document.querySelectorAll('.zoom button')];
  const setZoom=z=>{box.style.setProperty('--card-scale',z);
    zb.forEach(b=>b.classList.toggle('on', b.dataset.z===String(z)));};
  zb.forEach(b=>b.addEventListener('click',()=>setZoom(b.dataset.z)));
  setZoom((box.style.getPropertyValue('--card-scale')||'1').trim());
  new EventSource('/__livereload').onmessage=()=>location.reload();`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;

    if (p === "/__livereload") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (p === "/card.css") return serveFile(res, path.join(ROOT, "src", "card.css"));
    if (p.startsWith("/fonts/")) {
      const rel = decodeURIComponent(p.slice("/fonts/".length));
      if (rel.includes("..")) { res.writeHead(403).end("forbidden"); return; }
      return serveFile(res, path.join(ROOT, "assets", "fonts", rel));
    }
    if (p.startsWith("/sets/")) return serveFile(res, path.join(ROOT, "assets", "sets", path.basename(p)));
    if (p.startsWith("/art/")) {
      // Solo file locale: nessun download dal web (404 se assente → carta senza arte).
      const id = path.basename(p, ".png");
      return serveFile(res, path.join(ROOT, "assets", "art", `${id}.png`));
    }

    // pagina anteprima
    const cardId = url.searchParams.get("card") || "base1-4";
    const setId = cardId.split("-").slice(0, -1).join("-");
    const cardFile = path.join(ROOT, "data", "cards", setId, `${cardId}.json`);
    if (!existsSync(cardFile)) { res.writeHead(404).end(`carta non trovata: ${cardId}`); return; }
    const card = JSON.parse(await readFile(cardFile, "utf8"));
    const set = sets.find((s) => s.id === setId);

    // import fresh del template (così le modifiche al .mjs si ricaricano)
    // import fresh di template e font + riletta dei simboli: tutto a caldo.
    const mod = await import(`../src/card-template.mjs?t=${Date.now()}`);
    const { fontFaceUrlCss } = await import(`../src/fonts.mjs?t=${Date.now()}`);
    const { energy, rarity } = await loadSymbols();
    const scale = Math.max(0.1, parseFloat(url.searchParams.get("scale")) || 1);
    const hasSetSymbol = existsSync(path.join(ROOT, "assets", "sets", `${setId}.png`));
    const ctx = {
      energy, rarity,
      artUrl: `/art/${cardId}.png`,
      setSymbolUrl: hasSetSymbol ? `/sets/${setId}.png` : "",
    };
    const html = mod.buildDocument(card, set, ctx, {
      cssHref: "/card.css",
      scale,
      headExtra: `<style>${fontFaceUrlCss("/fonts")}</style>`,
      bodyPrepend: `<style>${DEV_CSS}</style><div class="dev">${sidebar(cardId)}<main class="viewport">`,
      bodyAppend: `</main></div><script>${DEV_JS}</script>`,
    });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Anteprima:  http://localhost:${PORT}/?card=base1-4`);
  console.log(`  ${cardIndex.length} carte disponibili. Ctrl+C per fermare.\n`);
});
