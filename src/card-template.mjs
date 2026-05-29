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

function renderText(ctx, text) {
  if (!text) return "";
  return esc(text)
    .split(/(\{[GRWLPFCDM]\})/)
    .map((p) => {
      const m = p.match(/^\{([GRWLPFCDM])\}$/);
      return m ? energyIcon(ctx, m[1], 16) : p;
    })
    .join("");
}

function costIcons(ctx, cost) {
  if (!cost || cost.length === 0) return energyIcon(ctx, "C", 26);
  return cost.map((c) => energyIcon(ctx, c, 26)).join("");
}

function attackRow(ctx, a) {
  const dmg = a.damage?.raw ? `<div class="atk-dmg">${esc(a.damage.raw)}</div>` : "";
  const text = a.text?.en ? `<div class="atk-text">${renderText(ctx, a.text.en)}</div>` : "";
  return `<div class="atk">
    <div class="atk-head">
      <div class="atk-cost">${costIcons(ctx, a.cost)}</div>
      <div class="atk-name">${esc(a.name.en)}</div>
      ${dmg}
    </div>
    ${text}
  </div>`;
}

function powerRow(ctx, p) {
  return `<div class="power">
    <div class="power-head"><span class="power-tag">Pokémon Power</span> <span class="power-name">${esc(p.name.en)}</span></div>
    <div class="power-text">${renderText(ctx, p.text.en)}</div>
  </div>`;
}

function wrrBar(ctx, card) {
  const cell = (label, content) => `<div class="wrr-cell"><div class="wrr-label">${label}</div><div class="wrr-val">${content}</div></div>`;
  const wk = card.weaknesses.map((w) => `${energyIcon(ctx, w.type, 22)}<span class="wrr-x">${esc(w.value)}</span>`).join("");
  const rs = card.resistances.map((r) => `${energyIcon(ctx, r.type, 22)}<span class="wrr-x">${esc(r.value)}</span>`).join("");
  const rt = card.retreatCost > 0 ? Array.from({ length: card.retreatCost }, () => energyIcon(ctx, "C", 22)).join("") : "";
  return `<div class="wrr">${cell("weakness", wk)}${cell("resistance", rs)}${cell("retreat cost", rt)}</div>`;
}

export function buildCardMarkup(card, set, ctx) {
  const col = TYPE_COLOR[card.type] || TYPE_COLOR.C;
  const vars = `--accent:${col.accent};--tint:${col.tint};--frame:${col.frame}`;

  const stageLine =
    card.stage === "Basic"
      ? "Basic Pokémon"
      : `${esc(card.stage)} Pokémon${card.evolvesFromName ? ` &nbsp;(evolves from ${esc(card.evolvesFromName)})` : ""}`;

  const speciesLine = [
    card.species?.en ? esc(card.species.en) : null,
    card.height ? `Length ${esc(card.height)}` : null,
    card.weight ? `Weight ${esc(card.weight)}` : null,
  ].filter(Boolean).join(" &nbsp; ");

  const powers = (card.powers || []).map((p) => powerRow(ctx, p)).join("");
  const attacks = (card.attacks || []).map((a) => attackRow(ctx, a)).join("");
  const flavor = card.flavor?.en ? `<div class="flavor">${esc(card.flavor.en)}</div>` : "";
  const numStr = set?.printedTotal ? `${esc(card.number)}/${set.printedTotal}` : esc(card.number);

  return `<div class="card" style="${vars}">
    <div class="face"></div>
    <div class="stage">${stageLine}</div>
    <div class="header">
      <span class="name">${esc(card.name)}</span>
      ${card.level ? `<span class="lv">Lv.${esc(card.level)}</span>` : ""}
      <span class="hp">HP <b>${esc(card.hp)}</b></span>
      <span class="type-ico">${energyIcon(ctx, card.type, 26)}</span>
    </div>
    <div class="art" style="background-image:url('${ctx.artUrl}')"></div>
    <div class="species">${speciesLine}</div>
    <div class="body">${powers}${attacks}</div>
    ${wrrBar(ctx, card)}
    ${flavor}
    <div class="footer">
      <span class="illus">Illus. ${esc(card.illustrator)}</span>
      <span class="right">
        <span>${esc(set?.name || card.set)}</span>
        <img class="setico" src="${ctx.setSymbolUrl}" />
        <span class="cnum">${numStr}</span>
        ${raritySym(ctx, card.rarity)}
      </span>
    </div>
  </div>`;
}

export function buildDocument(card, set, ctx, opts = {}) {
  const style = opts.cssHref
    ? `<link rel="stylesheet" href="${opts.cssHref}">`
    : `<style>${opts.cssInline || ""}</style>`;
  return `<!doctype html><html><head><meta charset="utf-8">
${opts.headExtra || ""}
${style}
</head><body>
${opts.bodyPrepend || ""}
${buildCardMarkup(card, set, ctx)}
${opts.bodyAppend || ""}
</body></html>`;
}

export { CARD_W, CARD_H };
