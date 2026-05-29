// Utility pure (niente fs): usabili sia lato server sia in componenti client.

// Codice tipo → parole-chiave ricercabili (IT + EN) per la barra di ricerca.
export const TYPE_KEYWORDS: Record<string, string> = {
  G: "grass erba", R: "fire fuoco", W: "water acqua", L: "lightning elettro fulmine",
  P: "psychic psico", F: "fighting lotta combattimento", C: "colorless incolore",
  D: "darkness dark oscurità buio", M: "metal metallo acciaio",
};

// Rarità carta → tier simbolo nel menu (● comune, ◆ non comune, ★ rara). Promo/null: nessuno.
export function rarityTier(r: string | null): string | null {
  if (!r) return null;
  if (r === "Common") return "common";
  if (r === "Uncommon") return "uncommon";
  if (r.startsWith("Rare")) return "rare";
  return null;
}
