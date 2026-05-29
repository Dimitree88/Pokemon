// Accesso ai dati carte/set (lato server). Legge data/ via fs e mantiene in cache
// l'indice (costruito una volta per istanza). I file letti sono inclusi nel bundle
// serverless via outputFileTracingIncludes in next.config.mjs.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { Card, CardSet, CardIndexEntry } from "./types";

const ROOT = process.cwd();

export const sets: CardSet[] = JSON.parse(
  readFileSync(path.join(ROOT, "data", "sets.json"), "utf8")
);

let cachedIndex: CardIndexEntry[] | null = null;

export function getCardIndex(): CardIndexEntry[] {
  if (cachedIndex) return cachedIndex;
  const out: CardIndexEntry[] = [];
  for (const s of sets) {
    const dir = path.join(ROOT, "data", "cards", s.id);
    if (!existsSync(dir)) continue;
    const cards: CardIndexEntry[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const c = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Card;
      cards.push({ id: c.id, name: c.name, number: c.number, type: c.type, rarity: c.rarity, setId: s.id, setName: s.name });
    }
    // ordine numerico nel set (1, 2, 3… non 1, 10, 11) — gestisce anche numeri-stringa promo
    cards.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
    out.push(...cards);
  }
  cachedIndex = out;
  return out;
}

export function firstCardId(): string {
  return getCardIndex()[0].id;
}

export function getCard(id: string): Card | null {
  const setId = id.split("-").slice(0, -1).join("-");
  const file = path.join(ROOT, "data", "cards", setId, `${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as Card;
}

export function getSet(setId: string): CardSet | undefined {
  return sets.find((s) => s.id === setId);
}

// Set con simbolo disponibile (public/sets/<id>.png). Base non ce l'ha.
const setSymbolIds = new Set(
  sets.filter((s) => existsSync(path.join(ROOT, "public", "sets", `${s.id}.png`))).map((s) => s.id)
);
export function setHasSymbol(setId: string): boolean {
  return setSymbolIds.has(setId);
}
