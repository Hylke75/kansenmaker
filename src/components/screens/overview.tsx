"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, CalendarClock, CheckSquare, Layers, Lightbulb, Presentation, Users, Inbox } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PrimaryButton } from "@/components/km/primary-button";
import { IdeaCard } from "@/components/km/idea-card";
import { EmptyState } from "@/components/km/empty-state";
import { FormField, ErrorSummary } from "@/components/km/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/km/guards";
import { ProfileForm } from "@/components/km/profile-dialog";
import { useNextStep, useStepProgress } from "@/components/km/step-progress";
import { STEPS } from "@/lib/steps";

export function OverviewScreen() {
  const { project, projectReady } = useStore();
  if (!project) return <StartScreen />;
  if (!projectReady) return <LoadingState />;
  return <ProjectOverview />;
}

/** Vraagt om een naam zolang die nog niet is ingevuld (anderen zien anders alleen je e-mailnaam). */
function NamePrompt() {
  const { currentUser, updateProfile } = useStore();
  if (!currentUser.nameMissing) return null;
  return (
    <section aria-labelledby="naam" className="rounded-2xl bg-km-softgreen p-6">
      <h2 id="naam" className="text-2xl">Hoe heet je?</h2>
      <p className="mt-1 mb-4">Andere deelnemers zien je naam bij je ideeën en bijdragen.</p>
      <div className="max-w-md">
        <ProfileForm initialName="" initialOrg={currentUser.organisation ?? ""} save={updateProfile} submitLabel="Naam bewaren" />
      </div>
    </section>
  );
}

/** De zes stappen als kaarten: naam, kernvraag, doel en eigen voortgang. */
function StepsOverview() {
  const progress = useStepProgress();
  const { step: next } = useNextStep();
  return (
    <section aria-labelledby="stappen">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="stappen" className="text-2xl md:text-3xl">
            De zes stappen van De Kansenmaker
          </h2>
          <p className="mt-1 text-lg">Van wat ons bijzonder maakt naar ideeën die een volgende stap verdienen.</p>
        </div>
        <Link href="/hoe-werkt-het" className="inline-flex min-h-11 items-center gap-1 font-semibold text-km-green underline-offset-4 hover:underline">
          Hoe werkt het? <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => {
          const { done, count } = progress[i];
          const isNext = next?.number === s.number;
          return (
            <li key={s.number}>
              <Link
                href={`/stappen/${s.number}`}
                className={cn(
                  "group flex h-full flex-col rounded-2xl p-6 transition-shadow hover:shadow-md",
                  isNext ? "border-2 border-km-green bg-white" : "bg-km-softgreen",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full font-heading text-lg font-bold",
                      done ? "bg-km-green text-white" : "bg-white text-km-green ring-2 ring-km-green",
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="size-5" /> : s.number}
                  </span>
                  <span className="text-sm font-semibold text-km-muted">
                    {done ? "Gedaan" : isNext ? "Volgende stap" : count > 0 ? "Bezig" : ""}
                  </span>
                </span>
                <span className="mt-4 text-sm font-semibold text-km-muted">Stap {s.number}</span>
                <span className="font-heading text-xl font-bold text-km-green">{s.short}</span>
                <span className="mt-1 font-semibold">{s.headline}</span>
                <span className="mt-3 text-km-text">
                  <span className="font-semibold">Doel:</span> {s.goal}
                </span>
                <span className="sr-only">{done ? " (gedaan)" : isNext ? " (volgende stap)" : ""}</span>
                <ArrowRight className="mt-auto ml-auto size-5 pt-0 text-km-green transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Hoofdactie: de eerstvolgende stap van de route. */
function NextStepIntro() {
  const { doneCount, step, href, label } = useNextStep();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg">
        {doneCount === 0
          ? "We beginnen bij wat het Haags Verhaal bijzonder maakt. Daarna ontdekken we samen doelgroepen, behoeften en nieuwe ideeën."
          : doneCount === 6
            ? "Je hebt alle zes stappen doorlopen. Je kunt altijd terugkomen om meer toe te voegen of op anderen te reageren."
            : `Je hebt ${doneCount} van de 6 stappen gedaan. Ga verder waar je gebleven bent.`}
      </p>
      <PrimaryButton href={href} size="lg" className="self-start" icon={<ArrowRight aria-hidden />}>
        {step ? `${label}: ${step.short}` : label}
      </PrimaryButton>
    </div>
  );
}

function ProjectOverview() {
  const { project, state, currentUser, userName } = useStore();
  const today = useToday();
  const { ideas, audiences, concepts, sessions, activities } = useProjectData();
  const visibleIdeas = ideas.filter((i) => !i.archived && !i.pending);
  const recent = [...visibleIdeas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const myActions = state.actions
    .filter((a) => a.ownerId === currentUser.id && a.status !== "klaar")
    .filter((a) => (a.conceptId ? concepts.some((c) => c.id === a.conceptId) : sessions.some((s) => s.id === a.sessionId)))
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  const mySessions = sessions.filter(
    (s) => s.state !== "afgesloten" && (s.participantIds.includes(currentUser.id) || s.facilitatorId === currentUser.id),
  );

  const navCards = [
    { href: "/ideeen", title: "Ideeën", text: "Bekijk en vul aan", Icon: Lightbulb, count: pluralize(visibleIdeas.length, "idee", "ideeën") },
    { href: "/doelgroepen", title: "Doelgroepen", text: "Ontdek behoeften", Icon: Users, count: pluralize(audiences.length, "doelgroep", "doelgroepen") },
    { href: "/concepten", title: "Concepten", text: "Werk ideeën uit", Icon: Layers, count: pluralize(concepts.length, "concept", "concepten") },
    { href: "/sessies", title: "Sessies", text: "Denk samen verder", Icon: Presentation, count: pluralize(sessions.filter((s) => s.state !== "afgesloten").length, "komende sessie", "komende sessies") },
  ];

  return (
    <div className="flex flex-col gap-14">
      <NamePrompt />
      <section aria-labelledby="welkom" className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-km-muted">HAAGS VERHAAL</p>
          <h1 id="welkom" className="mt-2 text-4xl md:text-6xl">De Kansenmaker</h1>
          <p className="mt-4 max-w-2xl text-xl">Samen ontdekken we nieuwe mogelijkheden.</p>
          <p className="mt-2 text-km-muted">
            Je werkt in <strong className="text-km-green">{project!.name}</strong>
          </p>
        </div>
        <NextStepIntro />
      </section>

      <StepsOverview />

      <nav aria-label="Onderdelen">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {navCards.map(({ href, title, text, Icon, count }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl bg-km-softgreen p-6 transition-shadow hover:shadow-md"
              >
                <Icon className="size-7 text-km-green" aria-hidden />
                <span className="mt-6 font-heading text-2xl font-bold text-km-green">{title}</span>
                <span className="mt-1 text-km-text">{text}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-km-muted">
                  {count}
                  <ArrowRight className="ml-auto size-5 text-km-green transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="recent">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="recent" className="text-2xl md:text-3xl">Recent toegevoegd</h2>
          <Link href="/ideeen" className="inline-flex min-h-11 items-center gap-1 font-semibold text-km-green underline-offset-4 hover:underline">
            Alle ideeën <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            as="h3"
            icon={Lightbulb}
            title="Nog geen ideeën in dit project"
            description="Ideeën bedenken we in stap 4, als we weten waar we sterk in zijn en wat doelgroepen zoeken."
            action={
              <Button asChild variant="outline">
                <Link href="/stappen/4">Naar stap 4: Nieuwe ideeën</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((idea) => (
              <li key={idea.id}>
                <IdeaCard
                  idea={idea}
                  audienceNames={audiences.filter((a) => idea.audienceIds.includes(a.id)).map((a) => a.name)}
                  contributionCount={state.contributions.filter((c) => c.ideaId === idea.id && !c.hidden).length}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-labelledby="acties">
          <h2 id="acties" className="mb-4 text-2xl">Mijn openstaande acties</h2>
          {myActions.length === 0 ? (
            <EmptyState as="h3" icon={CheckSquare} title="Geen openstaande acties" description="Acties die aan jou zijn toegewezen verschijnen hier." />
          ) : (
            <ul className="flex flex-col divide-y divide-km-line rounded-2xl border border-km-line bg-white">
              {myActions.map((a) => {
                const concept = concepts.find((c) => c.id === a.conceptId);
                const overdue = !!today && !!a.deadline && a.deadline < today;
                return (
                  <li key={a.id} className="flex flex-col gap-1 p-4">
                    <Link href={concept ? `/concepten/${concept.id}?tab=acties` : "/sessies"} className="font-semibold text-km-green underline-offset-4 hover:underline">
                      {a.description}
                    </Link>
                    <span className="text-sm text-km-muted">
                      {concept ? `Concept: ${concept.name}` : "Sessie"}
                      {a.deadline && (
                        <>
                          {" · "}
                          <span className={cn(overdue && "font-semibold text-km-danger")}>
                            {overdue ? "Te laat: " : "Uiterlijk "}
                            {formatDate(a.deadline)}
                          </span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="uitnodigingen">
          <h2 id="uitnodigingen" className="mb-4 text-2xl">Uitnodigingen voor sessies</h2>
          {mySessions.length === 0 ? (
            <EmptyState as="h3" icon={CalendarClock} title="Geen sessies gepland" description="Zodra je wordt uitgenodigd voor een werksessie, zie je die hier." />
          ) : (
            <ul className="flex flex-col gap-3">
              {mySessions.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-km-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-km-green">{s.title}</p>
                    <p className="text-sm text-km-muted">
                      {s.state === "actief" ? "Nu bezig" : formatDateTime(s.date)} · {s.location} · begeleid door {userName(s.facilitatorId)}
                    </p>
                  </div>
                  <Button asChild variant={s.state === "actief" ? "default" : "outline"} className="shrink-0">
                    <Link href={s.state === "actief" ? `/sessie/${s.id}` : `/sessies/${s.id}`}>
                      {s.state === "actief" ? "Doe mee" : "Bekijk"}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="activiteit">
        <h2 id="activiteit" className="mb-4 text-2xl">Recente activiteit</h2>
        {activities.length === 0 ? (
          <p className="text-km-muted">Nog geen activiteit.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activities.slice(0, 6).map((a) => (
              <li key={a.id} className="flex flex-col sm:flex-row sm:gap-4">
                <span className="w-44 shrink-0 text-sm text-km-muted">{formatDateTime(a.at)}</span>
                <Link href={a.href} className="text-km-text underline-offset-4 hover:text-km-green hover:underline">
                  {a.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Startscherm voor een gebruiker zonder projecten — geen leeg dashboard. */
function StartScreen() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const errorRef = React.useRef<HTMLDivElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (token) {
      router.push(`/uitnodiging/${token.toLowerCase()}`);
      return;
    }
    setErrors([code.trim() ? "Dit lijkt geen geldige uitnodigingslink of -code. Kopieer de volledige link uit je uitnodiging." : "Vul de uitnodigingscode of -link in."]);
    requestAnimationFrame(() => errorRef.current?.focus());
  };
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 py-6">
      <NamePrompt />
      <div>
        <p className="text-sm font-bold tracking-[0.18em] text-km-muted">HAAGS VERHAAL</p>
        <h1 className="mt-2 text-4xl md:text-5xl">Welkom bij De Kansenmaker</h1>
        <p className="mt-4 text-xl">Samen ontdekken we nieuwe mogelijkheden voor ontmoeting en verbinding in Den Haag.</p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-3">
        {[
          ["Ontdek", "Wie zijn de doelgroepen en wat hebben ze nodig?"],
          ["Bedenk", "Deel ideeën en vul die van anderen aan."],
          ["Werk uit", "Maak van kansrijke ideeën een concreet concept."],
        ].map(([t, d], i) => (
          <li key={t} className="rounded-2xl bg-km-softgreen p-5">
            <span className="font-heading text-sm font-bold text-km-muted">Stap {i + 1}</span>
            <p className="font-heading text-xl font-bold text-km-green">{t}</p>
            <p className="mt-1">{d}</p>
          </li>
        ))}
      </ol>
      <section aria-labelledby="uitnodiging" className="rounded-2xl border border-km-line bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <Inbox className="size-6 text-km-green" aria-hidden />
          <h2 id="uitnodiging" className="text-2xl">Heb je een uitnodiging?</h2>
        </div>
        <p className="mb-4">Je doet mee via een uitnodiging van een begeleider of beheerder. Plak hieronder je uitnodigingslink of code.</p>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <ErrorSummary ref={errorRef} errors={errors} />
          <FormField label="Uitnodigingscode of link" error={errors[0]}>
            {(p) => <Input {...p} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />}
          </FormField>
          <Button type="submit" className="self-start">
            Doe mee
          </Button>
        </form>
      </section>
    </div>
  );
}
