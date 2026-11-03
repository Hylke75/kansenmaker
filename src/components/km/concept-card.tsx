import Link from "next/link";
import { ArrowRight, Lightbulb, UserRound } from "lucide-react";
import type { Concept } from "@/lib/types";
import { pluralize } from "@/lib/format";
import { assessmentOutcome } from "./assessment-outcome";
import { StatusBadge, Tag } from "./status-badge";

interface ConceptCardProps {
  concept: Concept;
  ownerName: string;
  audienceNames: string[];
  openActions: number;
  headingLevel?: "h2" | "h3";
}

/** ConceptCard — concept met status, eigenaar, doelgroepen en openstaande acties. */
export function ConceptCard({ concept, ownerName, audienceNames, openActions, headingLevel: H = "h3" }: ConceptCardProps) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-km-line bg-white p-6 transition-shadow focus-within:ring-3 focus-within:ring-km-green hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={concept.status} />
        {audienceNames.map((n) => (
          <Tag key={n}>{n}</Tag>
        ))}
      </div>
      <H className="text-xl">
        <Link href={`/concepten/${concept.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {concept.name}
        </Link>
      </H>
      <p className="mt-2 line-clamp-3 flex-1">{concept.description}</p>
      <dl className="mt-4 grid gap-1 text-sm text-km-muted">
        <div className="flex items-center gap-2">
          <dt>
            <UserRound className="size-4" aria-hidden />
            <span className="sr-only">Eigenaar</span>
          </dt>
          <dd>{ownerName}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt>
            <Lightbulb className="size-4" aria-hidden />
            <span className="sr-only">Gebaseerd op</span>
          </dt>
          <dd>
            {pluralize(concept.ideaIds.length, "idee", "ideeën")} · {pluralize(openActions, "open actie", "open acties")}
          </dd>
        </div>
      </dl>
      <AssessmentSummary concept={concept} />
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-km-green group-hover:underline">
        Open concept
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </article>
  );
}

/** Korte samenvatting van de realiteitstoets: tekst + aantallen, nooit alleen kleur. */
function AssessmentSummary({ concept }: { concept: Concept }) {
  const o = assessmentOutcome(concept.assessment);
  if (o.tone === "leeg") return <p className="mt-3 text-sm text-km-muted">Realiteitstoets: nog niet beoordeeld</p>;
  const tone =
    o.tone === "obstakel" ? "text-km-danger" : o.tone === "onbekend" ? "text-km-warning-text" : "text-[#0c5536]";
  return (
    <p className="mt-3 text-sm">
      <span className="text-km-muted">Realiteitstoets: </span>
      <span className={`font-semibold ${tone}`}>{o.title.toLowerCase()}</span>
      <span className="block text-km-muted">
        <span aria-hidden>✓</span> {o.counts.aannemelijk} aannemelijk · <span aria-hidden>?</span> {o.counts.onbekend} onbekend ·{" "}
        <span aria-hidden>×</span> {o.counts.obstakel} obstakel
      </span>
    </p>
  );
}
