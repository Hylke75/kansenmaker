import type { Metadata } from "next";
import { ParticipantScreen } from "@/components/screens/participant";

export const metadata: Metadata = { title: "Sessieruimte" };

export default async function Page({ params }: PageProps<"/sessie/[id]">) {
  const { id } = await params;
  return <ParticipantScreen id={id} />;
}
