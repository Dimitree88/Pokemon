import { redirect } from "next/navigation";
import { firstCardId } from "@/lib/data";

// Home → primissima carta del primissimo set.
export default function Home() {
  redirect(`/card/${firstCardId()}`);
}
