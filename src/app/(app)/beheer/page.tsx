import type { Metadata } from "next";
import { AdminScreen } from "@/components/screens/admin";

export const metadata: Metadata = { title: "Beheer" };

export default async function Page({ searchParams }: PageProps<"/beheer">) {
  const { tab } = await searchParams;
  return <AdminScreen initialTab={typeof tab === "string" ? tab : undefined} />;
}
