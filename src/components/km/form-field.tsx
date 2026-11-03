"use client";

import * as React from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  /** Render-prop krijgt id en aria-props voor het invoerelement */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}

/** Veld met label, hulptekst en foutmelding (gekoppeld via aria-describedby). */
export function FormField({ label, hint, error, optional, className, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-base font-semibold text-km-green">
        {label}
        {optional && <span className="ml-1 font-normal text-km-muted">(optioneel)</span>}
      </Label>
      {hint && (
        <p id={hintId} className="-mt-1 text-sm text-km-muted">
          {hint}
        </p>
      )}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm font-semibold text-km-danger">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/** Foutoverzicht bovenaan een formulier; krijgt focus bij verzenden. */
export const ErrorSummary = React.forwardRef<HTMLDivElement, { errors: string[] }>(function ErrorSummary({ errors }, ref) {
  if (errors.length === 0) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-xl border-2 border-km-danger bg-km-danger-soft p-4 text-km-text"
    >
      <p className="flex items-center gap-2 font-bold text-km-danger">
        <CircleAlert className="size-5" aria-hidden />
        Controleer het volgende
      </p>
      <ul className="mt-2 list-disc pl-6">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
});
