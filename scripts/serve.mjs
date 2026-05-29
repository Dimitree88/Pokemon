// Dev server con anteprima live e auto-reload per iterare sulla carta.
// Uso: node scripts/serve.mjs   ->   http://localhost:5173/?card=base1-4
//
// La logica di rendering (indice, menu, pagina) sta in src/preview.mjs, condivisa
// con la funzione serverless Vercel (api/index.mjs). Qui aggiungiamo solo: serve
// degli asset, watcher su src/ e assets/, e live-reload via SSE.
// Si aggiornano DA SOLI (senza riavviare) modificando: src/card.css, src/card-template.mjs,
// src/fonts.mjs e gli asset in assets/. L'UNICO file che richiede il riavvio è questo (serve.mjs).

import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, watch } from "node:fs";
import path from "node:path";
import { renderPage, firstCardId, cardIndex } from "../src/preview.mjs";

const ROOT = process.cwd();
const PORT = 5173;

// Nel dev server gli asset sono serviti da qui (così modificarli ricarica la pagina).
const DEV_ASSETS = { cssHref: "/card.css", fontsBase: "/fonts", setsBase: "/sets", artBase: "/art" };

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
    const cardId = url.searchParams.get("card") || firstCardId;
    const scale = Math.max(0.1, parseFloat(url.searchParams.get("scale")) || 1);
    const html = await renderPage(cardId, scale, { liveReload: true, fresh: true, assets: DEV_ASSETS });
    if (html == null) { res.writeHead(404).end(`carta non trovata: ${cardId}`); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Anteprima:  http://localhost:${PORT}/?card=${firstCardId}`);
  console.log(`  ${cardIndex.length} carte disponibili. Ctrl+C per fermare.\n`);
});
