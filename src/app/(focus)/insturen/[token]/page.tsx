import type { Metadata } from "next";
import { GuestSubmitScreen } from "@/components/screens/guest-submit";

export const metadata: Metadata = { title: "Deel jouw idee" };

export default async function Page({ params }: PageProps<"/insturen/[token]">) {
  const { token } = await params;
  return <GuestSubmitScreen token={token} />;
}
