"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { FormField } from "@/components/km/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Antwoord in de ronde ‘Doelgroepen en behoeften’: één doelgroep met één of meer behoeften.
 * Opgeslagen als leesbare tekst (eerste regel de doelgroep, daarna ‘– behoefte’ per regel),
 * zodat begeleiders en exports het direct kunnen lezen.
 */
export interface AudienceNeeds {
  audience: string;
  needs: string[];
}

const BULLET = "– ";

export function formatAudienceNeeds({ audience, needs }: AudienceNeeds) {
  return [audience.trim(), ...needs.map((n) => n.trim()).filter(Boolean).map((n) => BULLET + n)].join("\n");
}

export function parseAudienceNeeds(text: string): AudienceNeeds {
  const [first = "", ...rest] = text.split("\n");
  const needs = rest.map((l) => l.replace(/^\s*[–\-•]\s*/, "").trim()).filter(Boolean);
  return { audience: first.trim(), needs };
}

/** Weergave van een opgeslagen doelgroep-antwoord. */
export function AudienceNeedsView({ text }: { text: string }) {
  const { audience, needs } = parseAudienceNeeds(text);
  return (
    <div>
      <p className="text-lg font-semibold text-km-green">{audience}</p>
      {needs.length > 0 && (
        <ul className="mt-1 ml-5 list-disc">
          {needs.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Formulier: doelgroep + behoeften (minstens één). */
export function AudienceNeedsForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  submitIcon,
}: {
  initial?: AudienceNeeds;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  submitIcon?: React.ReactNode;
}) {
  const [audience, setAudience] = React.useState(initial?.audience ?? "");
  const [needs, setNeeds] = React.useState<string[]>(initial?.needs.length ? initial.needs : [""]);
  const [errors, setErrors] = React.useState<{ audience?: string; needs?: string; total?: string }>({});
  const lastNeed = React.useRef<HTMLInputElement>(null);
  const [focusLast, setFocusLast] = React.useState(false);
  React.useEffect(() => {
    if (focusLast) {
      lastNeed.current?.focus();
      setFocusLast(false); // eslint-disable-line react-hooks/set-state-in-effect -- eenmalig focus zetten na toevoegen
    }
  }, [focusLast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const filled = needs.map((n) => n.trim()).filter(Boolean);
    const text = formatAudienceNeeds({ audience, needs: filled });
    const errs = {
      audience: !audience.trim() ? "Vul een doelgroep in." : undefined,
      needs: filled.length === 0 ? "Beschrijf minstens één behoefte." : undefined,
      total: text.length > 500 ? "Houd het kort: samen maximaal 500 tekens." : undefined,
    };
    setErrors(errs);
    if (errs.audience || errs.needs || errs.total) return;
    if (await onSubmit(text)) {
      if (!initial) {
        setAudience("");
        setNeeds([""]);
      }
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <FormField label="Doelgroep" hint="Bijvoorbeeld ‘Internationale medewerkers’ of ‘Basisscholen’." error={errors.audience}>
        {(p) => <Input {...p} value={audience} onChange={(e) => setAudience(e.target.value)} className="bg-white text-lg" />}
      </FormField>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-base font-semibold text-km-green">Wat heeft deze doelgroep nodig?</legend>
        {needs.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              ref={i === needs.length - 1 ? lastNeed : undefined}
              aria-label={`Behoefte ${i + 1}`}
              aria-invalid={!!errors.needs && !n.trim()}
              value={n}
              onChange={(e) => setNeeds(needs.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={i === 0 ? "Bijvoorbeeld ‘Nieuwe mensen in de stad leren kennen’" : "Nog een behoefte"}
              className="bg-white"
            />
            {needs.length > 1 && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Verwijder behoefte ${i + 1}`} onClick={() => setNeeds(needs.filter((_, j) => j !== i))}>
                <X aria-hidden />
              </Button>
            )}
          </div>
        ))}
        {errors.needs && (
          <p className="text-sm font-semibold text-km-danger" role="alert">
            {errors.needs}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => {
            setNeeds([...needs, ""]);
            setFocusLast(true);
          }}
        >
          <Plus aria-hidden />
          Nog een behoefte
        </Button>
      </fieldset>
      {errors.total && (
        <p className="text-sm font-semibold text-km-danger" role="alert">
          {errors.total}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="self-stretch sm:self-start" disabled={busy}>
          {submitIcon}
          {busy ? "Bezig…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Annuleren
          </Button>
        )}
      </div>
    </form>
  );
}
