import { notFound } from "next/navigation";
import { getCard, getSet, setHasSymbol } from "@/lib/data";
import { Card } from "@/lib/card-render";
import Tuner from "@/components/Tuner"; // TEMP: pannello di allineamento (?tune=1)

export default async function CardPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tune?: string }>;
}) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) notFound();

  const setId = id.split("-").slice(0, -1).join("-");
  const set = getSet(setId);
  const tune = (await searchParams).tune; // TEMP

  return (
    <>
      <div className="card-box">
        <Card
          card={card}
          set={set}
          artUrl={`/art/${id}.png`}
          setSymbolUrl={setHasSymbol(setId) ? `/sets/${setId}.png` : ""}
        />
      </div>
      {tune ? <Tuner /> : null}
    </>
  );
}
