// Dump delle carte Pokémon (solo supertype Pokémon) dei set WOTC in scope.
// Fonte primaria: pokemontcg.io (EN). Arricchimento: PokéAPI (specie, peso, altezza).
// Output: ../data/sets.json + ../data/cards/<setId>/<cardId>.json
//
// Uso: node scripts/dump.mjs
//
// I campi testuali sono "bilingue-ready": { en: "..." }. L'italiano si aggiunge dopo.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const CARDS_DIR = path.join(DATA, "cards");
const CACHE = path.join(DATA, ".cache");

// Set in scope -> mapping verso pokemontcg.io. (Miscellaneous non ha un set id
// standard su pokemontcg.io ed è escluso dal dump automatico.)
const SET_IDS = [
  "base1", // Base Set
  "base2", // Jungle
  "base3", // Fossil
  "base4", // Base Set 2
  "base5", // Team Rocket
  "gym1",  // Gym Heroes
  "gym2",  // Gym Challenge
  "neo1",  // Neo Genesis
  "neo2",  // Neo Discovery
  "neo3",  // Neo Revelation
  "neo4",  // Neo Destiny
  "basep", // Wizards Black Star Promos
  "si1",   // Southern Islands
];

const OWNER_RE = /^(.+?)'s\s+/; // "Brock's Onix", "Lt. Surge's Electabuzz", "Rocket's Zapdos"
const VARIANT_RE = /^(Dark|Light|Shining)\s+/i;

// ---------- util ----------

async function fetchJson(url, { retries = 4 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "pokemon-vintage-dump" } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw new Error(`fetch fallita ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

// fetch con cache su disco (per PokéAPI, così le ri-esecuzioni sono veloci)
async function cachedJson(url, cacheKey) {
  const file = path.join(CACHE, `${cacheKey}.json`);
  if (existsSync(file)) {
    return JSON.parse(await readFile(file, "utf8"));
  }
  const data = await fetchJson(url);
  await writeFile(file, JSON.stringify(data));
  return data;
}

function layoutFamily(series) {
  if (series === "Gym") return "Gym";
  if (series === "Neo") return "Neo";
  return "Base";
}

function parseDamage(raw) {
  if (!raw) return { raw: "", value: null, modifier: null };
  const m = raw.match(/^(\d+)?\s*([+×x\-−])?$/);
  if (!m) return { raw, value: null, modifier: null };
  return {
    raw,
    value: m[1] ? parseInt(m[1], 10) : null,
    modifier: m[2] ? m[2].replace("x", "×").replace("-", "−") : null,
  };
}

function normalizeName(s) {
  return s
    .toLowerCase()
    .replace("♀", "-f")
    .replace("♂", "-m")
    .replace(/['.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function dmToImperial(dm) {
  // decimetri -> piedi'pollici"
  const meters = dm / 10;
  const totalInches = Math.round(meters * 39.3701);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${String(inches).padStart(2, "0")}"`;
}

function hgToLbs(hg) {
  // ettogrammi -> libbre
  const kg = hg / 10;
  return `${Math.round(kg * 2.20462)} lbs`;
}

// ---------- main ----------

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(CARDS_DIR, { recursive: true });

  // 1) name -> national dex (gen 1-3 abbondanti)
  console.log("• Costruzione mappa nome->Pokédex (PokéAPI)…");
  const list = await cachedJson(
    "https://pokeapi.co/api/v2/pokemon?limit=2000",
    "pokemon-list"
  );
  const nameToDex = new Map();
  for (const p of list.results) {
    const dex = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
    nameToDex.set(p.name, dex);
  }
  const resolveDex = (name) => {
    if (!name) return null;
    let n = normalizeName(name.replace(VARIANT_RE, "").replace(OWNER_RE, ""));
    return nameToDex.get(n) ?? null;
  };

  // 2) fetch carte per set
  const sets = [];
  const allCards = [];
  const unmatchedEvo = [];

  for (const setId of SET_IDS) {
    let page = 1;
    let setMeta = null;
    const cards = [];
    for (;;) {
      const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250`;
      const json = await fetchJson(url);
      const data = json?.data ?? [];
      if (data.length === 0) break;
      if (!setMeta && data[0].set) setMeta = data[0].set;
      cards.push(...data);
      if (data.length < 250) break;
      page++;
    }
    await new Promise((r) => setTimeout(r, 800)); // gentile con il rate limit

    if (setMeta) {
      sets.push({
        id: setMeta.id,
        name: setMeta.name,
        sigla: setMeta.ptcgoCode ?? null,
        releaseDate: setMeta.releaseDate ?? null,
        printedTotal: setMeta.printedTotal ?? null,
        layoutFamily: layoutFamily(setMeta.series),
        copyright: null, // da inserire a mano in seguito
      });
    }

    const pokemonCards = cards.filter((c) => c.supertype === "Pokémon");
    console.log(
      `• ${setId}: ${pokemonCards.length} carte Pokémon (su ${cards.length} totali)`
    );

    const setDir = path.join(CARDS_DIR, setId);
    await mkdir(setDir, { recursive: true });

    for (const c of pokemonCards) {
      const fullName = c.name;
      const variantMatch = fullName.match(VARIANT_RE);
      const variant = variantMatch ? variantMatch[1].toLowerCase() : null;
      const ownerMatch = fullName.replace(VARIANT_RE, "").match(OWNER_RE);
      const owner = ownerMatch ? ownerMatch[1] : null;

      const stage = (c.subtypes || []).find((s) =>
        ["Basic", "Stage 1", "Stage 2", "Baby"].includes(s)
      ) ?? (c.subtypes ? c.subtypes[0] : null);

      const isBaby = (c.subtypes || []).includes("Baby");

      const evolvesFromName = c.evolvesFrom ?? null;
      const evolvesFromDex = resolveDex(evolvesFromName);
      if (evolvesFromName && evolvesFromDex == null) {
        unmatchedEvo.push({ id: c.id, evolvesFrom: evolvesFromName });
      }

      const card = {
        id: c.id,
        set: setId,
        number: c.number,
        rarity: c.rarity ?? null,
        name: fullName,
        owner,
        variant,
        stage,
        hp: c.hp ? parseInt(c.hp, 10) : null,
        type: c.types ? c.types[0] : null,
        types: c.types ?? [],
        pokedex: c.nationalPokedexNumbers ? c.nationalPokedexNumbers[0] : null,
        level: c.level ?? null,
        evolvesFromName,
        evolvesFromDex,
        species: { en: null }, // riempito da PokéAPI
        flavor: { en: c.flavorText ?? null },
        weight: null, // riempito da PokéAPI
        height: null, // riempito da PokéAPI
        illustrator: c.artist ?? null,
        weaknesses: c.weaknesses ?? [],
        resistances: c.resistances ?? [],
        retreatCost:
          typeof c.convertedRetreatCost === "number"
            ? c.convertedRetreatCost
            : (c.retreatCost ? c.retreatCost.length : 0),
        babyInfo: isBaby && c.rules ? { en: c.rules.join("\n") } : null,
        attacks: (c.attacks || []).map((a) => ({
          name: { en: a.name },
          cost: a.cost ?? [],
          damage: parseDamage(a.damage),
          text: { en: a.text || null },
        })),
        powers: (c.abilities || [])
          .filter((ab) => /Pok[eé]mon Power/i.test(ab.type || ""))
          .map((ab) => ({
            name: { en: ab.name },
            text: { en: ab.text || null },
            // colore: omesso = rosso (default)
          })),
        _lang: ["en"],
      };

      allCards.push(card);
    }
  }

  // 3) enrichment PokéAPI: specie (genus en) + peso/altezza, per dex unico
  const dexSet = new Set(
    allCards.map((c) => c.pokedex).filter((d) => typeof d === "number")
  );
  console.log(`• Arricchimento PokéAPI per ${dexSet.size} specie uniche…`);
  const speciesInfo = new Map();
  for (const dex of dexSet) {
    try {
      const [mon, species] = await Promise.all([
        cachedJson(`https://pokeapi.co/api/v2/pokemon/${dex}`, `pokemon-${dex}`),
        cachedJson(
          `https://pokeapi.co/api/v2/pokemon-species/${dex}`,
          `species-${dex}`
        ),
      ]);
      const genusEn =
        species?.genera?.find((g) => g.language?.name === "en")?.genus ?? null;
      speciesInfo.set(dex, {
        genusEn,
        height: mon?.height != null ? dmToImperial(mon.height) : null,
        weight: mon?.weight != null ? hgToLbs(mon.weight) : null,
      });
    } catch (err) {
      console.warn(`  ! PokéAPI dex ${dex}: ${err.message}`);
    }
  }

  // 4) applica enrichment e scrivi i file
  let written = 0;
  for (const card of allCards) {
    const info = speciesInfo.get(card.pokedex);
    if (info) {
      card.species.en = info.genusEn;
      card.height = info.height;
      card.weight = info.weight;
    }
    const file = path.join(CARDS_DIR, card.set, `${card.id}.json`);
    await writeFile(file, JSON.stringify(card, null, 2) + "\n");
    written++;
  }

  await writeFile(
    path.join(DATA, "sets.json"),
    JSON.stringify(sets, null, 2) + "\n"
  );

  // 5) report
  console.log("\n===== RIEPILOGO =====");
  console.log(`Set: ${sets.length}`);
  console.log(`Carte Pokémon scritte: ${written}`);
  console.log(`Specie arricchite: ${speciesInfo.size}`);
  if (unmatchedEvo.length) {
    console.log(`\nevolvesFrom non risolti (${unmatchedEvo.length}):`);
    for (const u of unmatchedEvo) console.log(`  ${u.id}: "${u.evolvesFrom}"`);
  } else {
    console.log("Tutti gli evolvesFrom risolti.");
  }
  const noSpecies = allCards.filter((c) => !c.species.en).length;
  const noMeasure = allCards.filter((c) => !c.height || !c.weight).length;
  console.log(`Carte senza specie: ${noSpecies}`);
  console.log(`Carte senza peso/altezza: ${noMeasure}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
