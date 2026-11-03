import type { Metadata } from "next";
import { ConceptsScreen } from "@/components/screens/concepts";

export const metadata: Metadata = { title: "Concepten" };

export default function Page() {
  return <ConceptsScreen />;
}
