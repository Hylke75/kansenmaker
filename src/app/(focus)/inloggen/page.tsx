import type { Metadata } from "next";
import { LoginScreen } from "@/components/screens/login";
import { safeNext } from "@/lib/supabase/proxy";

export const metadata: Metadata = { title: "Inloggen" };

export default async function Page({ searchParams }: PageProps<"/inloggen">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  return <LoginScreen next={next} linkError={sp.fout === "link"} />;
}
