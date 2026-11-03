import type { Metadata } from "next";
import { InvitationScreen } from "@/components/screens/invitation";

export const metadata: Metadata = { title: "Uitnodiging" };

export default async function Page({ params }: PageProps<"/uitnodiging/[id]">) {
  const { id } = await params;
  return <InvitationScreen token={id} />;
}
