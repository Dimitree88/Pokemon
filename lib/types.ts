// Modello dati delle carte/set, allineato al formato in data/ (vedi CLAUDE.md).

export interface CardSet {
  id: string;
  name: string;
  sigla: string | null;
  releaseDate: string | null;
  printedTotal: number | null;
  layoutFamily: string;
  copyright: string | null;
}

export interface Damage {
  raw: string;
  value: number | null;
  modifier: string | null;
}

export interface Attack {
  name: { en: string };
  cost: string[];
  damage: Damage;
  text: { en: string | null };
}

export interface Power {
  name: { en: string };
  text: { en: string | null };
  color?: string;
}

export interface WeakRes {
  type: string;
  value: string;
}

export interface Card {
  id: string;
  set: string;
  // Override della famiglia di layout per la singola carta (vince sul set). Serve ai
  // promo, che afferiscono a ere diverse in base all'anno di uscita. Assente → eredita il set.
  layoutFamily?: "Base" | "Gym" | "Neo" | null;
  number: string;
  rarity: string | null;
  name: string;
  owner: string | null;
  variant: string | null;
  stage: string;
  hp: number | null;
  type: string | null;
  types: string[];
  pokedex: number | null;
  level: string | null;
  evolvesFromName: string | null;
  evolvesFromDex: number | null;
  evolvesIntoName: string | null;
  species: { en: string | null };
  flavor: { en: string | null };
  weight: string | null;
  height: string | null;
  illustrator: string | null;
  weaknesses: WeakRes[];
  resistances: WeakRes[];
  retreatCost: number;
  babyInfo: { en: string } | null;
  attacks: Attack[];
  powers: Power[];
}

// Voce dell'indice laterale (sottoinsieme leggero della carta).
export interface CardIndexEntry {
  id: string;
  name: string;
  number: string;
  type: string | null;
  rarity: string | null;
  setId: string;
  setName: string;
}

