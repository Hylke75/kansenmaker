"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "./form-field";
import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  /** Retourneert foutmeldingen; leeg = geldig */
  validate?: () => string[];
  content: React.ReactNode;
}

interface StepFormProps {
  heading: string;
  steps: Step[];
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  /** Wordt aangeroepen bij stapwissel zodat het formulier fouten kan tonen */
  onValidationChange?: (showErrors: boolean) => void;
  /** Bezig met opslaan: verzendknop uitgeschakeld */
  submitting?: boolean;
}

/**
 * StepForm — formulier in stappen met voortgang, validatie per stap,
 * foutoverzicht en focusbeheer (kop van de nieuwe stap krijgt focus).
 */
export function StepForm({ heading, steps, submitLabel, onSubmit, onCancel, onValidationChange, submitting }: StepFormProps) {
  const [index, setIndex] = React.useState(0);
  const [errors, setErrors] = React.useState<string[]>([]);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);
  const firstRender = React.useRef(true);
  const step = steps[index];
  const last = index === steps.length - 1;

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  React.useEffect(() => {
    if (errors.length) errorRef.current?.focus();
  }, [errors]);

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = step.validate?.() ?? [];
    setErrors(errs);
    onValidationChange?.(errs.length > 0);
    if (errs.length) return;
    if (last) onSubmit();
    else setIndex(index + 1);
  };

  const prev = () => {
    setErrors([]);
    onValidationChange?.(false);
    setIndex(Math.max(0, index - 1));
  };

  return (
    <form onSubmit={next} noValidate className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-km-muted">
          Stap {index + 1} van {steps.length}
        </p>
        <ol className="mt-3 flex gap-2" aria-label="Voortgang">
          {steps.map((s, i) => (
            <li key={s.title} className="flex-1">
              <span
                className={cn(
                  "block h-2 rounded-full",
                  i < index ? "bg-km-green" : i === index ? "bg-km-yellow" : "bg-km-line",
                )}
                aria-hidden
              />
              <span className="mt-2 hidden items-center gap-1 text-sm sm:flex">
                {i < index && <Check className="size-4 text-km-green" aria-hidden />}
                <span className={i === index ? "font-semibold text-km-green" : "text-km-muted"}>{s.title}</span>
              </span>
              <span className="sr-only">
                {s.title}: {i < index ? "voltooid" : i === index ? "huidige stap" : "nog te doen"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-6">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl outline-none focus-visible:outline-3">
          <span className="sr-only">{heading}, stap {index + 1}: </span>
          {step.title}
        </h2>
        <ErrorSummary ref={errorRef} errors={errors} />
        {step.content}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-km-line pt-6 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          {index > 0 ? (
            <Button type="button" variant="outline" onClick={prev}>
              <ArrowLeft aria-hidden />
              Vorige
            </Button>
          ) : (
            onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Annuleren
              </Button>
            )
          )}
        </div>
        <Button type="submit" disabled={submitting}>
          {last ? (submitting ? "Bezig met opslaan…" : submitLabel) : "Volgende"}
          {last ? <Check aria-hidden /> : <ArrowRight aria-hidden />}
        </Button>
      </div>
    </form>
  );
}
