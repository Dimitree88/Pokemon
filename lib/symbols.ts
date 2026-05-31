// Simboli rarità (SVG inline) letti da assets/ lato server.
// I simboli energia/tipo NON sono qui: sono PNG statici serviti da public/energy/<code>.png
// (indirizzati per convenzione dal codice energia, come i simboli set e l'arte).

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Symbols } from "./types";

const ROOT = process.cwd();

let cached: Symbols | null = null;

export function getSymbols(): Symbols {
  if (cached) return cached;
  const rarity: Record<string, string> = {};
  for (const tier of ["common", "uncommon", "rare"]) rarity[tier] = readFileSync(path.join(ROOT, "assets", "rarity", `${tier}.svg`), "utf8");
  cached = { rarity };
  return cached;
}
