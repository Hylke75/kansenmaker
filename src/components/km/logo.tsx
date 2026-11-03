import Link from "next/link";
import { cn } from "@/lib/utils";

/** Woordmerk. Geen officieel logo: wacht op aangeleverde huisstijlbestanden. */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex min-h-11 flex-col justify-center rounded-md leading-none", className)} aria-label="De Kansenmaker, naar overzicht">
      {compact ? (
        <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-km-green font-heading text-lg font-bold text-white">
          K
        </span>
      ) : (
        <>
          <span aria-hidden className="text-xs font-bold tracking-[0.18em] text-km-muted">HAAGS VERHAAL</span>
          <span aria-hidden className="mt-1 font-heading text-xl font-bold text-km-green">De Kansenmaker</span>
        </>
      )}
    </Link>
  );
}
