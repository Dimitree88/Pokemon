// Dev server con anteprima live e auto-reload per iterare sul CSS della carta.
// Uso: node scripts/serve.mjs   ->   http://localhost:5173/?card=base1-4
//
// - Il CSS (src/card.css) è servito come file separato: modificalo (anche in
//   DevTools) e la pagina si ricarica da sola.
// - Anche le modifiche a src/card-template.mjs vengono ricaricate (import fresh).

import http from "node:http";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 5173;
const CODES = ["G", "R", "W", "L", "P", "F", "C", "D", "M"];

// energia (inline) + indice carte, caricati all'avvio
const energy = {};
for (const c of CODES) energy[c] = await readFile(path.join(ROOT, "assets", "energy", `${c}.svg`), "utf8");
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

async function ensureArt(cardId, setId, number) {
  const dest = path.join(ROOT, "assets", "art", `${cardId}.png`);
  if (!existsSync(dest)) {
    const res = await fetch(`https://images.pokemontcg.io/${setId}/${number}_hires.png`);
    if (!res.ok) return null;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  return dest;
}

const MIME = { ".png": "image/png", ".css": "text/css", ".svg": "image/svg+xml" };
async function serveFile(res, file) {
  if (!existsSync(file)) { res.writeHead(404).end("not found"); return; }
  const body = await readFile(file);
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(body);
}

// ---- live reload (SSE) ----
const clients = new Set();
let timer = null;
watch(path.join(ROOT, "src"), () => {
  clearTimeout(timer);
  timer = setTimeout(() => { for (const c of clients) c.write("data: reload\n\n"); }, 120);
});

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
  .stage { margin-left:288px; min-height:100vh; box-sizing:border-box;
    display:flex; align-items:center; justify-content:center; padding:24px; }`;

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
    ${rows}
  </aside>`;
}

const DEV_JS = `
  const flt=document.getElementById('flt');
  flt.addEventListener('input',()=>{const k=flt.value.toLowerCase();
    document.querySelectorAll('.ci').forEach(a=>{a.style.display=a.dataset.k.includes(k)?'':'none'})});
  const cur=document.getElementById('current'); if(cur) cur.scrollIntoView({block:'center'});
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
    if (p.startsWith("/sets/")) return serveFile(res, path.join(ROOT, "assets", "sets", path.basename(p)));
    if (p.startsWith("/art/")) {
      const id = path.basename(p, ".png");
      const setId = id.split("-").slice(0, -1).join("-");
      const cardFile = path.join(ROOT, "data", "cards", setId, `${id}.json`);
      if (existsSync(cardFile)) {
        const card = JSON.parse(await readFile(cardFile, "utf8"));
        await ensureArt(id, setId, card.number);
      }
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
    const mod = await import(`../src/card-template.mjs?t=${Date.now()}`);
    const ctx = { energy, artUrl: `/art/${cardId}.png`, setSymbolUrl: `/sets/${setId}.png` };
    const html = mod.buildDocument(card, set, ctx, {
      cssHref: "/card.css",
      bodyPrepend: `<style>${DEV_CSS}</style><div class="dev">${sidebar(cardId)}<main class="stage">`,
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
