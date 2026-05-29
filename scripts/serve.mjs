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
    const cards = [];
    for (const f of await readdir(dir)) {
      if (!f.endsWith(".json")) continue;
      const card = JSON.parse(await readFile(path.join(dir, f), "utf8"));
      cards.push({ id: card.id, name: card.name, number: card.number, type: card.type, rarity: card.rarity, setId: s.id, setName: s.name });
    }
    // ordine numerico nel set (1, 2, 3… non 1, 10, 11) — gestisce anche numeri-stringa promo
    cards.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
    out.push(...cards);
  }
  return out;
}
const cardIndex = await listCards();

// Codice tipo → parole-chiave ricercabili (IT + EN) per la barra di ricerca.
const TYPE_KEYWORDS = {
  G: "grass erba", R: "fire fuoco", W: "water acqua", L: "lightning elettro fulmine",
  P: "psychic psico", F: "fighting lotta combattimento", C: "colorless incolore",
  D: "darkness dark oscurità buio", M: "metal metallo acciaio",
};

// Rarità carta → uno dei 3 simboli (● comune, ◆ non comune, ★ rara). Promo/null: nessun simbolo.
const rarityTier = (r) =>
  !r ? null : r === "Common" ? "common" : r === "Uncommon" ? "uncommon" : r.startsWith("Rare") ? "rare" : null;

// Set con simbolo disponibile in assets/sets/<id>.png (Base non ce l'ha).
const setSymbols = new Set(
  sets.filter((s) => existsSync(path.join(ROOT, "assets", "sets", `${s.id}.png`))).map((s) => s.id)
);

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
  .side .search { position:sticky; top:0; z-index:2; background:#1b1b1b; padding:10px 12px 8px; }
  .side input[type=text] { width:100%; padding:6px 8px; background:#333; color:#eee; border:1px solid #555; border-radius:4px; box-sizing:border-box; }
  .zoom { display:flex; gap:8px; align-items:center; padding:0 12px 8px; color:#8a8a8a; font-size:11px; }
  .zoom input[type=range] { flex:1; accent-color:#2e7d46; }
  .zoom .zval { min-width:38px; text-align:right; color:#ccc; }
  .bulk { padding:0 12px 8px; }
  .bulk button { width:100%; padding:5px 8px; background:#333; color:#ccc; border:1px solid #555;
    border-radius:4px; cursor:pointer; font:11px sans-serif; }
  .bulk button:hover { background:#444; }
  .setgrp { display:flex; align-items:center; gap:6px; font-size:10px; text-transform:uppercase;
    letter-spacing:.5px; color:#8a8a8a; padding:10px 12px 3px; background:#222; cursor:pointer; user-select:none; }
  .setgrp .arrow { display:inline-block; transition:transform .12s; font-size:9px; color:#8a8a8a; }
  .setgrp.open .arrow { transform:rotate(90deg); }
  .setgrp .setsym { width:16px; height:16px; object-fit:contain; flex:none; }
  .setgrp .cnt { margin-left:auto; color:#666; }
  .setcards { display:none; }
  .setcards.open { display:block; }
  .ci { display:flex; gap:6px; align-items:center; padding:4px 12px; color:#cfcfcf; text-decoration:none; }
  .ci:hover { background:#2c2c2c; }
  .ci.on { background:#2e7d46; color:#fff; }
  .ci .num { color:#888; min-width:26px; }
  .ci .nm { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ci .esym { width:15px; height:15px; flex:none; }
  .ci .esym svg { width:100%; height:100%; display:block; }
  .ci .rsym { width:13px; height:13px; flex:none; margin-left:auto; }
  .ci .rsym svg { width:100%; height:100%; display:block; }
  .viewport { margin-left:288px; min-height:100vh; box-sizing:border-box; overflow:auto;
    display:flex; align-items:safe center; justify-content:safe center; padding:24px; }`;

function sidebar(cardId, energy, rarity) {
  // raggruppa le carte per set in blocchi collassabili
  const groups = [];
  for (const c of cardIndex) {
    let g = groups[groups.length - 1];
    if (!g || g.setId !== c.setId) { g = { setId: c.setId, setName: c.setName, cards: [] }; groups.push(g); }
    g.cards.push(c);
  }
  // simbolo rarità: schiarito (#bbb) per essere visibile sullo sfondo scuro del menu.
  const raritySym = (r) => {
    const tier = rarityTier(r);
    return tier ? `<span class="rsym">${rarity[tier].replace(/fill="[^"]*"/g, 'fill="#bbb"')}</span>` : "";
  };
  let rows = "";
  for (const g of groups) {
    let cards = "";
    for (const c of g.cards) {
      const on = c.id === cardId ? " on" : "";
      const sym = energy[c.type] ? `<span class="esym">${energy[c.type]}</span>` : "";
      const k = `${c.name} ${c.number} ${TYPE_KEYWORDS[c.type] || ""}`.toLowerCase();
      cards += `<a class="ci${on}" href="?card=${c.id}" data-k="${esc(k)}" ${on ? 'id="current"' : ""}>` +
        `<span class="num">${esc(c.number)}</span>${sym}<span class="nm">${esc(c.name)}</span>${raritySym(c.rarity)}</a>`;
    }
    const setSym = setSymbols.has(g.setId) ? `<img class="setsym" src="/sets/${g.setId}.png" alt="">` : "";
    // stato apri/chiudi gestito lato client (sessionStorage); il default è collassato
    rows += `<div class="setgrp" data-set="${esc(g.setId)}"><span class="arrow">▶</span>` +
      `${setSym}<span>${esc(g.setName)}</span><span class="cnt">${g.cards.length}</span></div>` +
      `<div class="setcards" data-set="${esc(g.setId)}">${cards}</div>`;
  }
  return `<aside class="side">
    <div class="search"><input type="text" id="flt" placeholder="cerca per nome, numero o tipo…" autocomplete="off"></div>
    <div class="zoom">zoom:
      <input type="range" id="zoom" min="50" max="200" step="25" value="100">
      <span class="zval" id="zval">100%</span>
    </div>
    <div class="bulk"><button type="button" id="toggleAll">Espandi tutti</button></div>
    ${rows}
  </aside>`;
}

const DEV_JS = `
  const heads=[...document.querySelectorAll('.setgrp')];
  const toggleAll=document.getElementById('toggleAll');
  // stato apri/chiudi persistito in sessionStorage: cliccare una carta ricarica la
  // pagina ma il suo set resta aperto. Una visita pulita (/?senza card) resta collassata.
  const KEY='openSets';
  const loadOpen=()=>{try{return new Set(JSON.parse(sessionStorage.getItem(KEY)||'[]'));}catch(e){return new Set();}};
  const saveOpen=s=>sessionStorage.setItem(KEY,JSON.stringify([...s]));
  const apply=()=>{const o=loadOpen();
    heads.forEach(h=>{const on=o.has(h.dataset.set);
      h.classList.toggle('open',on); h.nextElementSibling.classList.toggle('open',on);});
    toggleAll.textContent=(o.size>=heads.length)?'Collassa tutti':'Espandi tutti';};
  // se siamo arrivati a una carta esplicita (?card=…), tieni aperto il suo set
  if(new URLSearchParams(location.search).has('card')){
    const cur=document.getElementById('current');
    if(cur){const o=loadOpen(); o.add(cur.closest('.setcards').dataset.set); saveOpen(o);}
  }
  apply();
  heads.forEach(h=>h.addEventListener('click',()=>{
    const o=loadOpen(), id=h.dataset.set; o.has(id)?o.delete(id):o.add(id); saveOpen(o); apply();
  }));
  toggleAll.addEventListener('click',()=>{
    const expand=loadOpen().size<heads.length; // non tutti aperti → espandi, altrimenti collassa
    saveOpen(new Set(expand?heads.map(h=>h.dataset.set):[])); apply();
  });
  // ricerca per nome/numero/tipo: filtra le carte ed espande solo i set con risultati.
  // È una vista transitoria: non tocca lo stato salvato; svuotando il campo si ripristina.
  const flt=document.getElementById('flt');
  flt.addEventListener('input',()=>{
    const k=flt.value.trim().toLowerCase();
    if(!k){ document.querySelectorAll('.ci').forEach(a=>a.style.display='');
      heads.forEach(h=>h.style.display=''); apply(); return; }
    heads.forEach(h=>{
      const list=h.nextElementSibling; let any=false;
      list.querySelectorAll('.ci').forEach(a=>{
        const m=a.dataset.k.includes(k); a.style.display=m?'':'none'; if(m)any=true;});
      h.style.display=any?'':'none';
      h.classList.toggle('open',any); list.classList.toggle('open',any);
    });
  });
  // zoom live (slider 50–200%, step 25): un solo --card-scale scala tutta la carta.
  const zoom=document.getElementById('zoom'), zval=document.getElementById('zval');
  const applyZoom=()=>{const b=document.querySelector('.card-box');
    if(b) b.style.setProperty('--card-scale',zoom.value/100); zval.textContent=zoom.value+'%';};
  zoom.addEventListener('input',applyZoom);
  const box0=document.querySelector('.card-box');
  const init=Math.round((parseFloat(box0&&box0.style.getPropertyValue('--card-scale'))||1)*100);
  zoom.value=Math.min(200,Math.max(50,init)); applyZoom();
  // Navigazione SENZA reload: cliccando una carta si scarica la pagina e si sostituisce
  // SOLO l'anteprima (.viewport), lasciando il menu intatto → niente flash di collapse/expand.
  const vp=document.querySelector('.viewport');
  async function loadCard(href){
    const html=await (await fetch(href)).text();
    const doc=new DOMParser().parseFromString(html,'text/html');
    const nb=doc.querySelector('.card-box'); if(!nb) return;
    vp.innerHTML=nb.outerHTML; applyZoom();
    document.querySelectorAll('.ci.on').forEach(a=>{a.classList.remove('on');a.removeAttribute('id');});
    const link=[...document.querySelectorAll('.ci')].find(a=>a.getAttribute('href')===href);
    if(link){link.classList.add('on');link.id='current';
      const o=loadOpen();o.add(link.closest('.setcards').dataset.set);saveOpen(o);}
    const t=doc.querySelector('title'); if(t) document.title=t.textContent;
  }
  document.querySelector('.side').addEventListener('click',e=>{
    const a=e.target.closest('a.ci'); if(!a) return;
    e.preventDefault(); const href=a.getAttribute('href');
    history.pushState({},'',href); loadCard(href);
  });
  window.addEventListener('popstate',()=>loadCard(location.pathname+location.search));
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

    // pagina anteprima (default: primissima carta del primissimo set)
    const cardId = url.searchParams.get("card") || cardIndex[0].id;
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
      bodyPrepend: `<style>${DEV_CSS}</style><div class="dev">${sidebar(cardId, energy, rarity)}<main class="viewport">`,
      bodyAppend: `</main></div><script>${DEV_JS}</script>`,
    });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Anteprima:  http://localhost:${PORT}/?card=${cardIndex[0].id}`);
  console.log(`  ${cardIndex.length} carte disponibili. Ctrl+C per fermare.\n`);
});
