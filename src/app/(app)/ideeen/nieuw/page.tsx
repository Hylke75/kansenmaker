import type { Metadata } from "next";
import { IdeaNewScreen } from "@/components/screens/idea-new";

export const metadata: Metadata = { title: "Deel jouw idee" };

export default async function Page({ searchParams }: PageProps<"/ideeen/nieuw">) {
  const { terug } = await searchParams;
  // Alleen terug naar de stappen (geen open redirect)
  const returnTo = typeof terug === "string" && /^\/stappen\/[1-6]$/.test(terug) ? terug : undefined;
  return <IdeaNewScreen returnTo={returnTo} />;
}
