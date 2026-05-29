// Funzione serverless Vercel: rende la pagina di anteprima (menu + carta).
// Tutte le richieste sono instradate qui via i rewrites in vercel.json; gli asset
// (font, css, simboli set, arte) sono serviti staticamente da Vercel ai loro path
// reali (/src/card.css, /assets/...), quindi il bundle della funzione resta minimo.
//
// La logica vive in src/preview.mjs (condivisa col dev server). Qui niente hot-reload
// né live-reload: import statico (fresh:false) e nessun EventSource.

import { renderPage, firstCardId } from "../src/preview.mjs";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://vercel.local");
    const cardId = url.searchParams.get("card") || firstCardId;
    const scale = Math.max(0.1, parseFloat(url.searchParams.get("scale")) || 1);
    const html = await renderPage(cardId, scale, { liveReload: false, fresh: false });
    if (html == null) {
      res.statusCode = 404;
      res.end(`carta non trovata: ${cardId}`);
      return;
    }
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "public, max-age=0, s-maxage=86400");
    res.end(html);
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e && e.stack ? e.stack : e));
  }
}
