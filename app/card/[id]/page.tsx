import { notFound } from "next/navigation";
import { getCard, getSet, setHasSymbol } from "@/lib/data";
import { getSymbols } from "@/lib/symbols";
import { Card } from "@/lib/card-render";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) notFound();

  const setId = id.split("-").slice(0, -1).join("-");
  const set = getSet(setId);
  const sym = getSymbols();

  return (
    <div className="card-box">
      <Card
        card={card}
        set={set}
        sym={sym}
        artUrl={`/art/${id}.png`}
        setSymbolUrl={setHasSymbol(setId) ? `/sets/${setId}.png` : ""}
      />
    </div>
  );
}
