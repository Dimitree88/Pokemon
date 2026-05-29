import type { Metadata } from "next";
import "./globals.css";
import "./card.css";
import Sidebar from "@/components/Sidebar";
import { getCardIndex, setSymbolIds } from "@/lib/data";
import { getSymbols } from "@/lib/symbols";

export const metadata: Metadata = {
  title: "Pokémon Vintage Cards",
  description: "Browser e rendering delle carte Pokémon vintage (era WOTC).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const index = getCardIndex();
  const sym = getSymbols();

  return (
    <html lang="it">
      <body className="bg-[#2b2b2b]">
        <Sidebar index={index} sym={sym} setSymbolIds={setSymbolIds} />
        <main className="ml-72 min-h-screen flex items-center justify-center p-6">{children}</main>
      </body>
    </html>
  );
}
