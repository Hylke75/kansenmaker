"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import * as React from "react";

/**
 * AppShell — skiplink, zijbalk, header, hoofdinhoud (max 1200px) en de
 * altijd bereikbare primaire actie ‘Deel een idee’ op mobiel.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
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

/** ‘Deel een idee’ blijft op mobiel altijd bereikbaar (behalve in het formulier zelf en tijdens begeleiden). */
function MobileShareButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/ideeen/nieuw") || pathname.endsWith("/begeleiden")) return null;
  return (
        <Link
          href="/ideeen/nieuw"
          data-print-hide
          className="fixed right-4 bottom-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-km-yellow px-5 font-bold text-km-green shadow-lg hover:bg-km-yellow-hover md:hidden"
        >
          <Plus className="size-5" aria-hidden />
          Deel een idee
        </Link>
  );
}
