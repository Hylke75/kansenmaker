"use client";

import * as React from "react";
import { ArrowRight, CircleCheck, Pencil, Plus, Send } from "lucide-react";
import type { SessionRoundDef } from "@/lib/types";
import { AudienceNeedsForm, AudienceNeedsView, parseAudienceNeeds } from "@/components/km/audience-needs";
import { FormField } from "@/components/km/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface OwnAnswer {
  id: string;
  text: string;
  hidden?: boolean;
}

/**
 * Invoer van één ronde in een werksessie. Zonder antwoord: het invulveld. Na versturen verdwijnt
 * het veld en volgt een melding met ‘Voeg nog … toe’ en ‘Naar de volgende ronde’. Eigen antwoorden
 * blijven zichtbaar en zijn te bewerken. Met `round.minAnswers` kun je pas verder als je genoeg
 * antwoorden hebt; met `round.linkToRound` voeg je antwoorden toe per antwoord uit die ronde
 * (bijv. ideeën per doelgroep).
 */
export function AnswerPanel(props: {
  round: SessionRoundDef;
  answers: (OwnAnswer & { parentId?: string })[];
  /** Eigen antwoorden uit `round.linkToRound` (bijv. doelgroepen of ideeën) */
  parents?: (OwnAnswer & { parentId?: string })[];
  /** Eigen doelgroepen (ronde 2), om ideeën per doelgroep te groeperen */
  grandparents?: OwnAnswer[];
  /** Nieuw antwoord (optioneel bij een doelgroep); true bij succes */
  onSubmit: (text: string, parentId?: string) => Promise<boolean>;
  /** Antwoord bewerken; true bij succes */
  onSave: (id: string, text: string) => Promise<boolean>;
  /** Naar de volgende ronde (ontbreekt in de laatste invoerronde) */
  onNext?: () => void;
  /** Naar een andere ronde (bijv. terug naar de doelgroepen) */
  onGoto?: (round: number) => void;
}) {
  if (props.round.linkToRound && props.parents && props.parents.length > 0) return <LinkedAnswerPanel {...props} parents={props.parents} />;
  return <SimpleAnswerPanel {...props} />;
}

function SimpleAnswerPanel({
  round,
  answers,
  parents,
  onSubmit,
  onSave,
  onNext,
  onGoto,
}: React.ComponentProps<typeof AnswerPanel>) {
  const [adding, setAdding] = React.useState(false);
  const [justSent, setJustSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const statusRef = React.useRef<HTMLDivElement>(null);
  const min = round.minAnswers ?? 0;
  const missing = Math.max(0, min - answers.length);
  const showForm = answers.length === 0 || adding;
  const structured = round.structured === "doelgroep";
  const unit = structured ? ["doelgroep", "doelgroepen"] : ["antwoord", "antwoorden"];
  const Form = round.structured === "kans" ? KindTextForm : TextAnswerForm;

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
      {round.linkToRound && parents && parents.length === 0 && onGoto && (
        <p className="rounded-xl bg-km-warning-soft p-4 text-km-warning-text">
          {round.linkToRound === 2
            ? "Je hebt nog geen doelgroepen ingevuld. Ideeën koppel je aan je doelgroepen."
            : "Je hebt nog geen ideeën ingevuld. Kansen en bedreigingen koppel je aan je ideeën."}{" "}
          <button type="button" className="font-semibold underline underline-offset-4" onClick={() => onGoto(round.linkToRound!)}>
            Ga naar ronde {round.linkToRound}
          </button>
        </p>
      )}
      {min > 0 && (
        <MinProgress count={answers.length} min={min} unit={unit} />
      )}
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
            <Form
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
            {missing > 0
              ? `Opgeslagen! Vul nog ${missing} ${missing === 1 ? unit[0] : unit[1]} in om verder te kunnen.`
              : justSent
                ? "Opgeslagen! Wat wil je nu doen?"
                : "Je hebt deze ronde ingevuld."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" variant={missing > 0 ? "default" : "outline"} size="lg" onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              {round.addLabel ?? "Voeg nog iets toe"}
            </Button>
            {onNext && missing === 0 && (
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
              <AnswerItem key={a.id} answer={a} kind={round.structured} label={round.inputLabel} onSave={onSave} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Voortgang naar het verplichte minimum, bijv. ‘2 van minimaal 5 doelgroepen’. */
function MinProgress({ count, min, unit }: { count: number; min: number; unit: string[] }) {
  const done = count >= min;
  return (
    <div className="flex flex-col gap-2">
      <p className={cn("font-semibold", done ? "text-km-green" : "text-km-text")}>
        {done ? <CircleCheck className="mr-1 inline size-5 align-text-bottom" aria-hidden /> : null}
        {Math.min(count, min)} van minimaal {min} {unit[1]} {done ? "ingevuld" : "(verplicht)"}
      </p>
      <div
        role="progressbar"
        aria-label={`Ingevulde ${unit[1]}`}
        aria-valuemin={0}
        aria-valuemax={min}
        aria-valuenow={Math.min(count, min)}
        className="h-2 w-full overflow-hidden rounded-full bg-km-line"
      >
        <div className={cn("h-full rounded-full", done ? "bg-km-green" : "bg-km-yellow")} style={{ width: `${Math.min(100, (count / min) * 100)}%` }} />
      </div>
    </div>
  );
}

/**
 * Antwoorden per eerder antwoord: ideeën per doelgroep (ronde 3), of kansen en bedreigingen per
 * idee, gegroepeerd per doelgroep (ronde 5).
 */
function LinkedAnswerPanel({
  round,
  answers,
  parents,
  grandparents = [],
  onSubmit,
  onSave,
  onNext,
}: React.ComponentProps<typeof AnswerPanel> & { parents: (OwnAnswer & { parentId?: string })[] }) {
  const [open, setOpen] = React.useState<string | null>(answers.length === 0 ? parents[0]?.id ?? null : null);
  const [busy, setBusy] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const perIdea = round.linkToRound === 3;
  const Form = round.structured === "kans" ? KindTextForm : TextAnswerForm;
  const loose = answers.filter((a) => !a.parentId || !parents.some((p) => p.id === a.parentId));

  const submit = async (text: string, parentId?: string) => {
    const key = parentId ?? "los";
    setBusy(true);
    const ok = await onSubmit(text, parentId);
    setBusy(false);
    if (ok) {
      // Alleen dit formulier sluiten; een intussen geopend ander formulier blijft open
      setOpen((cur) => (cur === key ? null : cur));
      setLastSaved(key);
    }
    return ok;
  };

  const block = (key: string, title: React.ReactNode, list: typeof answers, parentId?: string) => (
    <li key={key} className="rounded-2xl border border-km-line bg-white p-5">
      {title}
      {list.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {list.map((a) => (
            <AnswerItem key={a.id} answer={a} kind={round.structured} label={round.inputLabel} onSave={onSave} />
          ))}
        </ul>
      )}
      {lastSaved === (parentId ?? "los") && open === null && (
        <p role="status" className="mt-3 flex items-center gap-2 font-semibold text-km-green">
          <CircleCheck className="size-5" aria-hidden />
          Opgeslagen!
        </p>
      )}
      {open === key ? (
        <div className="mt-4 rounded-xl bg-km-softgreen p-4">
          <Form label={round.inputLabel} busy={busy} onSubmit={(t) => submit(t, parentId)} onCancel={() => setOpen(null)} />
        </div>
      ) : (
        <Button type="button" variant="outline" className="mt-4" onClick={() => setOpen(key)}>
          <Plus aria-hidden />
          {perIdea
            ? list.length === 0
              ? "Voeg een kans, bedreiging of vraag toe"
              : "Voeg nog een kans, bedreiging of vraag toe"
            : list.length === 0
              ? "Voeg een idee toe"
              : (round.addLabel ?? "Voeg nog een idee toe")}
          <span className="sr-only"> {perIdea ? "bij dit idee" : parentId ? "voor deze doelgroep" : "zonder doelgroep"}</span>
        </Button>
      )}
    </li>
  );

  const ideaBlock = (p: OwnAnswer) =>
    block(
      p.id,
      <div>
        <p className="mb-1 text-sm font-semibold tracking-wide text-km-muted uppercase">Idee</p>
        <p className="text-lg font-semibold whitespace-pre-line text-km-green">{p.text}</p>
      </div>,
      answers.filter((a) => a.parentId === p.id),
      p.id,
    );

  if (perIdea) {
    // Ideeën gegroepeerd per doelgroep
    const groups = grandparents
      .map((g) => ({ g, ideas: parents.filter((p) => p.parentId === g.id) }))
      .filter((x) => x.ideas.length > 0);
    const ungrouped = parents.filter((p) => !p.parentId || !grandparents.some((g) => g.id === p.parentId));
    return (
      <div className="flex flex-col gap-6">
        <p className="text-lg">Voeg bij je ideeën uit ronde 3 kansen, bedreigingen of vragen toe.</p>
        {groups.map(({ g, ideas }) => (
          <section key={g.id} aria-label={`Doelgroep: ${g.text.split("\n")[0]}`} className="flex flex-col gap-3 rounded-2xl bg-km-softgreen p-4 md:p-5">
            <div>
              <p className="mb-1 text-sm font-semibold tracking-wide text-km-muted uppercase">Doelgroep</p>
              <AudienceNeedsView text={g.text} />
            </div>
            <ul className="flex flex-col gap-3">{ideas.map(ideaBlock)}</ul>
          </section>
        ))}
        {ungrouped.length > 0 && (
          <section aria-label="Ideeën zonder doelgroep" className="flex flex-col gap-3 rounded-2xl bg-km-softgreen p-4 md:p-5">
            <p className="font-semibold text-km-green">Ideeën zonder doelgroep</p>
            <ul className="flex flex-col gap-3">{ungrouped.map(ideaBlock)}</ul>
          </section>
        )}
        {onNext && answers.length > 0 && (
          <Button type="button" size="lg" className="self-start" onClick={onNext}>
            Naar de volgende ronde
            <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">Bedenk ideeën bij de doelgroepen die je in ronde {round.linkToRound} hebt ingevuld.</p>
      <ul className="flex flex-col gap-4">
        {parents.map((p) =>
          block(
            p.id,
            <div>
              <p className="mb-1 text-sm font-semibold tracking-wide text-km-muted uppercase">Doelgroep</p>
              <AudienceNeedsView text={p.text} />
            </div>,
            answers.filter((a) => a.parentId === p.id),
            p.id,
          ),
        )}
        {block("los", <p className="font-semibold text-km-green">Idee zonder doelgroep</p>, loose)}
      </ul>
      {onNext && answers.length > 0 && (
        <Button type="button" size="lg" className="self-start" onClick={onNext}>
          Naar de volgende ronde
          <ArrowRight aria-hidden />
        </Button>
      )}
    </div>
  );
}

/* Kans, bedreiging of vraag: opgeslagen als ‘Kans – tekst’. */
const KINDS = ["Kans", "Bedreiging", "Vraag"] as const;
type Kind = (typeof KINDS)[number];
const KIND_HINT: Record<Kind, string> = {
  Kans: "wat maakt het kansrijk?",
  Bedreiging: "wat kan het lastig maken?",
  Vraag: "wat moeten we eerst uitzoeken?",
};
export function parseKind(text: string): { kind: Kind | null; text: string } {
  const m = /^(Kans|Bedreiging|Vraag) – ([\s\S]*)$/.exec(text);
  return m ? { kind: m[1] as Kind, text: m[2] } : { kind: null, text };
}

function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
        kind === "Kans" ? "bg-km-green text-white" : kind === "Bedreiging" ? "bg-km-warning-soft text-km-warning-text" : "bg-km-softgreen text-km-green",
      )}
    >
      {kind}
    </span>
  );
}

function KindTextForm({
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
  const parsed = parseKind(initial);
  const [kind, setKind] = React.useState<Kind>(parsed.kind ?? "Kans");
  const name = React.useId();
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-base font-semibold text-km-green">Wat wil je toevoegen?</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label
              key={k}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-km-line has-[:checked]:ring-2 has-[:checked]:ring-km-green"
            >
              <input type="radio" name={name} value={k} checked={kind === k} onChange={() => setKind(k)} className="size-4 accent-[var(--color-km-green)]" />
              <span>
                <span className="font-semibold">{k}</span>
                <span className="text-sm text-km-muted"> — {KIND_HINT[k]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextAnswerForm
        label={label === "Kans, bedreiging of vraag" ? "Toelichting" : label}
        initial={parsed.text}
        submitLabel={submitLabel}
        busy={busy}
        maxLength={480}
        onSubmit={(t) => onSubmit(`${kind} – ${t}`)}
        onCancel={onCancel}
      />
    </div>
  );
}

function TextAnswerForm({
  label,
  initial = "",
  submitLabel = "Verstuur",
  busy,
  maxLength = 500,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  submitLabel?: string;
  busy?: boolean;
  maxLength?: number;
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
        if (text.length > maxLength) return setError(`Houd het kort: maximaal ${maxLength} tekens.`);
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
  kind,
  label,
  onSave,
}: {
  answer: OwnAnswer;
  kind?: SessionRoundDef["structured"];
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
        {kind === "doelgroep" ? (
          <AudienceNeedsForm initial={parseAudienceNeeds(answer.text)} submitLabel="Bewaren" busy={busy} onSubmit={save} onCancel={() => setEditing(false)} />
        ) : kind === "kans" ? (
          <KindTextForm label={label} initial={answer.text} submitLabel="Bewaren" busy={busy} onSubmit={save} onCancel={() => setEditing(false)} />
        ) : (
          <TextAnswerForm label={`${label} (bewerken)`} initial={answer.text} submitLabel="Bewaren" busy={busy} onSubmit={save} onCancel={() => setEditing(false)} />
        )}
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-km-line">
      <div className="min-w-0">
        {kind === "doelgroep" ? (
          <AudienceNeedsView text={answer.text} />
        ) : kind === "kans" && parseKind(answer.text).kind ? (
          <p className="flex flex-col items-start gap-1 text-lg">
            <KindBadge kind={parseKind(answer.text).kind!} />
            <span className="whitespace-pre-line">{parseKind(answer.text).text}</span>
          </p>
        ) : (
          <p className="text-lg whitespace-pre-line">{answer.text}</p>
        )}
        {answer.hidden && <p className="mt-1 text-sm text-km-muted">(verborgen door begeleider)</p>}
      </div>
      <Button ref={editRef} type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        Bewerken
      </Button>
    </li>
  );
}

/** Korte context van een gekoppeld antwoord, bijv. ‘Doelgroep: Expats’ of ‘Idee: Verhalenwandeling’. */
export function answerContext(answer: { parentId?: string }, all: { id: string; round: number; text: string }[]) {
  const parent = answer.parentId ? all.find((a) => a.id === answer.parentId) : undefined;
  if (!parent) return null;
  const first = parent.text.split("\n")[0];
  const short = first.length > 70 ? `${first.slice(0, 67)}…` : first;
  return parent.round === 2 ? `Doelgroep: ${short}` : `Idee: ${short}`;
}
