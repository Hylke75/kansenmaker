"use client";

import * as React from "react";
import { Pause, Play, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fmt = (s: number) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/** Timerlogica, los van de weergave, zodat meerdere weergaven één klok delen. */
export function useTimer(duration: number) {
  const [total, setTotal] = React.useState(duration);
  const [remaining, setRemaining] = React.useState(duration);
  const [running, setRunning] = React.useState(false);
  const endRef = React.useRef<number | null>(null);

  // Nieuwe duur (andere ronde): opnieuw beginnen.
  const [prevDuration, setPrevDuration] = React.useState(duration);
  if (prevDuration !== duration) {
    setPrevDuration(duration);
    setTotal(duration);
    setRemaining(duration);
    setRunning(false);
  }

  React.useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.round(((endRef.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setRunning(false);
    }, 250);
    return () => window.clearInterval(t);
  }, [running]);

  return {
    total,
    remaining,
    running,
    done: remaining === 0,
    toggle: () => {
      if (!running) endRef.current = Date.now() + remaining * 1000;
      setRunning(!running);
    },
    addMinute: () => {
      setTotal((t) => t + 60);
      setRemaining((r) => r + 60);
      if (endRef.current) endRef.current += 60_000;
    },
    reset: () => {
      setRunning(false);
      setTotal(duration);
      setRemaining(duration);
    },
  };
}

export type TimerState = ReturnType<typeof useTimer>;

interface TimerProps {
  /** Duur in seconden (als er geen gedeelde `timer` is) */
  duration?: number;
  /** Gedeelde timer uit useTimer() */
  timer?: TimerState;
  large?: boolean;
  className?: string;
  readOnly?: boolean;
  /** Mijlpalen aankondigen voor schermlezers (zet uit bij een tweede weergave) */
  announce?: boolean;
}

/**
 * Timer — aftellen per ronde met start/pauze, +1 minuut en opnieuw.
 * Schermlezers horen alleen mijlpalen (5 min, 1 min, tijd om), niet elke seconde.
 */
export function Timer({ duration = 0, timer: shared, large, className, readOnly, announce = true }: TimerProps) {
  const own = useTimer(duration);
  const t = shared ?? own;
  const announcement =
    t.remaining === 0 ? "De tijd is om" : t.running && t.remaining <= 60 ? "Nog 1 minuut" : t.running && t.remaining <= 300 ? "Nog 5 minuten" : "";
  const pct = t.total > 0 ? (t.remaining / t.total) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="timer"
        aria-label={`Resterende tijd ${fmt(t.remaining)}`}
        className={cn(
          "font-heading font-bold tabular-nums",
          large ? "text-7xl md:text-[9rem] md:leading-none" : "text-5xl",
          t.done ? "text-km-danger" : "text-km-green",
        )}
      >
        {t.done ? "Tijd is om" : fmt(t.remaining)}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-km-line" aria-hidden>
        <div className={cn("h-full rounded-full transition-[width]", t.done ? "bg-km-danger" : "bg-km-yellow")} style={{ width: `${pct}%` }} />
      </div>
      {announce && (
        <p className="sr-only" aria-live="assertive">
          {announcement}
        </p>
      )}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button variant={t.running ? "outline" : "secondary"} onClick={t.toggle} disabled={t.done}>
            {t.running ? <Pause aria-hidden /> : <Play aria-hidden />}
            {t.running ? "Pauzeer" : t.remaining < t.total ? "Hervat" : "Start timer"}
          </Button>
          <Button variant="outline" onClick={t.addMinute}>
            <Plus aria-hidden />1 minuut
          </Button>
          <Button variant="ghost" onClick={t.reset}>
            <RotateCcw aria-hidden />
            Opnieuw
          </Button>
        </div>
      )}
    </div>
  );
}
