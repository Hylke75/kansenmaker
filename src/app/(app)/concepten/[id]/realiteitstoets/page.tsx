import type { Metadata } from "next";
import { RealityCheckScreen } from "@/components/screens/reality-check";

export const metadata: Metadata = { title: "Realiteitstoets" };

export default async function Page({ params }: PageProps<"/concepten/[id]/realiteitstoets">) {
  const { id } = await params;
  return <RealityCheckScreen id={id} />;
}
