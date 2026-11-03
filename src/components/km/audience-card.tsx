import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import type { Audience } from "@/lib/types";
import { pluralize } from "@/lib/format";
import { Tag } from "./status-badge";

interface AudienceCardProps {
  audience: Audience;
  needCount: number;
  ideaCount: number;
  conceptCount: number;
  headingLevel?: "h2" | "h3";
}

/** AudienceCard — doelgroep met aantallen behoeften, ideeën en concepten. */
export function AudienceCard({ audience, needCount, ideaCount, conceptCount, headingLevel: H = "h3" }: AudienceCardProps) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl bg-km-softgreen p-6 transition-shadow focus-within:ring-3 focus-within:ring-km-green hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-km-green">
          <Users className="size-5" aria-hidden />
        </span>
        <Tag className="bg-white">{audience.category}</Tag>
      </div>
      <H className="text-xl">
        <Link href={`/doelgroepen/${audience.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {audience.name}
        </Link>
      </H>
      <p className="mt-2 flex-1 text-km-text">{audience.description}</p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-km-green">
        <li>{pluralize(needCount, "behoefte", "behoeften")}</li>
        <li>{pluralize(ideaCount, "idee", "ideeën")}</li>
        <li>{pluralize(conceptCount, "concept", "concepten")}</li>
      </ul>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-km-green group-hover:underline">
        Bekijk behoeften
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </article>
  );
}
