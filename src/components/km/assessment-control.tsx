"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { Check, HelpCircle, X } from "lucide-react";
import type { AssessmentValue } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AssessmentValue; symbol: string; label: string; Icon: typeof Check; active: string }[] = [
  { value: "aannemelijk", symbol: "✓", label: "Aannemelijk", Icon: Check, active: "border-[#0c5536] bg-[#dcefe4] text-[#0c5536]" },
  { value: "onbekend", symbol: "?", label: "Onbekend", Icon: HelpCircle, active: "border-[#6b4a00] bg-km-warning-soft text-km-warning-text" },
  { value: "obstakel", symbol: "×", label: "Obstakel", Icon: X, active: "border-km-danger bg-km-danger-soft text-km-danger" },
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
 * Radiogroep: Tab gaat naar de groep, pijltjestoetsen kiezen.
 */
export function AssessmentControl({ question, help, value, onChange, disabled }: AssessmentControlProps) {
  const labelId = React.useId();
  const helpId = React.useId();
  return (
    <div className="rounded-2xl border border-km-line bg-white p-5">
      <p id={labelId} className="font-heading text-lg font-bold text-km-green">
        {question}
      </p>
      {help && (
        <p id={helpId} className="mt-1 text-sm text-km-muted">
          {help}
        </p>
      )}
      <RadioGroupPrimitive.Root
        value={value ?? ""}
        onValueChange={(v) => onChange(v as AssessmentValue)}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={help ? helpId : undefined}
        orientation="horizontal"
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((o) => (
          <RadioGroupPrimitive.Item
            key={o.value}
            value={o.value}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-2 text-sm font-semibold transition-colors sm:text-base",
              "border-km-line bg-white text-km-text hover:border-km-green disabled:cursor-not-allowed disabled:opacity-60",
              value === o.value && o.active,
            )}
          >
            <span aria-hidden className="text-lg leading-none">{o.symbol}</span>
            <span>{o.label}</span>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
