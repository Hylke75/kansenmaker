import type { Metadata } from "next";
import { SessionsScreen } from "@/components/screens/sessions";

export const metadata: Metadata = { title: "Sessies" };

export default function Page() {
  return <SessionsScreen />;
}
