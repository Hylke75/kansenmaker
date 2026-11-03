import type { Metadata } from "next";
import { FacilitatorScreen } from "@/components/screens/facilitator";

export const metadata: Metadata = { title: "Sessie begeleiden" };

export default async function Page({ params }: PageProps<"/sessies/[id]/begeleiden">) {
  const { id } = await params;
  return <FacilitatorScreen id={id} />;
}
