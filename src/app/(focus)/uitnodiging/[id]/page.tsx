import type { Metadata } from "next";
import Link from "next/link";
import { MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Uitnodiging" };

/** Landingspagina van een toegangslink. Accepteren vereist de echte backend (stap 2). */
export default function Page() {
  return (
    <main id="inhoud" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <p className="text-sm font-bold tracking-[0.18em] text-km-muted">HAAGS VERHAAL</p>
      <h1 className="mt-2 text-4xl">Je bent uitgenodigd voor De Kansenmaker</h1>
      <div className="mt-8 rounded-2xl border-2 border-km-danger bg-km-danger-soft p-5" role="alert">
        <p className="flex items-center gap-2 font-bold text-km-danger">
          <MailOpen className="size-5" aria-hidden />
          Deze uitnodiging kan nog niet worden geaccepteerd
        </p>
        <p className="mt-2">
          Dit is een prototype: er is nog geen database of inlogsysteem gekoppeld, dus de link kan niet worden gecontroleerd.
        </p>
      </div>
      <Button asChild variant="outline" className="mt-8 self-start">
        <Link href="/">Bekijk het prototype</Link>
      </Button>
    </main>
  );
}
