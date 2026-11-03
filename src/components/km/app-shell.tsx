"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useNextStep } from "./step-progress";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useStore } from "@/lib/store";
import { LoadingState } from "./guards";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import * as React from "react";

/**
 * AppShell — skiplink, zijbalk, header, hoofdinhoud (max 1200px) en de
 * altijd bereikbare primaire actie ‘Verder met stap n’ op mobiel.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  if (state.status !== "ready") return <AuthGate status={state.status} />;
  return (
    <>
      <a
        href="#inhoud"
        className="sr-only z-50 rounded-lg bg-km-green px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        data-focus-ring-inverse
      >
        Naar de inhoud
      </a>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main id="inhoud" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-28 outline-none md:px-8 md:py-12">
            {children}
          </main>
        </div>
      </div>
      <React.Suspense fallback={null}>
        <MobileShareButton />
      </React.Suspense>
    </>
  );
}

/** De volgende stap blijft op mobiel altijd bereikbaar (niet op het overzicht en in de stappen zelf, die tonen hem al; niet in formulieren of tijdens begeleiden). */
function MobileShareButton() {
  const pathname = usePathname();
  const next = useNextStep();
  if (pathname === "/" || pathname.startsWith("/stappen") || pathname.startsWith("/ideeen/nieuw") || pathname.endsWith("/begeleiden")) return null;
  return (
        <Link
          href={next.href}
          data-print-hide
          className="fixed right-4 bottom-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-km-yellow px-5 font-bold text-km-green shadow-lg hover:bg-km-yellow-hover md:hidden"
        >
          <ArrowRight className="size-5" aria-hidden />
          {next.label}
        </Link>
  );
}

/** Tijdens het laden van de sessie, bij een verlopen sessie of een fout. */
function AuthGate({ status }: { status: "loading" | "signed-out" | "error" }) {
  const router = useRouter();
  React.useEffect(() => {
    if (status === "signed-out") router.replace(`/inloggen?next=${encodeURIComponent(window.location.pathname)}`);
  }, [status, router]);
  return (
    <main id="inhoud" className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8">
      {status === "error" ? (
        <div className="flex flex-col items-start gap-4" role="alert">
          <h1 className="text-3xl">De gegevens konden niet worden geladen</h1>
          <p>Controleer je internetverbinding en probeer het opnieuw.</p>
          <Button onClick={() => window.location.reload()}>Opnieuw proberen</Button>
        </div>
      ) : (
        <LoadingState label={status === "signed-out" ? "Doorsturen naar inloggen…" : "Bezig met laden…"} />
      )}
    </main>
  );
}
