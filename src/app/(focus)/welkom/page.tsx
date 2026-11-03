import type { Metadata } from "next";
import { WelcomeScreen } from "@/components/screens/welcome";

export const metadata: Metadata = { title: "Welkom" };

export default function Page() {
  return <WelcomeScreen />;
}
