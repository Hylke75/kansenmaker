import type { Metadata } from "next";
import { IdeaNewScreen } from "@/components/screens/idea-new";

export const metadata: Metadata = { title: "Deel jouw idee" };

export default function Page() {
  return <IdeaNewScreen />;
}
