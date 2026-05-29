# Pokémon Vintage Cards

App per la gestione e il rendering delle carte Pokémon dell'era **vintage WOTC**
(set pubblicati prima di Expedition). Dominio, modello dati e dettagli di rendering:
vedi [CLAUDE.md](CLAUDE.md).

## Stack
**Next.js** (App Router) · **TypeScript** · **Tailwind** · deploy su **Vercel**.

## Requisiti
- Node.js 18+

## Sviluppo
```bash
npm install
npm run dev          # http://localhost:3000
```
Browser delle carte: menu laterale (set collassabili, ricerca per nome/numero/tipo,
slider zoom) e anteprima della carta su `/card/<id>`.

## Build / produzione
```bash
npm run build
npm run start
```
Su Vercel non serve configurazione: il framework Next.js viene rilevato in automatico.

## Dati e asset (rigenerazione opzionale)
```bash
npm run dump     # scarica le carte Pokémon dei set in scope  -> data/
npm run assets   # genera simboli energia/rarità e scarica i simboli set -> assets/
```

## Struttura
- **`app/`** — route (`layout`, home, `card/[id]`) e stili (`globals.css`, `card.css`)
- **`components/Sidebar.tsx`** — menu laterale (client)
- **`lib/`** — dati (`data.ts`), simboli (`symbols.ts`), rendering carta
  (`card-render.tsx`), utility (`card-utils.ts`), tipi (`types.ts`)
- **`data/`** — set (`sets.json`) e carte (un JSON per carta)
- **`public/`** — asset statici serviti: `fonts/`, `sets/`
- **`assets/`** — simboli `energy/`, `rarity/`, `sets/`; `fonts-all/` (archivio font, escluso dal deploy)
- **`scripts/`** — `dump.mjs`, `make-assets.mjs`, `inspect-font.mjs`
