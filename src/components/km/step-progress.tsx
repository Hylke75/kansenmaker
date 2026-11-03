"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { STEPS } from "@/lib/steps";
import { cn } from "@/lib/utils";

const TARGETS = [3, 1, 1, 1, 1, 1];

/** Voortgang van de ingelogde gebruiker per stap (eigen bijdragen tellen). */
export function useStepProgress() {
  const { currentUser } = useStore();
  const { strengths, audiences, needs, ideas, insights, picks } = useProjectData();
  const me = currentUser.id;
  const counts = [
    strengths.filter((x) => x.createdBy === me).length,
    audiences.filter((x) => x.createdBy === me).length,
    needs.filter((x) => x.createdBy === me).length,
    ideas.filter((x) => x.authorId === me && !x.archived).length,
    insights.filter((x) => x.createdBy === me).length,
    picks.filter((x) => x.createdBy === me).length,
  ];
  return counts.map((count, i) => ({ step: i + 1, count, target: TARGETS[i], done: count >= TARGETS[i] }));
}

/** Stappenbalk met de zes stappen. */
export function StepNav({ current, className = "mb-8" }: { current?: number; className?: string }) {
  const progress = useStepProgress();
  return (
    <nav aria-label="De zes stappen" className={className}>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((s, i) => {
          const done = progress[i].done;
          const active = current === s.number;
          return (
            <li key={s.number}>
              <Link
                href={`/stappen/${s.number}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-full min-h-11 flex-col gap-1 rounded-xl border p-2 text-sm transition-colors",
                  active ? "border-km-green bg-km-green text-white" : "border-km-line bg-white text-km-text hover:border-km-green",
                )}
              >
                <span className="flex items-center gap-1 font-bold">
                  {s.number}
                  {done && (
                    <>
                      <Check className={cn("size-4", active ? "text-white" : "text-km-green")} aria-hidden />
                      <span className="sr-only">(gedaan)</span>
                    </>
                  )}
                </span>
                <span className="leading-tight">{s.short}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** De eerstvolgende stap die nog niet gedaan is (undefined als alles gedaan is). */
export function useNextStep() {
  const progress = useStepProgress();
  const doneCount = progress.filter((p) => p.done).length;
  const next = progress.find((p) => !p.done);
  const step = next ? STEPS[next.step - 1] : undefined;
  return {
    doneCount,
    step,
    href: step ? `/stappen/${step.number}` : "/stappen/1",
    label: doneCount === 0 ? "Begin bij stap 1" : step ? `Verder met stap ${step.number}` : "Bekijk de zes stappen",
  };
}
