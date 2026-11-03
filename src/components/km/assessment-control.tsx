"use client";

import * as React from "react";
import type { AssessmentValue } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AssessmentValue; symbol: string; label: string; active: string }[] = [
  { value: "aannemelijk", symbol: "✓", label: "Aannemelijk", active: "peer-checked:border-[#0c5536] peer-checked:bg-[#dcefe4] peer-checked:text-[#0c5536]" },
  { value: "onbekend", symbol: "?", label: "Onbekend", active: "peer-checked:border-[#6b4a00] peer-checked:bg-km-warning-soft peer-checked:text-km-warning-text" },
  { value: "obstakel", symbol: "×", label: "Obstakel", active: "peer-checked:border-km-danger peer-checked:bg-km-danger-soft peer-checked:text-km-danger" },
];

export const ASSESSMENT_LABEL: Record<AssessmentValue, string> = {
  aannemelijk: "✓ Aannemelijk",
  onbekend: "? Onbekend",
  obstakel: "× Obstakel",
};

interface AssessmentControlProps {
  question: string;
  help?: string;
  value: AssessmentValue | undefined;
  onChange: (value: AssessmentValue) => void;
  disabled?: boolean;
}

/**
 * AssessmentControl — één stelling met de keuze ✓ ? ×.
 * Native radioknoppen in een fieldset: Tab gaat naar de groep, pijltjestoetsen
 * kiezen, de stelling is de legend. Betrouwbaar in alle browsers en schermlezers.
 */
export function AssessmentControl({ question, help, value, onChange, disabled }: AssessmentControlProps) {
  const name = React.useId();
  const helpId = `${name}-help`;
  return (
    <fieldset className="rounded-2xl border border-km-line bg-white p-5" aria-describedby={help ? helpId : undefined} disabled={disabled}>
      <legend className="float-left w-full font-heading text-lg font-bold text-km-green">{question}</legend>
      {help && (
        <p id={helpId} className="clear-left pt-1 text-sm text-km-muted">
          {help}
        </p>
      )}
      <div className="clear-left grid grid-cols-3 gap-2 pt-4">
        {OPTIONS.map((o) => (
          <label key={o.value} className="relative block min-w-0 cursor-pointer has-[:disabled]:cursor-not-allowed">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-km-line bg-white px-1 py-1.5 text-sm font-semibold text-km-text transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:px-2 sm:text-base",
                "peer-hover:border-km-green peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-km-green peer-disabled:opacity-60",
                o.active,
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {o.symbol}
              </span>
              <span>{o.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
