// Template HTML per il rendering di una carta Pokémon (layout Base/WOTC).
// Lo stile sta in src/card.css; i colori per-tipo sono variabili CSS impostate inline.
//
// buildCardMarkup(card, set, ctx) -> "<div class='card' …>…</div>"
// buildDocument(card, set, ctx, opts) -> documento HTML completo
//   opts.cssHref   : se presente, <link rel=stylesheet href=…>
//   opts.cssInline : altrimenti <style>…</style>
//   opts.bodyPrepend / opts.bodyAppend : markup extra (selettore, script live-reload)
//
// ctx = { energy:{CODE:"<svg…>"}, artUrl, setSymbolUrl }

const CARD_W = 500;
const CARD_H = 700;

// Colori per tipo: accent (bande) + tint (faccia) + frame (bordo arte).
const TYPE_COLOR = {
  G: { accent: "#5DA130", tint: "#E9EAC9", frame: "#7FB04B" },
  R: { accent: "#D8442E", tint: "#F2DCC4", frame: "#E07A3E" },
  W: { accent: "#2F7CC0", tint: "#CFE0EC", frame: "#5AA0D0" },
  L: { accent: "#D9A400", tint: "#F1E7BE", frame: "#EAC83E" },
  P: { accent: "#7E4A99", tint: "#E2D3E6", frame: "#9B6FB0" },
  F: { accent: "#A85A2A", tint: "#E7D6C2", frame: "#C8763C" },
  C: { accent: "#9A9384", tint: "#ECE7DA", frame: "#CFC8B6" },
  D: { accent: "#2E3640", tint: "#D2D6DB", frame: "#5A6573" },
  M: { accent: "#6E7A86", tint: "#DEE2E6", frame: "#9AA3AB" },
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Rarità sulle carte originali → simbolo: ● comune, ◆ non comune, ★ rara.
// Tutte le varianti Rare/Holo/Shining/Secret e le Promo usano la stella.
const RARITY_TIER = {
  Common: "common",
  Uncommon: "uncommon",
  Rare: "rare", "Rare Holo": "rare", "Rare Shining": "rare", "Rare Secret": "rare", Promo: "rare",
};

function raritySym(ctx, rarity) {
  const tier = RARITY_TIER[rarity];
  const svg = tier && ctx.rarity ? ctx.rarity[tier] : null;
  return svg ? `<span class="rarity-ico" title="${esc(rarity)}">${svg}</span>` : "";
}

function energyIcon(ctx, code, size) {
  const svg = ctx.energy[code] || ctx.energy.C;
  return `<span class="en" style="width:${size}px;height:${size}px">${svg}</span>`;
}

// Escape + sostituzione dei token energia {X} con i simboli.
function tokenize(ctx, text) {
  return esc(text)
    .split(/(\{[GRWLPFCDM]\})/)
    .map((p) => {
      const m = p.match(/^\{([GRWLPFCDM])\}$/);
      return m ? energyIcon(ctx, m[1], 16) : p;
    })
    .join("");
}

// Testo di attacchi/poteri. Le frasi tra parentesi — parentesi incluse — vanno in
// corsivo, per distinguerle dal testo normale (i simboli energia restano gestiti).
function renderText(ctx, text) {
  if (!text) return "";
  return text
    .split(/(\([^)]*\))/)
    .map((seg) => {
      const inner = tokenize(ctx, seg);
      return /^\(.*\)$/.test(seg) ? `<i>${inner}</i>` : inner;
    })
    .join("");
}

function costIcons(ctx, cost) {
  if (!cost || cost.length === 0) return energyIcon(ctx, "C", 26);
  return cost.map((c) => energyIcon(ctx, c, 26)).join("");
}

function attackRow(ctx, a) {
  const dmg = a.damage?.raw ? `<div class="atk-dmg">${esc(a.damage.raw)}</div>` : "";
  // Il testo segue subito il nome (font proprio), senza andare a capo.
  const text = a.text?.en ? ` <span class="atk-text">${renderText(ctx, a.text.en)}</span>` : "";
  return `<div class="atk">
    <div class="atk-cost">${costIcons(ctx, a.cost)}</div>
    <div class="atk-body"><span class="atk-name">${esc(a.name.en)}</span>${text}</div>
    ${dmg}
  </div>`;
}

function powerRow(ctx, p) {
  // Titolo e testo sulla stessa riga: il testo segue subito, con il suo font.
  return `<div class="power"><span class="power-tag">Pokémon Power:</span> <span class="power-name">${esc(p.name.en)}</span> <span class="power-text">${renderText(ctx, p.text.en)}</span></div>`;
}

function wrrBar(ctx, card) {
  const cell = (label, content) => `<div class="wrr-cell"><div class="wrr-label">${label}</div><div class="wrr-val">${content}</div></div>`;
  // Debolezza: nell'era vintage il moltiplicatore (×2) NON era stampato — solo il
  // simbolo del tipo. Il valore resta nei dati come metadata.
  const wk = card.weaknesses.map((w) => energyIcon(ctx, w.type, 22)).join("");
  const rs = card.resistances.map((r) => `${energyIcon(ctx, r.type, 22)}<span class="wrr-x">${esc(r.value)}</span>`).join("");
  const rt = card.retreatCost > 0 ? Array.from({ length: card.retreatCost }, () => energyIcon(ctx, "C", 22)).join("") : "";
  return `<div class="wrr">${cell("weakness", wk)}${cell("resistance", rs)}${cell("retreat cost", rt)}</div>`;
}

export function buildCardMarkup(card, set, ctx) {
  const col = TYPE_COLOR[card.type] || TYPE_COLOR.C;
  const vars = `--accent:${col.accent};--tint:${col.tint};--frame:${col.frame}`;

  // Riga evoluzione: "Evolves from X" + "Put NAME on the <stage prec.> card".
  const prevStage = card.stage === "Stage 2" ? "Stage 1 card"
    : card.stage === "Stage 1" ? "Basic Pokémon" : null;
  const evoMarkup = card.evolvesFromName
    ? `<span class="evo-from">Evolves from ${esc(card.evolvesFromName)}</span>` +
      (prevStage ? `<span class="evo-put">Put ${esc(card.name)} on the ${prevStage}</span>` : "")
    : "";

  // Barra specie: "Specie. Length h, Weight w." (terminatori . , .)
  const speciesParts = [];
  if (card.species?.en) speciesParts.push(`${esc(card.species.en)}.`);
  if (card.height) speciesParts.push(`Length ${esc(card.height)},`);
  if (card.weight) speciesParts.push(`Weight ${esc(card.weight)}.`);
  const speciesLine = speciesParts.join(" ");

  const powers = (card.powers || []).map((p) => powerRow(ctx, p)).join("");
  const attacks = (card.attacks || []).map((a) => attackRow(ctx, a)).join("");

  // Flavor + livello (LV. x) + numero Pokédex (#y) in coda alla descrizione.
  let flavor = "";
  if (card.flavor?.en) {
    let t = card.flavor.en.trim();
    if (!/[.!?"]$/.test(t)) t += ".";
    const sp = "&nbsp;&nbsp;"; // 2 spazi prima di LV e #
    const lv = card.level ? `${sp}LV. ${esc(card.level)}` : "";
    const dex = card.pokedex ? `${sp}#${esc(card.pokedex)}` : "";
    flavor = `<div class="flavor">${esc(t)}${lv}${dex}</div>`;
  }

  const numStr = set?.printedTotal ? `${esc(card.number)}/${set.printedTotal}` : esc(card.number);
  const copyright = set?.copyright || (set?.releaseDate ? `© ${String(set.releaseDate).slice(0, 4)}` : "");

  // Etichetta stage: Basic → "Basic Pokémon" (solo iniziali maiuscole, a sinistra);
  // Baby → "Baby Pokémon counts as a Basic Pokémon" (stesso font, allineata a destra);
  // le evoluzioni mostrano "Stage N" tutto MAIUSCOLO. La resa è gestita dal CSS:
  // .stage--basic mantiene le maiuscole come scritte, le altre vanno uppercase.
  const isBaby = card.stage === "Baby";
  const isBasic = card.stage === "Basic" || isBaby;
  const stageLabel = isBaby ? "Baby Pokémon counts as a Basic Pokémon"
    : isBasic ? "Basic Pokémon" : card.stage;

  // Sezione baby (solo stage Baby): sotto la barra gold, prima degli attacchi.
  // L'attributo speciale (babyInfo) è in rosso corsivo; sotto, "Evolves into NAME"
  // (grassetto corsivo) e "Put NAME on the Baby Pokémon" (regolare, senza punto).
  const babyBlock = isBaby
    ? `<div class="baby">` +
        `<div class="baby-rule">${renderText(ctx, card.babyInfo?.en || "")}</div>` +
        (card.evolvesIntoName
          ? `<div class="baby-evo-into">Evolves into ${esc(card.evolvesIntoName)}</div>` +
            `<div class="baby-evo-put">Put ${esc(card.evolvesIntoName)} on the Baby Pokémon</div>`
          : "") +
      `</div>`
    : "";

  // .face = area interna (tint) che ritaglia il contenuto; .canvas ripristina lo
  // spazio coordinate 500x700 così nulla finisce sul bordo giallo esterno.
  return `<div class="card" style="${vars}">
    <div class="face"><div class="canvas">
      <div class="toprow">
        <span class="stage${isBasic ? " stage--basic" : ""}${isBaby ? " stage--baby" : ""}">${esc(stageLabel)}</span>
        ${evoMarkup}
      </div>
      <div class="header">
        <span class="name">${esc(card.name)}</span>
        <span class="hp">${esc(card.hp)} HP</span>
        <span class="type-ico">${energyIcon(ctx, card.type, 26)}</span>
      </div>
      <div class="art" style="background-image:url('${ctx.artUrl}')"></div>
      <div class="species">${speciesLine}</div>
      ${ctx.setSymbolUrl ? `<img class="setico" src="${ctx.setSymbolUrl}" />` : ""}
      <div class="body">${babyBlock}${powers}${attacks}</div>
      ${wrrBar(ctx, card)}
      ${flavor}
      <div class="footer">
        <span class="illus">Illus. ${esc(card.illustrator)}</span>
        <span class="copy">${esc(copyright)}</span>
        <span class="right"><span class="cnum">${numStr}</span>${raritySym(ctx, card.rarity)}</span>
      </div>
    </div></div>
  </div>`;
}

export function buildDocument(card, set, ctx, opts = {}) {
  const style = opts.cssHref
    ? `<link rel="stylesheet" href="${opts.cssHref}">`
    : `<style>${opts.cssInline || ""}</style>`;
  // La carta è sempre dentro .card-box: un solo --card-scale ridimensiona tutto.
  const scale = opts.scale ?? 1;
  const cardBox = `<div class="card-box" style="--card-scale:${scale}">${buildCardMarkup(card, set, ctx)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8">
${opts.headExtra || ""}
${style}
</head><body>
${opts.bodyPrepend || ""}
${cardBox}
${opts.bodyAppend || ""}
</body></html>`;
}

export { CARD_W, CARD_H };
