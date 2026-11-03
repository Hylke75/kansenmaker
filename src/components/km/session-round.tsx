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
 * `active` is de ronde waar de begeleider nu is (gemarkeerd met ‘Nu’); weglaten bij een online
 * sessie in eigen tempo.
 */
export function RoundProgressBar({
  rounds,
  view,
  active,
  maxRound,
  onSelect,
}: {
  rounds: SessionRoundDef[];
  view: number;
  active?: number;
  /** Hoogste ronde die nu bereikbaar is (verplichte rondes eerst afmaken) */
  maxRound?: number;
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
          const locked = maxRound !== undefined && r.number > maxRound;
          return (
            <li key={r.number}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onSelect(r.number)}
                aria-current={isView ? "step" : undefined}
                className={cn(
                  "flex min-h-11 w-full flex-col items-center justify-start gap-1 rounded-lg px-1 py-1.5 text-center text-xs leading-tight",
                  isView ? "bg-km-green text-white" : "text-km-text hover:bg-km-softgreen",
                  locked && "cursor-not-allowed opacity-50 hover:bg-transparent",
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
                {locked && <span className="sr-only"> (nog niet beschikbaar)</span>}
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
  blocked,
}: {
  rounds: SessionRoundDef[];
  view: number;
  onSelect: (n: number) => void;
  className?: string;
  /** Uitleg waarom je nog niet verder kunt (knop ‘Volgende’ uitgeschakeld) */
  blocked?: string;
}) {
  const prev = rounds[view - 2];
  const next = rounds[view];
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {next && blocked && <p className="text-right text-sm font-semibold text-km-muted">{blocked}</p>}
    <div className="flex items-stretch justify-between gap-3">
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
        <Button type="button" variant="outline" size="lg" disabled={!!blocked} onClick={() => onSelect(next.number)} className="min-w-0">
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
    </div>
  );
}

/** Hoogste bereikbare ronde: een ronde met `minAnswers` moet eerst voldoende antwoorden hebben. */
export function maxReachableRound(rounds: SessionRoundDef[], countFor: (round: number) => number) {
  const gate = rounds.find((r) => r.minAnswers && countFor(r.number) < r.minAnswers);
  return gate ? gate.number : rounds.length;
}

/**
 * Welke ronde een deelnemer bekijkt. Met begeleider (`follow`): begint bij diens ronde en springt
 * mee zodra de begeleider een andere ronde kiest. Online in eigen tempo: begint bij `start` en
 * de deelnemer bladert helemaal zelf.
 */
export function useViewRound(start: number, follow: boolean) {
  const [view, setView] = React.useState(start);
  const [prevStart, setPrevStart] = React.useState(start);
  if (follow && start !== prevStart) {
    setPrevStart(start);
    setView(start);
  }
  const select = React.useCallback((n: number) => {
    setView(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return [view, select] as const;
}
