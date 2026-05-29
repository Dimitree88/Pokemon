# Pokémon Vintage Cards

Gestione e rendering delle carte Pokémon dell'era vintage WOTC.
Dettagli di dominio e modello dati in [CLAUDE.md](CLAUDE.md).

## Requisiti
- Node.js 18+

## Avvio in locale

```bash
npm install                      # dipendenze
npx playwright install chromium  # browser per il rendering (solo la prima volta)
```

### Anteprima live nel browser
```bash
npm run serve
```
Apri http://localhost:5173/?card=base1-4 — sidebar per scegliere la carta,
live-reload alla modifica di `src/card.css`.

### Esportare una carta in PNG
```bash
npm run render -- base1-4   # output in out/
```

### Rigenerare dati e asset (opzionale)
```bash
npm run dump     # scarica le carte -> data/
npm run assets   # simboli energia + simboli set -> assets/
```
