import type { Metadata } from "next";
import { AudiencesScreen } from "@/components/screens/audiences";

export const metadata: Metadata = { title: "Doelgroepen" };

export default function Page() {
  return <AudiencesScreen />;
}
