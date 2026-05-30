// Rendering della carta Pokémon come componente React (server, nessuno stato).
// Le classi CSS sono definite in app/card.css, unica fonte di stile della carta
// (layout Base/WOTC + regola del --card-scale).

import React from "react";
import type { Card as CardData, CardSet, Symbols, Attack, Power } from "./types";

// Colori per tipo: accent (bande) + tint (faccia) + frame (bordo arte).
const TYPE_COLOR: Record<string, { accent: string; tint: string; frame: string }> = {
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

// Rarità → simbolo sulla carta: ● comune, ◆ non comune, ★ rara. Tutte le Rare/Holo/
// Shining/Secret usano la stella. Le Promo NON hanno simbolo di rarità (né /totale).
const RARITY_TIER: Record<string, string> = {
  Common: "common",
  Uncommon: "uncommon",
  Rare: "rare", "Rare Holo": "rare", "Rare Shining": "rare", "Rare Secret": "rare",
};

function Inline({ html, className, title }: { html: string; className?: string; title?: string }) {
  return <span className={className} title={title} dangerouslySetInnerHTML={{ __html: html }} />;
}

function EnergyIcon({ sym, code, size }: { sym: Symbols; code: string | null; size: number }) {
  const svg = sym.energy[code ?? "C"] || sym.energy.C;
  return <span className="en" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Token energia {X} → simbolo; resto testo. Ritorna nodi React.
function tokenize(sym: Symbols, text: string): React.ReactNode[] {
  return text.split(/(\{[GRWLPFCDM]\})/).map((p, i) => {
    const m = p.match(/^\{([GRWLPFCDM])\}$/);
    return m ? <EnergyIcon key={i} sym={sym} code={m[1]} size={16} /> : <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// Testo attacchi/poteri: le frasi tra parentesi (incluse) vanno in corsivo.
function renderText(sym: Symbols, text: string | null | undefined): React.ReactNode {
  if (!text) return null;
  return text.split(/(\([^)]*\))/).map((seg, i) =>
    /^\(.*\)$/.test(seg) ? <i key={i}>{tokenize(sym, seg)}</i> : <React.Fragment key={i}>{tokenize(sym, seg)}</React.Fragment>
  );
}

function CostIcons({ sym, cost }: { sym: Symbols; cost: string[] }) {
  if (!cost || cost.length === 0) return <EnergyIcon sym={sym} code="C" size={26} />;
  return <>{cost.map((c, i) => <EnergyIcon key={i} sym={sym} code={c} size={26} />)}</>;
}

function AttackRow({ sym, a }: { sym: Symbols; a: Attack }) {
  return (
    <div className="atk">
      <div className="atk-cost"><CostIcons sym={sym} cost={a.cost} /></div>
      <div className="atk-body">
        <span className="atk-name">{a.name.en}</span>
        {a.text?.en ? <>{" "}<span className="atk-text">{renderText(sym, a.text.en)}</span></> : null}
      </div>
      {a.damage?.raw ? <div className="atk-dmg">{a.damage.raw}</div> : null}
    </div>
  );
}

function PowerRow({ sym, p }: { sym: Symbols; p: Power }) {
  return (
    <div className="power">
      <span className="power-tag">Pokémon Power:</span>{" "}
      <span className="power-name">{p.name.en}</span>{" "}
      <span className="power-text">{renderText(sym, p.text.en)}</span>
    </div>
  );
}

function WrrBar({ sym, card }: { sym: Symbols; card: CardData }) {
  const cell = (label: string, content: React.ReactNode) => (
    <div className="wrr-cell"><div className="wrr-label">{label}</div><div className="wrr-val">{content}</div></div>
  );
  // Debolezza: nell'era vintage il moltiplicatore (×2) NON era stampato — solo il simbolo.
  const wk = card.weaknesses.map((w, i) => <EnergyIcon key={i} sym={sym} code={w.type} size={22} />);
  const rs = card.resistances.map((r, i) => (
    <React.Fragment key={i}><EnergyIcon sym={sym} code={r.type} size={22} /><span className="wrr-x">{r.value}</span></React.Fragment>
  ));
  const rt = card.retreatCost > 0
    ? Array.from({ length: card.retreatCost }, (_, i) => <EnergyIcon key={i} sym={sym} code="C" size={22} />)
    : null;
  return <div className="wrr">{cell("weakness", wk)}{cell("resistance", rs)}{cell("retreat cost", rt)}</div>;
}

export function Card({
  card, set, sym, artUrl, setSymbolUrl,
}: {
  card: CardData; set?: CardSet; sym: Symbols; artUrl: string; setSymbolUrl: string;
}) {
  const col = TYPE_COLOR[card.type ?? "C"] || TYPE_COLOR.C;
  const vars = { "--accent": col.accent, "--tint": col.tint, "--frame": col.frame } as React.CSSProperties;

  // Riga evoluzione: "Evolves from X" + "Put NAME on the <stage prec.> card".
  const prevStage = card.stage === "Stage 2" ? "Stage 1 card" : card.stage === "Stage 1" ? "Basic Pokémon" : null;

  // Etichetta stage. Baby → testo dedicato allineato a destra; Basic → iniziali maiuscole.
  const isBaby = card.stage === "Baby";
  const isBasic = card.stage === "Basic" || isBaby;
  const stageLabel = isBaby ? "Baby Pokémon counts as a Basic Pokémon" : isBasic ? "Basic Pokémon" : card.stage;
  const stageCls = `stage${isBasic ? " stage--basic" : ""}${isBaby ? " stage--baby" : ""}`;

  // Famiglia grafica della carta: override per-carta (promo) → famiglia del set → Base.
  // La classe layout-{family} sul .card è l'aggancio per gli override CSS per-famiglia;
  // le differenze strutturali restano branch espliciti.
  const family = card.layoutFamily ?? set?.layoutFamily ?? "Base";
  const layoutClass = `layout-${family.toLowerCase()}`;

  // Famiglia Neo (4 Neo + Southern Islands + promo dell'era Neo): etichetta stage sul
  // riquadro foto. Per i Basic non si ripete in alto a sinistra: solo sul riquadro.
  const neoEra = family === "Neo";
  const frameStageLabel = `${card.stage} Pokémon`;
  const showTopLeftStage = !(neoEra && card.stage === "Basic");

  // Unown: regola del mazzo in cima alla carta, allineata a destra (font regolare).
  const isUnown = /^Unown\b/.test(card.name);

  // Barra specie: "Specie. Length h, Weight w."
  const speciesParts: string[] = [];
  if (card.species?.en) speciesParts.push(`${card.species.en}.`);
  if (card.height) speciesParts.push(`Length ${card.height},`);
  if (card.weight) speciesParts.push(`Weight ${card.weight}.`);
  const speciesLine = speciesParts.join(" ");

    // Riga in basso: flavor (descrizione estesa) + livello (LV. x) e numero Pokédex (#y),
  // resi in span espliciti. LV/# sono indipendenti dal flavor: si mostrano anche quando
  // il flavor manca (es. carte Gym, che hanno level/pokedex ma niente descrizione).
  let flavorText = "";
  if (card.flavor?.en) {
    flavorText = card.flavor.en.trim();
    if (!/[.!?"]$/.test(flavorText)) flavorText += ".";
  }
  const lv = card.level ? `LV. ${card.level}` : "";
  const dex = card.pokedex ? `#${card.pokedex}` : "";
  const meta = [lv, dex].filter(Boolean).join("\u00A0\u00A0");
  const flavor =
    flavorText || meta ? (
      <div className="flavor">
        {flavorText ? <span className="flavor-text">{flavorText}</span> : null}
        {meta ? <span className="flavor-meta">{flavorText ? "\u00A0\u00A0" : ""}{meta}</span> : null}
      </div>
    ) : null;

  const numStr = set?.printedTotal ? `${card.number}/${set.printedTotal}` : card.number;
  const copyright = set?.copyright || (set?.releaseDate ? `© ${String(set.releaseDate).slice(0, 4)}` : "");

  const tier = card.rarity ? RARITY_TIER[card.rarity] : null;
  const raritySvg = tier ? sym.rarity[tier] : null;

  return (
    <div className={`card ${layoutClass}`} style={vars}>
      <div className="face"><div className="canvas">
        <div className="toprow">
          {showTopLeftStage ? <span className={stageCls}>{stageLabel}</span> : null}
          {card.evolvesFromName ? (
            <>
              <span className="evo-from">Evolves from {card.evolvesFromName}</span>
              {prevStage ? <span className="evo-put">Put {card.name} on the {prevStage}</span> : null}
            </>
          ) : null}
          {isUnown ? (
            <span className="unown-rule">You may have up to 4 Base Pokémon cards in your deck with Unown in their names.</span>
          ) : null}
        </div>
        <div className="header">
          <span className="name">{card.name}</span>
          <span className="hp">{card.hp} HP</span>
          <span className="type-ico"><EnergyIcon sym={sym} code={card.type} size={26} /></span>
        </div>
        <div className="art" style={{ backgroundImage: `url('${artUrl}')` }}>
          {neoEra ? <span className="art-stage">{frameStageLabel}</span> : null}
        </div>
        <div className="species">{speciesLine}</div>
        {setSymbolUrl ? <img className="setico" src={setSymbolUrl} alt="" /> : null}
        <div className="body">
          {isBaby ? (
            <div className="baby">
              <div className="baby-rule">{renderText(sym, card.babyInfo?.en || "")}</div>
              {card.evolvesIntoName ? (
                <div className="baby-evo">
                  <span className="baby-evo-into">Evolves into {card.evolvesIntoName}</span>
                  {"  "}
                  <span className="baby-evo-put">Put {card.evolvesIntoName} on the Baby Pokémon</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {(card.powers || []).map((p, i) => <PowerRow key={`p${i}`} sym={sym} p={p} />)}
          {(card.attacks || []).map((a, i) => <AttackRow key={`a${i}`} sym={sym} a={a} />)}
        </div>
        <WrrBar sym={sym} card={card} />
        {flavor}
        <div className="footer">
          <span className="illus">Illus. {card.illustrator}</span>
          <span className="copy">{copyright}</span>
          <span className="right">
            <span className="cnum">{numStr}</span>
            {raritySvg ? <Inline className="rarity-ico" title={card.rarity ?? ""} html={raritySvg} /> : null}
          </span>
        </div>
      </div></div>
    </div>
  );
}
