"use client";

// TEMPORANEO — pannello di tuning per allineare gli elementi della carta alle reference.
// Montato solo con ?tune=1. Ogni elemento ha X/Y (px nativi), Scala e Interlinea (LH); le
// modifiche sono applicate LIVE via le proprietà CSS standalone `translate`/`scale` (compongono
// coi transform esistenti senza romperli) e `line-height`. Gli slider ripartono da identità
// (il bake è già nel CSS): si esportano solo i delta nuovi, che vengono sommati al bake.
// Il box JSON in cima mostra i valori modificati: copiarli e passarli per il bake.
// DA RIMUOVERE a fine allineamento (vedi page.tsx, REF_BG in card-render).

import { useEffect, useMemo, useState } from "react";

type Val = { x: number; y: number; s: number; lh: number };
type Item = { key: string; label: string; sel: string };

// Nota: i PNG (cornice/barra specie/evolbar/box flavor) vanno solo SPOSTATI → scala = 1.
const ITEMS: Item[] = [
  { key: "toprow", label: "Stage label", sel: ".toprow" },
  { key: "name", label: "Nome (Basic)", sel: ".name" },
  { key: "nameEvo", label: "Nome (evoluzione)", sel: ".name--evo" },
  { key: "hp", label: "HP", sel: ".hp" },
  { key: "type", label: "Simbolo tipo", sel: ".type-ico" },
  { key: "evolbar", label: "Evolbar (PNG: solo X/Y)", sel: ".evolbar" },
  { key: "evolbarThumb", label: "Evolbar miniatura", sel: ".evolbar-thumb" },
  { key: "evolbarText", label: "Evolbar testo", sel: ".evolbar-text" },
  { key: "art", label: "Cornice foto (PNG: solo X/Y)", sel: ".art" },
  { key: "speciesBar", label: "Barra specie (PNG: solo X/Y)", sel: ".species" },
  { key: "speciesText", label: "Testo specie", sel: ".species-text" },
  { key: "setico", label: "Simbolo set", sel: ".setico" },
  { key: "body", label: "Blocco attacchi/power", sel: ".body" },
  { key: "atkcost", label: "Costi attacco", sel: ".atk-cost" },
  { key: "atkname", label: "Nome attacco", sel: ".atk-name" },
  { key: "atktext", label: "Testo attacco", sel: ".atk-text" },
  { key: "atkdmg", label: "Danno", sel: ".atk-dmg" },
  { key: "atksep", label: "Barra nera tra mosse", sel: ".atk-sep" },
  { key: "powername", label: "Nome/tag potere", sel: ".power-tag, .power-name" },
  { key: "powertext", label: "Testo potere", sel: ".power-text" },
  { key: "wrrsep", label: "Barra nera W/R/R", sel: ".wrr-sep" },
  { key: "weakLabel", label: "Weakness: label", sel: ".wrr-weak .wrr-label" },
  { key: "weakSym", label: "Weakness: simbolo", sel: ".wrr-weak .wrr-val" },
  { key: "resLabel", label: "Resistance: label", sel: ".wrr-res .wrr-label" },
  { key: "resSym", label: "Resistance: simbolo", sel: ".wrr-res .wrr-val" },
  { key: "resVal", label: "Resistance: valore", sel: ".wrr-x" },
  { key: "retLabel", label: "Retreat: label", sel: ".wrr-ret .wrr-label" },
  { key: "retSym", label: "Retreat: simbolo", sel: ".wrr-ret .wrr-val" },
  { key: "flavor", label: "Box flavor (PNG: solo X/Y)", sel: ".flavor" },
  { key: "flavortext", label: "Testo flavor", sel: ".flavor-text, .flavor-meta" },
  { key: "footerIllus", label: "Footer: illustratore", sel: ".footer .illus" },
  { key: "footerCopy", label: "Footer: copyright", sel: ".footer .copy" },
  { key: "footerNum", label: "Footer: numero", sel: ".footer .cnum" },
  { key: "rarity", label: "Simbolo rarità", sel: ".rarity-ico" },
];

const def = (): Val => ({ x: 0, y: 0, s: 1, lh: 0 });

export default function Tuner() {
  const [vals, setVals] = useState<Record<string, Val>>(
    () => Object.fromEntries(ITEMS.map((i) => [i.key, def()]))
  );

  useEffect(() => {
    for (const it of ITEMS) {
      const v = vals[it.key];
      document.querySelectorAll<HTMLElement>(it.sel).forEach((el) => {
        el.style.translate = `${v.x}px ${v.y}px`;
        el.style.scale = String(v.s);
        if (v.lh > 0) el.style.lineHeight = String(v.lh);
        else el.style.removeProperty("line-height");
      });
    }
  }, [vals]);

  const json = useMemo(() => {
    const out: Record<string, Partial<Val>> = {};
    for (const [k, v] of Object.entries(vals)) {
      const o: Partial<Val> = {};
      if (v.x) o.x = v.x;
      if (v.y) o.y = v.y;
      if (v.s !== 1) o.s = v.s;
      if (v.lh) o.lh = v.lh;
      if (Object.keys(o).length) out[k] = o;
    }
    return JSON.stringify(out, null, 2);
  }, [vals]);

  const set = (k: string, ax: keyof Val, n: number) =>
    setVals((p) => ({ ...p, [k]: { ...p[k], [ax]: n } }));
  const reset = () => setVals(Object.fromEntries(ITEMS.map((i) => [i.key, def()])));

  const row = (k: string, ax: keyof Val) => {
    const v = vals[k][ax];
    const cfg = ax === "s" ? { min: 0.3, max: 3, step: 0.01, lab: "⤢" }
      : ax === "lh" ? { min: 0, max: 2.5, step: 0.05, lab: "↕" }
      : { min: -250, max: 250, step: 1, lab: ax.toUpperCase() };
    return (
      <div key={ax} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 12, color: "#9cf" }}>{cfg.lab}</span>
        <input type="range" min={cfg.min} max={cfg.max} step={cfg.step}
          value={v} onChange={(e) => set(k, ax, Number(e.target.value))} style={{ flex: 1, minWidth: 0 }} />
        <input type="number" step={cfg.step} value={v}
          onChange={(e) => set(k, ax, Number(e.target.value))}
          style={{ width: 50, background: "#333", color: "#eee", border: "1px solid #555", fontSize: 11 }} />
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", right: 0, top: 0, width: 320, height: "100vh", overflowY: "auto",
      background: "#161616", color: "#eee", padding: 10, fontSize: 12, zIndex: 99999, fontFamily: "monospace" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button onClick={() => navigator.clipboard?.writeText(json)}
          style={{ flex: 1, padding: 6, background: "#2a7", border: "none", color: "#fff", cursor: "pointer" }}>Copia JSON</button>
        <button onClick={reset}
          style={{ padding: 6, background: "#a33", border: "none", color: "#fff", cursor: "pointer" }}>Reset</button>
      </div>
      <textarea readOnly value={json} style={{ width: "100%", height: 110, background: "#0c0c0c", color: "#7e7",
        border: "1px solid #444", fontSize: 10, marginBottom: 8 }} />
      <div style={{ color: "#888", marginBottom: 6 }}>X/Y px · ⤢ scala · ↕ interlinea (0 = off)</div>
      {ITEMS.map((it) => (
        <div key={it.key} style={{ borderTop: "1px solid #383838", padding: "5px 0" }}>
          <div style={{ fontWeight: "bold", marginBottom: 2, color: "#ddd" }}>{it.label}</div>
          {(["x", "y", "s", "lh"] as (keyof Val)[]).map((ax) => row(it.key, ax))}
        </div>
      ))}
    </div>
  );
}
