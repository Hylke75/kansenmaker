import type { Metadata } from "next";
import { PrintOverview } from "@/components/screens/print-overview";

export const metadata: Metadata = { title: "Printvriendelijk overzicht" };

export default function Page() {
  return <PrintOverview />;
}
