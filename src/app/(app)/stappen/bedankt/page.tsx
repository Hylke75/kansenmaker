import type { Metadata } from "next";
import { ThanksScreen } from "@/components/screens/thanks";

export const metadata: Metadata = { title: "Bedankt voor het meedenken" };

export default function Page() {
  return <ThanksScreen />;
}
