"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/**
 * Voortgangsbalk voor deelnemers: gevulde balk met ‘Ronde x van 6’ en aanklikbare rondes.
 * `active` is de ronde waar de begeleider nu is (gemarkeerd met ‘Nu’).
 */
export function RoundProgressBar({
  rounds,
  view,
  active,
  onSelect,
}: {
  rounds: SessionRoundDef[];
  view: number;
  active: number;
  onSelect: (n: number) => void;
}) {
  const total = rounds.length;
  const pct = Math.round((view / total) * 100);
  return (
    <nav aria-label="Rondes" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        <span className="text-km-green">
          Ronde {view} van {total}
        </span>
        <span className="text-km-muted">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Voortgang door de rondes"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={view}
        aria-valuetext={`Ronde ${view} van ${total}`}
        className="h-3 w-full overflow-hidden rounded-full bg-km-line"
      >
        <div className="h-full rounded-full bg-km-yellow transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className="grid grid-cols-6 gap-1">
        {rounds.map((r) => {
          const isView = r.number === view;
          const isActive = r.number === active;
          return (
            <li key={r.number}>
              <button
                type="button"
                onClick={() => onSelect(r.number)}
                aria-current={isView ? "step" : undefined}
                className={cn(
                  "flex min-h-11 w-full flex-col items-center justify-start gap-1 rounded-lg px-1 py-1.5 text-center text-xs leading-tight",
                  isView ? "bg-km-green text-white" : "text-km-text hover:bg-km-softgreen",
                )}
              >
                <span className="font-bold">
                  <span className="sr-only">Ronde </span>
                  {r.number}
                </span>
                <span className="sr-only md:not-sr-only">{r.title}</span>
                {isActive && (
                  <span
                    className={cn("rounded-full px-1.5 text-[0.7rem] font-bold", isView ? "bg-white text-km-green" : "bg-km-yellow text-km-text")}
                  >
                    Nu<span className="sr-only">: hier is de begeleider</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Pijltjes om naar de vorige of volgende ronde te gaan. */
export function RoundArrows({
  rounds,
  view,
  onSelect,
  className,
}: {
  rounds: SessionRoundDef[];
  view: number;
  onSelect: (n: number) => void;
  className?: string;
}) {
  const prev = rounds[view - 2];
  const next = rounds[view];
  return (
    <div className={cn("flex items-stretch justify-between gap-3", className)}>
      {prev ? (
        <Button type="button" variant="outline" size="lg" onClick={() => onSelect(prev.number)} className="min-w-0">
          <ArrowLeft aria-hidden />
          <span className="truncate">
            Vorige<span className="hidden sm:inline"> ronde</span>
          </span>
          <span className="sr-only">: {prev.title}</span>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button type="button" variant="outline" size="lg" onClick={() => onSelect(next.number)} className="min-w-0">
          <span className="truncate">
            Volgende<span className="hidden sm:inline"> ronde</span>
          </span>
          <span className="sr-only">: {next.title}</span>
          <ArrowRight aria-hidden />
        </Button>
      ) : (
        <span />
      )}
    </div>
  );
}

/**
 * Welke ronde een deelnemer bekijkt. Begint bij de ronde van de begeleider en springt mee
 * zodra de begeleider een andere ronde kiest; daartussen bladert de deelnemer zelf.
 */
export function useViewRound(active: number) {
  const [view, setView] = React.useState(active);
  const [prevActive, setPrevActive] = React.useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setView(active);
  }
  const select = React.useCallback((n: number) => {
    setView(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return [view, select] as const;
}
