import type { Metadata } from "next";
import { HowItWorksScreen } from "@/components/screens/welcome";

export const metadata: Metadata = { title: "Hoe werkt De Kansenmaker?" };

export default function Page() {
  return <HowItWorksScreen />;
}
