"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Lightbulb, Pencil, Plus, Star, Trash2, Users, X } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { MICROCOPY, STEP6_NOTE, STEPS, type StepText } from "@/lib/steps";
import { authorName } from "@/lib/authors";
import type { Idea } from "@/lib/types";
import { RequireProject } from "@/components/km/guards";
import { StepNav, useStepProgress } from "@/components/km/step-progress";
import { PrimaryButton } from "@/components/km/primary-button";
import { EmptyState } from "@/components/km/empty-state";
import { FormField } from "@/components/km/form-field";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { IdeaCard } from "@/components/km/idea-card";
import { InsightBadge, InsightForm, InsightList } from "@/components/km/insights";
import { notify } from "@/components/km/toast";
import { AudienceDialog } from "@/components/screens/audiences";
import { DoubtNote, SelectedNote } from "@/components/km/notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Scherm                                                              */
/* ------------------------------------------------------------------ */

export function StepScreen({ step }: { step: number }) {
  return (
    <RequireProject>
      <StepInner step={step} />
    </RequireProject>
  );
}

function StepInner({ step }: { step: number }) {
  const text = STEPS[step - 1];
  const progress = useStepProgress()[step - 1];

  return (
    <div className="mx-auto max-w-3xl">
      <StepNav current={step} />
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold tracking-wide text-km-muted uppercase">
          Stap {step} van 6 · {text.short}
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-[2.75rem]">{text.title}</h1>
        <p className="mt-3 text-xl text-km-green">{text.question}</p>
        <p className="mt-4 rounded-xl bg-km-softgreen px-4 py-3">
          <span className="font-semibold text-km-green">Doel:</span> {text.goal}
        </p>
      </header>

      <StepIntro text={text} />

      <section aria-labelledby="opdracht" className="mt-10 rounded-2xl border-2 border-km-green bg-white p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="opdracht" className="text-2xl">
            Opdracht
          </h2>
          <p
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
              progress.done ? "bg-km-green text-white" : "bg-km-softgreen text-km-green",
            )}
          >
            {progress.done && <CircleCheck className="size-4" aria-hidden />}
            {step === 1 ? `${Math.min(progress.count, 3)} van minimaal 3` : progress.done ? "Gedaan" : "Nog niet gedaan"}
            {step !== 1 && progress.count > 0 && ` · ${progress.count} van jou`}
          </p>
        </div>
        <p className="mt-2 text-lg">{text.assignment}</p>
        {text.assignmentNote && <p className="mt-1 text-km-muted">{text.assignmentNote}</p>}
        <div className="mt-6">
          {step === 1 && <StrengthsStep />}
          {step === 2 && <AudiencesStep />}
          {step === 3 && <NeedsStep />}
          {step === 4 && <IdeasStep />}
          {step === 5 && <InsightsStep />}
          {step === 6 && <PicksStep />}
        </div>
      </section>

      <nav aria-label="Volgende of vorige stap" className="mt-10 flex flex-col-reverse gap-3 border-t border-km-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button asChild variant="outline">
            <Link href={`/stappen/${step - 1}`}>
              <ArrowLeft aria-hidden />
              Stap {step - 1}: {STEPS[step - 2].short}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/hoe-werkt-het">
              <ArrowLeft aria-hidden />
              Hoe werkt het?
            </Link>
          </Button>
        )}
        {step < 6 ? (
          <Button asChild>
            <Link href={`/stappen/${step + 1}`}>
              Naar stap {step + 1}: {STEPS[step].short}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/stappen/bedankt">
              Afronden
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </nav>
    </div>
  );
}

function StepIntro({ text }: { text: StepText }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 text-lg leading-relaxed">
        {text.intro.map((t) => (
          <p key={t}>{t}</p>
        ))}
        {text.criteria && (
          <ol className="ml-6 list-decimal space-y-1">
            {text.criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        )}
        {text.number === 6 && <p>{STEP6_NOTE}</p>}
      </div>
      {text.questions && (
        <section aria-labelledby="vragen" className="rounded-2xl bg-km-softgreen p-5 md:p-6">
          <h2 id="vragen" className="text-xl">
            Denk eens na over deze vragen
          </h2>
          <ul className="mt-3 ml-5 list-disc space-y-2 text-lg">
            {text.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="waarom" className="rounded-2xl border border-km-line bg-white p-5 md:p-6">
        <h2 id="waarom" className="text-xl">
          Waarom vragen we dit?
        </h2>
        {text.why.map((t) => (
          <p key={t} className="mt-2">
            {t}
          </p>
        ))}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stap 1: sterke punten                                               */
/* ------------------------------------------------------------------ */

function StrengthsStep() {
  const { addStrength, removeStrength, userName, currentUser, allowed } = useStore();
  const { strengths } = useProjectData();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const canManage = allowed("concepten.beheren");
  const mine = strengths.filter((s) => s.createdBy === currentUser.id);
  const others = strengths.filter((s) => s.createdBy !== currentUser.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("Beschrijf het sterke punt.");
    if (text.length > 300) return setError("Gebruik maximaal 300 tekens.");
    if (strengths.some((s) => s.text.trim().toLowerCase() === text.trim().toLowerCase())) return setError("Dit sterke punt staat er al.");
    setError(undefined);
    setBusy(true);
    const sent = text;
    // Alleen leegmaken als er intussen niets nieuws is getypt
    if (await notify.after(addStrength(sent), "Sterk punt toegevoegd")) setText((cur) => (cur === sent ? "" : cur));
    setBusy(false);
  };

  const item = (s: (typeof strengths)[number]) => (
    <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl bg-km-softgreen p-4">
      <div>
        <p className="flex items-start gap-2 text-lg">
          <Star className="mt-1 size-4 shrink-0 text-km-green" aria-hidden />
          {s.text}
        </p>
        {s.createdBy && s.createdBy !== currentUser.id && <p className="mt-1 ml-6 text-sm text-km-muted">{userName(s.createdBy)}</p>}
      </div>
      {(canManage || s.createdBy === currentUser.id) && (
        <ConfirmDialog
          title="Sterk punt verwijderen?"
          description={`‘${s.text}’ wordt verwijderd.`}
          confirmLabel="Verwijderen"
          destructive
          onConfirm={() => {
            void notify.after(removeStrength(s.id), "Sterk punt verwijderd");
          }}
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Verwijder sterk punt ‘${s.text}’`}>
              <Trash2 aria-hidden />
            </Button>
          }
        />
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <FormField label="Een sterk punt van het Haags Verhaal" hint="Bijvoorbeeld ‘We winnen snel het vertrouwen van gemeenschappen’." error={error}>
          {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} rows={2} />}
        </FormField>
        <PrimaryButton type="submit" className="self-start" disabled={busy} icon={<Plus aria-hidden />}>
          {busy ? "Bezig…" : STEPS[0].button}
        </PrimaryButton>
      </form>
      <section aria-labelledby="mijn-punten">
        <h3 id="mijn-punten" className="mb-3 text-xl">
          Jouw sterke punten ({mine.length})
        </h3>
        {mine.length === 0 ? <p className="text-km-muted">Je hebt nog geen sterke punten toegevoegd.</p> : <ul className="flex flex-col gap-2">{mine.map(item)}</ul>}
      </section>
      {others.length > 0 && (
        <section aria-labelledby="andere-punten">
          <h3 id="andere-punten" className="mb-3 text-xl">
            Sterke punten van anderen ({others.length})
          </h3>
          <ul className="flex flex-col gap-2">{others.map(item)}</ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stap 2: doelgroepen                                                 */
/* ------------------------------------------------------------------ */

function AudiencesStep() {
  const { userName, currentUser } = useStore();
  const { audiences, needs } = useProjectData();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col gap-8">
      <PrimaryButton className="self-start" onClick={() => setOpen(true)} icon={<Plus aria-hidden />}>
        {STEPS[1].button}
      </PrimaryButton>
      <AudienceDialog open={open} onOpenChange={setOpen} stay />
      <section aria-labelledby="doelgroepen-lijst">
        <h3 id="doelgroepen-lijst" className="mb-3 text-xl">
          Doelgroepen tot nu toe ({audiences.length})
        </h3>
        {audiences.length === 0 ? (
          <EmptyState as="h4" icon={Users} title="Nog geen doelgroepen" description="Voeg de eerste doelgroep toe." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {audiences.map((a) => {
              const n = needs.filter((x) => x.audienceId === a.id).length;
              return (
                <li key={a.id}>
                  <Link href={`/doelgroepen/${a.id}`} className="flex h-full flex-col gap-1 rounded-xl bg-km-softgreen p-4 hover:shadow-md">
                    <span className="font-heading text-lg font-bold text-km-green">{a.name}</span>
                    {a.description && <span className="line-clamp-2">{a.description}</span>}
                    <span className="mt-auto pt-2 text-sm text-km-muted">
                      {n === 1 ? "1 behoefte" : `${n} behoeften`}
                      {a.createdBy && ` · ${a.createdBy === currentUser.id ? "door jou" : userName(a.createdBy)}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stap 3: behoeften                                                   */
/* ------------------------------------------------------------------ */

function NeedsStep() {
  const { addNeed, removeNeed, currentUser, userName, allowed } = useStore();
  const { audiences, needs } = useProjectData();
  const [audienceId, setAudienceId] = React.useState<string>("");
  const [text, setText] = React.useState("");
  const [errors, setErrors] = React.useState<{ audience?: string; text?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const canManage = allowed("concepten.beheren");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = {
      audience: audienceId ? undefined : "Kies een doelgroep.",
      text: !text.trim() ? "Beschrijf de behoefte." : text.length > 300 ? "Gebruik maximaal 300 tekens." : undefined,
    };
    if (!errs.text && needs.some((n) => n.audienceId === audienceId && n.description.toLowerCase() === text.trim().toLowerCase())) {
      errs.text = "Deze behoefte staat er al.";
    }
    setErrors(errs);
    if (errs.audience || errs.text) return;
    setBusy(true);
    const sent = text;
    if (await notify.after(addNeed(audienceId, sent), "Behoefte toegevoegd")) setText((cur) => (cur === sent ? "" : cur));
    setBusy(false);
  };

  if (audiences.length === 0) {
    return (
      <>
        <EmptyState
          as="h3"
          icon={Users}
          title="Er zijn nog geen doelgroepen"
          description="Voeg eerst een doelgroep toe (stap 2). Daarna beschrijf je hier wat zij zoeken of missen."
          action={
            <Button variant="outline" onClick={() => setDialog(true)}>
              <Plus aria-hidden /> Voeg een doelgroep toe
            </Button>
          }
        />
        <AudienceDialog open={dialog} onOpenChange={setDialog} stay />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormField label="Doelgroep" error={errors.audience}>
          {(p) => (
            <Select value={audienceId} onValueChange={setAudienceId}>
              <SelectTrigger {...p} className="w-full sm:w-96">
                <SelectValue placeholder="Kies een doelgroep" />
              </SelectTrigger>
              <SelectContent>
                {audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <Button type="button" variant="link" className="-mt-3 self-start px-0" onClick={() => setDialog(true)}>
          Staat de doelgroep er niet bij? Voeg een doelgroep toe
        </Button>
        <AudienceDialog open={dialog} onOpenChange={setDialog} stay />
        <FormField label="Wat zoekt, mist of wil deze doelgroep?" hint="Bijvoorbeeld ‘Medewerkers meer met elkaar verbinden’." error={errors.text}>
          {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} rows={2} />}
        </FormField>
        <PrimaryButton type="submit" className="self-start" disabled={busy} icon={<Plus aria-hidden />}>
          {busy ? "Bezig…" : STEPS[2].button}
        </PrimaryButton>
      </form>

      <section aria-labelledby="behoeften-lijst">
        <h3 id="behoeften-lijst" className="mb-3 text-xl">
          Behoeften per doelgroep
        </h3>
        <ul className="flex flex-col gap-4">
          {audiences.map((a) => {
            const list = needs.filter((n) => n.audienceId === a.id);
            return (
              <li key={a.id} className="rounded-xl border border-km-line p-4">
                <Link href={`/doelgroepen/${a.id}`} className="font-heading text-lg font-bold text-km-green underline-offset-4 hover:underline">
                  {a.name}
                </Link>
                {list.length === 0 ? (
                  <p className="mt-1 text-km-muted">Nog geen behoeften.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {list.map((n) => (
                      <li key={n.id} className="flex items-start justify-between gap-3">
                        <span>
                          {n.description}
                          {n.createdBy && n.createdBy !== currentUser.id && <span className="text-sm text-km-muted"> · {userName(n.createdBy)}</span>}
                        </span>
                        {(canManage || n.createdBy === currentUser.id) && (
                          <ConfirmDialog
                            title="Behoefte verwijderen?"
                            description={`‘${n.description}’ wordt verwijderd.`}
                            confirmLabel="Verwijderen"
                            destructive
                            onConfirm={() => {
                              void notify.after(removeNeed(n.id), "Behoefte verwijderd");
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label={`Verwijder behoefte ‘${n.description}’`}>
                                <Trash2 aria-hidden />
                              </Button>
                            }
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stap 4: ideeën                                                      */
/* ------------------------------------------------------------------ */

function IdeasStep() {
  const { currentUser, state } = useStore();
  const { ideas, audiences } = useProjectData();
  const visible = ideas.filter((i) => !i.archived && (!i.pending || i.authorId === currentUser.id));
  const mine = visible.filter((i) => i.authorId === currentUser.id);
  const others = visible.filter((i) => i.authorId !== currentUser.id).slice(0, 6);
  const card = (idea: Idea) => (
    <li key={idea.id}>
      <IdeaCard
        idea={idea}
        audienceNames={audiences.filter((a) => idea.audienceIds.includes(a.id)).map((a) => a.name)}
        contributionCount={state.contributions.filter((c) => c.ideaId === idea.id && !c.hidden).length}
      />
    </li>
  );
  return (
    <div className="flex flex-col gap-8">
      <DoubtNote />
      <PrimaryButton href="/ideeen/nieuw?terug=/stappen/4" className="self-start" icon={<Plus aria-hidden />}>
        {STEPS[3].button}
      </PrimaryButton>
      <section aria-labelledby="mijn-ideeen">
        <h3 id="mijn-ideeen" className="mb-3 text-xl">
          Jouw ideeën ({mine.length})
        </h3>
        {mine.length === 0 ? (
          <p className="text-km-muted">Je hebt nog geen idee gedeeld.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">{mine.map(card)}</ul>
        )}
      </section>
      {others.length > 0 && (
        <section aria-labelledby="andere-ideeen">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 id="andere-ideeen" className="text-xl">
              Ideeën van anderen
            </h3>
            <Link href="/ideeen" className="inline-flex min-h-11 items-center gap-1 font-semibold text-km-green underline-offset-4 hover:underline">
              Alle ideeën <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="mb-3 text-km-muted">{MICROCOPY.addOn.text}</p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">{others.map(card)}</ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stap 5: kansen en bedreigingen                                      */
/* ------------------------------------------------------------------ */

function InsightsStep() {
  const { ideas } = useProjectData();
  const { insights } = useProjectData();
  const { userName } = useStore();
  const [ideaId, setIdeaId] = React.useState<string>("");
  const open = ideas.filter((i) => !i.archived && !i.pending);

  if (open.length === 0) {
    return (
      <EmptyState
        as="h3"
        icon={Lightbulb}
        title="Er zijn nog geen ideeën"
        description="Deel eerst een idee in stap 4. Daarna breng je hier kansen en bedreigingen in beeld."
        action={<PrimaryButton href="/stappen/4">Naar stap 4</PrimaryButton>}
      />
    );
  }

  const withInsights = open.filter((i) => insights.some((x) => x.ideaId === i.id));
  return (
    <div className="flex flex-col gap-8">
      <InsightForm
        ideaId={ideaId || undefined}
        submitLabel={STEPS[4].button}
        ideaPicker={(p) => (
          <Select value={ideaId} onValueChange={setIdeaId}>
            <SelectTrigger {...p} className="w-full">
              <SelectValue placeholder="Kies een idee" />
            </SelectTrigger>
            <SelectContent>
              {open.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {ideaId && (
        <section aria-labelledby="gekozen-idee" className="rounded-2xl bg-km-softgreen p-5">
          <h3 id="gekozen-idee" className="mb-3 text-xl">
            Al genoemd bij ‘{open.find((i) => i.id === ideaId)?.title}’
          </h3>
          <InsightList insights={insights.filter((x) => x.ideaId === ideaId)} headingLevel="h4" />
        </section>
      )}
      <section aria-labelledby="overzicht-inzichten">
        <h3 id="overzicht-inzichten" className="mb-3 text-xl">
          Overzicht per idee
        </h3>
        <ul className="flex flex-col gap-3">
          {open.map((i) => {
            const list = insights.filter((x) => x.ideaId === i.id);
            return (
              <li key={i.id} className="rounded-xl border border-km-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/ideeen/${i.id}`} className="font-heading text-lg font-bold text-km-green underline-offset-4 hover:underline">
                    {i.title}
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setIdeaId(i.id)}>
                    <Plus aria-hidden /> Toevoegen<span className="sr-only"> bij ‘{i.title}’</span>
                  </Button>
                </div>
                <p className="text-sm text-km-muted">Van {authorName(i, userName)}</p>
                {list.length === 0 ? (
                  <p className="mt-2 text-km-muted">Nog niets toegevoegd.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {list.map((x) => (
                      <li key={x.id} className="flex flex-wrap items-start gap-2">
                        <InsightBadge kind={x.kind} />
                        <span>{x.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {withInsights.length === 0 && <p className="mt-3 text-km-muted">Nog bij geen enkel idee kansen of bedreigingen. Jij kunt de eerste zijn.</p>}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stap 6: kiezen                                                      */
/* ------------------------------------------------------------------ */

function PicksStep() {
  const { ideas, insights, picks } = useProjectData();
  const { currentUser } = useStore();
  const [shown, setShown] = React.useState(false);
  const listRef = React.useRef<HTMLHeadingElement>(null);
  const open = ideas.filter((i) => !i.archived && !i.pending);
  const myPicks = picks.filter((p) => p.createdBy === currentUser.id);

  if (open.length === 0) {
    return (
      <EmptyState
        as="h3"
        icon={Lightbulb}
        title="Er zijn nog geen ideeën om te kiezen"
        description="Deel eerst een idee in stap 4."
        action={<PrimaryButton href="/stappen/4">Naar stap 4</PrimaryButton>}
      />
    );
  }

  // Meest gekozen ideeën eerst
  const sorted = [...open].sort(
    (a, b) => picks.filter((p) => p.ideaId === b.id).length - picks.filter((p) => p.ideaId === a.id).length || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="flex flex-col gap-6">
      {myPicks.length > 0 && (
        <p className="text-lg">
          Je hebt <strong>{myPicks.length}</strong> {myPicks.length === 1 ? "idee" : "ideeën"} gekozen.
        </p>
      )}
      {!shown ? (
        <PrimaryButton
          className="self-start"
          icon={<ArrowRight aria-hidden />}
          onClick={() => {
            setShown(true);
            requestAnimationFrame(() => listRef.current?.focus());
          }}
        >
          {STEPS[5].button}
        </PrimaryButton>
      ) : (
        <section aria-labelledby="kies-ideeen">
          <h3 id="kies-ideeen" ref={listRef} tabIndex={-1} className="mb-1 text-xl outline-none">
            Kies de ideeën met de meeste potentie ({open.length})
          </h3>
          <p className="mb-4 text-km-muted">Gebruik de vier aandachtspunten hierboven. Je kunt meerdere ideeën kiezen.</p>
          <ul className="flex flex-col gap-4">
            {sorted.map((idea) => (
              <PickRow
                key={idea.id}
                idea={idea}
                pickCount={picks.filter((p) => p.ideaId === idea.id).length}
                insightKinds={insights.filter((x) => x.ideaId === idea.id).map((x) => x.kind)}
                myPick={myPicks.find((p) => p.ideaId === idea.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PickRow({
  idea,
  pickCount,
  insightKinds,
  myPick,
}: {
  idea: Idea;
  pickCount: number;
  insightKinds: string[];
  myPick?: { nextStep: string };
}) {
  const { pickIdea, unpickIdea, userName } = useStore();
  const [editing, setEditing] = React.useState(false);
  const [nextStep, setNextStep] = React.useState(myPick?.nextStep ?? "");
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const count = (k: string) => insightKinds.filter((x) => x === k).length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStep.trim()) return setError("Wat zou de eerste vervolgstap kunnen zijn?");
    if (nextStep.length > 500) return setError("Gebruik maximaal 500 tekens.");
    setError(undefined);
    setBusy(true);
    const ok = await notify.after(pickIdea(idea.id, nextStep), myPick ? "Vervolgstap bijgewerkt" : "Idee gekozen");
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <li className={cn("rounded-2xl border p-5", myPick ? "border-2 border-km-green bg-km-softgreen" : "border-km-line bg-white")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/ideeen/${idea.id}`} className="font-heading text-xl font-bold text-km-green underline-offset-4 hover:underline">
            {idea.title}
          </Link>
          <p className="text-sm text-km-muted">Van {authorName(idea, userName)}</p>
        </div>
        {pickCount > 0 && (
          <span className="rounded-full bg-km-yellow px-3 py-1 text-sm font-bold text-km-text">
            {pickCount === 1 ? "1 keer gekozen" : `${pickCount} keer gekozen`}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-3">{idea.description}</p>
      {insightKinds.length > 0 && (
        <p className="mt-2 text-sm text-km-muted">
          {count("kans")} {count("kans") === 1 ? "kans" : "kansen"} · {count("bedreiging")} {count("bedreiging") === 1 ? "bedreiging" : "bedreigingen"} ·{" "}
          {count("vraag")} {count("vraag") === 1 ? "vraag" : "vragen"}
        </p>
      )}
      {idea.status === "te-onderzoeken" && <SelectedNote className="mt-3" />}

      {myPick && !editing ? (
        <div className="mt-4 flex flex-col gap-3">
          <p>
            <span className="font-semibold text-km-green">Jouw eerste vervolgstap:</span> {myPick.nextStep}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Vervolgstap wijzigen
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void notify.after(unpickIdea(idea.id), "Keuze ingetrokken")}>
              <X aria-hidden /> Keuze intrekken
            </Button>
          </div>
        </div>
      ) : editing ? (
        <form onSubmit={save} noValidate className="mt-4 flex flex-col gap-3">
          <FormField label="Wat zou de eerste vervolgstap kunnen zijn?" hint="Bijvoorbeeld een gesprek met een mogelijke opdrachtgever, een kennismaking met een partner of een kleine proefactiviteit." error={error}>
            {(p) => <Textarea {...p} value={nextStep} onChange={(e) => setNextStep(e.target.value)} rows={2} className="bg-white" />}
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              <Check aria-hidden /> {busy ? "Bezig…" : myPick ? "Bewaren" : "Kies dit idee"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Annuleren
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="mt-4" onClick={() => setEditing(true)}>
          <Star aria-hidden /> Kies dit idee<span className="sr-only"> ‘{idea.title}’</span>
        </Button>
      )}
    </li>
  );
}
