import { Clock } from "lucide-react";
import type { SessionRoundDef } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SessionRoundProps {
  round: SessionRoundDef;
  total: number;
  large?: boolean;
  className?: string;
  headingLevel?: "h2" | "h3";
}

/** SessionRound — ronde-nummer, titel, duur en opdracht. */
export function SessionRound({ round, total, large, className, headingLevel: H = "h2" }: SessionRoundProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)} aria-label={`Ronde ${round.number} van ${total}`}>
      <p className="text-sm font-bold tracking-widest text-km-muted uppercase">
        Ronde {round.number} van {total}
      </p>
      <H className={large ? "text-5xl md:text-7xl" : "text-3xl md:text-4xl"}>{round.title}</H>
      <p className="inline-flex items-center gap-2 text-km-muted">
        <Clock className="size-5" aria-hidden />
        Duur: {round.minutes} minuten
      </p>
      <p className={cn("max-w-3xl text-km-text", large ? "text-2xl md:text-3xl" : "text-lg")}>{round.assignment}</p>
    </section>
  );
}

/** Kleine voortgangsindicator voor zes rondes. */
export function RoundProgress({ current, total }: { current: number; total: number }) {
  return (
    <ol className="flex gap-1.5" aria-label={`Ronde ${current} van ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          aria-hidden
          className={cn(
            "h-2 flex-1 rounded-full",
            i + 1 < current ? "bg-km-green" : i + 1 === current ? "bg-km-yellow" : "bg-km-line",
          )}
        />
      ))}
    </ol>
  );
}
