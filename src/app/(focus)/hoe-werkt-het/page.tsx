import type { Metadata } from "next";
import { HowItWorksScreen } from "@/components/screens/welcome";

export const metadata: Metadata = { title: "Hoe werkt de KansenKamer?" };

export default function Page() {
  return <HowItWorksScreen />;
}
