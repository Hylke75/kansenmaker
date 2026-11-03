import type { Metadata } from "next";
import { IdeasScreen } from "@/components/screens/ideas";

export const metadata: Metadata = { title: "Ideeën" };

export default function Page() {
  return <IdeasScreen />;
}
