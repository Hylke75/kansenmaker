"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, HelpCircle, ListPlus } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { NotInProject, RequireProject } from "@/components/km/guards";
import { AssessmentControl } from "@/components/km/assessment-control";
import { assessmentOutcome } from "@/components/km/assessment-outcome";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_QUESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function RealityCheckScreen({ id }: { id: string }) {
  return (
    <RequireProject>
      <Inner id={id} />
    </RequireProject>
  );
}

const TONE = {
  leeg: { cls: "bg-white ring-1 ring-km-line", Icon: HelpCircle },
  onbekend: { cls: "bg-km-warning-soft text-km-warning-text", Icon: HelpCircle },
  obstakel: { cls: "bg-km-danger-soft text-km-danger", Icon: CircleAlert },
  aannemelijk: { cls: "bg-[#dcefe4] text-[#0c5536]", Icon: CircleCheck },
};

function Inner({ id }: { id: string }) {
  const { allowed, setAssessment, addResearch } = useStore();
  const { concepts } = useProjectData();
  const concept = concepts.find((c) => c.id === id);
  if (!concept) return <NotInProject kind="concept" backHref="/concepten" backLabel="Naar alle concepten" />;
  const canEdit = allowed("concepten.beheren");
  const outcome = assessmentOutcome(concept.assessment);
  const { Icon } = TONE[outcome.tone];

  const unknown = ASSESSMENT_QUESTIONS.filter((q) => concept.assessment[q.id] === "onbekend");
  const toCreate = unknown.filter((q) => !concept.research.some((r) => r.assumption === q.label));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: `/concepten/${concept.id}`, label: `Terug naar ${concept.name}` }}
        eyebrow={concept.name}
        title="Realiteitstoets"
        description="Beoordeel wat we al weten. Een vraagteken betekent dat we het nog moeten onderzoeken."
      />
      {!canEdit && (
        <p className="mb-6 rounded-xl bg-white p-4 ring-1 ring-km-line">
          Je kunt de beoordeling bekijken. Alleen redacteuren, begeleiders en beheerders kunnen hem wijzigen.
        </p>
      )}
      <div className="flex flex-col gap-4">
        {ASSESSMENT_QUESTIONS.map((q) => (
          <AssessmentControl
            key={q.id}
            question={q.label}
            help={q.help}
            value={concept.assessment[q.id]}
            disabled={!canEdit}
            onChange={(v) => setAssessment(concept.id, q.id, v)}
          />
        ))}
      </div>

      <section aria-labelledby="uitkomst" className={cn("mt-8 rounded-2xl p-6", TONE[outcome.tone].cls)}>
        <h2 id="uitkomst" className="text-xl text-inherit">
          Uitkomst
        </h2>
        <div role="status" aria-live="polite" className="mt-2 flex items-start gap-3">
          <Icon className="mt-1 size-6 shrink-0" aria-hidden />
          <div>
            <p className="text-lg font-bold">{outcome.title}</p>
            <p>{outcome.text}</p>
            <p className="mt-2 text-sm">
              {outcome.counts.aannemelijk} aannemelijk · {outcome.counts.onbekend} onbekend · {outcome.counts.obstakel} obstakel
              {outcome.counts.open > 0 && ` · ${outcome.counts.open} nog niet beoordeeld`}
            </p>
          </div>
        </div>
        {canEdit && toCreate.length > 0 && (
          <Button
            className="mt-5"
            onClick={() => {
              void notify.after(
                addResearch(
                  concept.id,
                  toCreate.map((q) => ({ assumption: q.label, method: "", status: "open" as const })),
                ),
                `${toCreate.length} onderzoeksvra${toCreate.length === 1 ? "ag" : "gen"} toegevoegd`,
              );
            }}
          >
            <ListPlus aria-hidden />
            Maak onderzoeksvragen van de onbekende punten
          </Button>
        )}
        {unknown.length > 0 && toCreate.length === 0 && (
          <Link href={`/concepten/${concept.id}?tab=onderzoek`} className="mt-4 inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4">
            Bekijk de onderzoeksvragen <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </section>
      <p className="mt-6 text-km-muted">
        Deze beoordeling is geen automatische goedkeuring. De beheerder bepaalt of een concept verdergaat.
      </p>
    </div>
  );
}
