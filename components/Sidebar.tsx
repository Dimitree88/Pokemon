"use client";

// Menu laterale: set collassabili, ricerca (nome/numero/tipo), zoom, espandi/collassa
// tutti. Vive nel layout → resta montato durante la navigazione tra carte (niente
// flash). Simboli energia/rarità arrivano come stringhe SVG dal server.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CardIndexEntry, Symbols } from "@/lib/types";
import { TYPE_KEYWORDS, rarityTier } from "@/lib/card-utils";

type Group = { setId: string; setName: string; cards: CardIndexEntry[] };

export default function Sidebar({
  index, sym, setSymbolIds,
}: {
  index: CardIndexEntry[]; sym: Symbols; setSymbolIds: string[];
}) {
  const pathname = usePathname();
  const currentId = pathname?.startsWith("/card/") ? decodeURIComponent(pathname.slice("/card/".length)) : null;
  const hasSym = useMemo(() => new Set(setSymbolIds), [setSymbolIds]);

  const groups = useMemo<Group[]>(() => {
    const gs: Group[] = [];
    for (const c of index) {
      let g = gs[gs.length - 1];
      if (!g || g.setId !== c.setId) { g = { setId: c.setId, setName: c.setName, cards: [] }; gs.push(g); }
      g.cards.push(c);
    }
    return gs;
  }, [index]);

  const currentSetId = currentId ? currentId.split("-").slice(0, -1).join("-") : null;

  const [open, setOpen] = useState<Set<string>>(() => new Set(currentSetId ? [currentSetId] : []));
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // navigando, apri (e mantieni aperto) il set della carta corrente
  useEffect(() => {
    if (currentSetId) setOpen((o) => (o.has(currentSetId) ? o : new Set(o).add(currentSetId)));
  }, [currentSetId]);

  // chiave di ricerca per carta (nome + numero + parole-chiave tipo)
  const keyOf = (c: CardIndexEntry) => `${c.name} ${c.number} ${TYPE_KEYWORDS[c.type ?? ""] || ""}`.toLowerCase();

  const toggle = (id: string) =>
    setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allOpen = open.size >= groups.length;
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.setId)));

  // ---- zoom: un solo --card-scale su <html>, ereditato da .card-box ----
  const setZoom = (pct: number) => document.documentElement.style.setProperty("--card-scale", String(pct / 100));
  const [zoom, setZoomState] = useState(100);
  useEffect(() => {
    const saved = Math.min(200, Math.max(50, parseInt(sessionStorage.getItem("zoom") || "100", 10) || 100));
    setZoomState(saved); setZoom(saved);
  }, []);
  const onZoom = (v: number) => { setZoomState(v); setZoom(v); sessionStorage.setItem("zoom", String(v)); };

  // scroll alla carta corrente
  const curRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => { curRef.current?.scrollIntoView({ block: "center" }); }, [currentId]);

  const raritySym = (r: string | null) => {
    const tier = rarityTier(r);
    return tier ? sym.rarity[tier].replace(/fill="[^"]*"/g, 'fill="#bbb"') : null;
  };

  return (
    <aside className="fixed left-0 top-0 w-72 h-screen overflow-y-auto bg-neutral-900 text-neutral-200 text-[13px] leading-tight border-r border-black font-sans">
      <div className="sticky top-0 z-10 bg-neutral-900 px-3 pt-3 pb-2">
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
          placeholder="cerca per nome, numero o tipo…"
          className="w-full px-2 py-1.5 bg-neutral-700 text-neutral-100 border border-neutral-600 rounded outline-none"
        />
      </div>
      <div className="flex items-center gap-2 px-3 pb-2 text-[11px] text-neutral-400">
        zoom:
        <input type="range" min={50} max={200} step={25} value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))} className="flex-1 accent-green-700" />
        <span className="min-w-[38px] text-right text-neutral-300">{zoom}%</span>
      </div>
      <div className="px-3 pb-2">
        <button type="button" onClick={toggleAll}
          className="w-full px-2 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border border-neutral-600 rounded text-[11px]">
          {allOpen ? "Collassa tutti" : "Espandi tutti"}
        </button>
      </div>

      {groups.map((g) => {
        const matches = q ? g.cards.filter((c) => keyOf(c).includes(q)) : g.cards;
        if (q && matches.length === 0) return null;
        const expanded = q ? true : open.has(g.setId);
        return (
          <div key={g.setId}>
            <div
              onClick={() => !q && toggle(g.setId)}
              className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 bg-neutral-800 text-[10px] uppercase tracking-wide text-neutral-400 cursor-pointer select-none"
            >
              <span className={`text-[9px] transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
              {hasSym.has(g.setId) ? <img src={`/sets/${g.setId}.png`} alt="" className="w-4 h-4 object-contain shrink-0" /> : null}
              <span>{g.setName}</span>
              <span className="ml-auto text-neutral-500">{g.cards.length}</span>
            </div>
            {expanded ? (
              <div>
                {matches.map((c) => {
                  const active = currentId === c.id;
                  const rsvg = raritySym(c.rarity);
                  return (
                    <Link
                      key={c.id} href={`/card/${c.id}`} ref={active ? curRef : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1 no-underline ${active ? "bg-green-700 text-white" : "text-neutral-300 hover:bg-neutral-700"}`}
                    >
                      <span className="min-w-[26px] text-neutral-500">{c.number}</span>
                      {c.type && sym.energy[c.type]
                        ? <span className="w-[15px] h-[15px] shrink-0 [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: sym.energy[c.type] }} />
                        : null}
                      <span className="flex-1 truncate">{c.name}</span>
                      {rsvg ? <span className="w-[13px] h-[13px] shrink-0 [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: rsvg }} /> : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
