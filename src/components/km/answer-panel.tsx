"use client";

import * as React from "react";
import { ArrowRight, CircleCheck, Pencil, Plus, Send } from "lucide-react";
import type { SessionRoundDef } from "@/lib/types";
import { AudienceNeedsForm, AudienceNeedsView, parseAudienceNeeds } from "@/components/km/audience-needs";
import { FormField } from "@/components/km/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface OwnAnswer {
  id: string;
  text: string;
  hidden?: boolean;
}

/**
 * Invoer van één ronde in een werksessie. Zonder antwoord: het invulveld. Na versturen verdwijnt
 * het veld en volgt een melding met ‘Voeg nog … toe’ en ‘Naar de volgende ronde’. Eigen antwoorden
 * blijven zichtbaar en zijn te bewerken.
 */
export function AnswerPanel({
  round,
  answers,
  onSubmit,
  onSave,
  onNext,
}: {
  round: SessionRoundDef;
  answers: OwnAnswer[];
  /** Nieuw antwoord; true bij succes */
  onSubmit: (text: string) => Promise<boolean>;
  /** Antwoord bewerken; true bij succes */
  onSave: (id: string, text: string) => Promise<boolean>;
  /** Naar de volgende ronde (ontbreekt in de laatste invoerronde) */
  onNext?: () => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [justSent, setJustSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const statusRef = React.useRef<HTMLDivElement>(null);
  const showForm = answers.length === 0 || adding;
  const structured = round.structured === "doelgroep";

  const submit = async (text: string) => {
    setBusy(true);
    const ok = await onSubmit(text);
    setBusy(false);
    if (ok) {
      setAdding(false);
      setJustSent(true);
      requestAnimationFrame(() => statusRef.current?.focus());
    }
    return ok;
  };

  return (
    <div className="flex flex-col gap-8">
      {showForm ? (
        <div className="rounded-2xl bg-km-softgreen p-5">
          {structured ? (
            <AudienceNeedsForm
              submitLabel="Verstuur"
              submitIcon={<Send aria-hidden />}
              busy={busy}
              onSubmit={submit}
              onCancel={answers.length > 0 ? () => setAdding(false) : undefined}
            />
          ) : (
            <TextAnswerForm
              label={round.inputLabel}
              busy={busy}
              onSubmit={submit}
              onCancel={answers.length > 0 ? () => setAdding(false) : undefined}
            />
          )}
        </div>
      ) : (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          className="flex flex-col gap-4 rounded-2xl border-2 border-km-green bg-white p-5 outline-none"
        >
          <p className="flex items-center gap-2 text-lg font-semibold text-km-green">
            <CircleCheck className="size-6 shrink-0" aria-hidden />
            {justSent ? "Opgeslagen! Wat wil je nu doen?" : "Je hebt deze ronde ingevuld."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" size="lg" onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              {round.addLabel ?? "Voeg nog iets toe"}
            </Button>
            {onNext && (
              <Button type="button" size="lg" onClick={onNext}>
                Naar de volgende ronde
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
      )}

      {answers.length > 0 && (
        <section aria-labelledby="mijn" className="flex flex-col gap-3">
          <h2 id="mijn" className="text-xl">
            {answers.length === 1 ? "Jouw antwoord" : `Jouw antwoorden (${answers.length})`}
          </h2>
          <ul className="flex flex-col gap-3">
            {answers.map((a) => (
              <AnswerItem key={a.id} answer={a} structured={structured} label={round.inputLabel} onSave={onSave} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TextAnswerForm({
  label,
  initial = "",
  submitLabel = "Verstuur",
  busy,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [text, setText] = React.useState(initial);
  const [error, setError] = React.useState<string>();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (!text.trim()) return setError("Schrijf eerst je antwoord.");
        if (text.length > 500) return setError("Houd het kort: maximaal 500 tekens.");
        setError(undefined);
        if (await onSubmit(text.trim())) setText("");
      }}
    >
      <FormField label={label} error={error}>
        {(p) => (
          <Textarea
            {...p}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(undefined);
            }}
            rows={4}
            className="bg-white text-lg"
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="self-stretch sm:self-start" disabled={busy}>
          {submitLabel === "Verstuur" && <Send aria-hidden />}
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

function AnswerItem({
  answer,
  structured,
  label,
  onSave,
}: {
  answer: OwnAnswer;
  structured: boolean;
  label: string;
  onSave: (id: string, text: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const editRef = React.useRef<HTMLButtonElement>(null);

  const save = async (text: string) => {
    if (text === answer.text) {
      setEditing(false);
      return true;
    }
    setBusy(true);
    const ok = await onSave(answer.id, text);
    setBusy(false);
    if (ok) {
      setEditing(false);
      requestAnimationFrame(() => editRef.current?.focus());
    }
    return ok;
  };

  if (editing) {
    return (
      <li className="rounded-xl bg-km-softgreen p-4">
        {structured ? (
          <AudienceNeedsForm initial={parseAudienceNeeds(answer.text)} submitLabel="Bewaren" busy={busy} onSubmit={save} onCancel={() => setEditing(false)} />
        ) : (
          <TextAnswerForm label={`${label} (bewerken)`} initial={answer.text} submitLabel="Bewaren" busy={busy} onSubmit={save} onCancel={() => setEditing(false)} />
        )}
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-km-line">
      <div className="min-w-0">
        {structured ? <AudienceNeedsView text={answer.text} /> : <p className="text-lg whitespace-pre-line">{answer.text}</p>}
        {answer.hidden && <p className="mt-1 text-sm text-km-muted">(verborgen door begeleider)</p>}
      </div>
      <Button ref={editRef} type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        Bewerken
      </Button>
    </li>
  );
}
