// Simboli energia/rarità (SVG inline) letti da assets/ lato server.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Symbols } from "./types";

const ROOT = process.cwd();
const CODES = ["G", "R", "W", "L", "P", "F", "C", "D", "M"];

let cached: Symbols | null = null;

export function getSymbols(): Symbols {
  if (cached) return cached;
  const energy: Record<string, string> = {};
  const rarity: Record<string, string> = {};
  for (const c of CODES) energy[c] = readFileSync(path.join(ROOT, "assets", "energy", `${c}.svg`), "utf8");
  for (const tier of ["common", "uncommon", "rare"]) rarity[tier] = readFileSync(path.join(ROOT, "assets", "rarity", `${tier}.svg`), "utf8");
  cached = { energy, rarity };
  return cached;
}
