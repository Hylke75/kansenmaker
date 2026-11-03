import type { Metadata } from "next";
import { GuestSessionScreen } from "@/components/screens/guest-session";

export const metadata: Metadata = { title: "Doe mee aan de werksessie" };

export default async function Page({ params }: PageProps<"/doe-mee/[token]">) {
  const { token } = await params;
  return <GuestSessionScreen token={token} />;
}
