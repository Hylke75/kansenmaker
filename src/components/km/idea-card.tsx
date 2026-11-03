import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import type { Idea } from "@/lib/types";
import { StatusBadge, Tag } from "./status-badge";
import { cn } from "@/lib/utils";

interface IdeaCardProps {
  idea: Idea;
  audienceNames: string[];
  contributionCount?: number;
  /** Compacte rij voor de lijstweergave */
  variant?: "card" | "row";
  headingLevel?: "h2" | "h3";
  className?: string;
  /** Selectiemodus: selectievakje boven de kaart */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

/**
 * IdeaCard — de hele kaart is klikbaar via één link (de titel) met een
 * uitgerekt klikvlak; zo is er één tabstop per kaart.
 */
export function IdeaCard({
  idea,
  audienceNames,
  contributionCount = 0,
  variant = "card",
  headingLevel: H = "h3",
  className,
  selectable,
  selected,
  onToggle,
}: IdeaCardProps) {
  const select = selectable && (
    <label
      className={cn(
        "relative z-10 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold",
        selected ? "bg-km-green text-white" : "bg-km-softgreen text-km-green",
      )}
    >
      <input type="checkbox" checked={!!selected} onChange={onToggle} className="size-5 accent-km-green" />
      Selecteer<span className="sr-only"> ‘{idea.title}’</span>
    </label>
  );
  const statusEl = idea.archived ? (
    <StatusBadge status="gearchiveerd" />
  ) : idea.pending ? (
    <StatusBadge status="wacht-op-goedkeuring" />
  ) : (
    <StatusBadge status={idea.status} />
  );

  if (variant === "row") {
    return (
      <article className={cn("relative flex flex-col gap-2 border-b border-km-line bg-white px-4 py-4 last:border-b-0 focus-within:bg-km-offwhite hover:bg-km-offwhite sm:flex-row sm:items-center sm:gap-4", selected && "bg-km-softgreen", className)}>
        {select}
        <H className="min-w-0 flex-1 text-lg">
          <Link href={`/ideeen/${idea.id}`} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none">
            {idea.title}
          </Link>
        </H>
        <div className="flex flex-wrap items-center gap-2">
          {audienceNames.map((n) => (
            <Tag key={n}>{n}</Tag>
          ))}
          {statusEl}
          <span className="inline-flex items-center gap-1 text-sm text-km-muted">
            <MessageSquare className="size-4" aria-hidden />
            {contributionCount}
            <span className="sr-only">bijdragen</span>
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-km-line bg-white p-6 transition-shadow focus-within:ring-3 focus-within:ring-km-green hover:shadow-md",
        selected && "border-km-green ring-2 ring-km-green",
        className,
      )}
    >
      {select && <div className="mb-3">{select}</div>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {audienceNames.map((n) => (
          <Tag key={n}>{n}</Tag>
        ))}
        {statusEl}
      </div>
      <H className="text-xl">
        <Link href={`/ideeen/${idea.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {idea.title}
        </Link>
      </H>
      <p className="mt-2 line-clamp-3 flex-1 text-km-text">{idea.description}</p>
      <div className="mt-6 flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-km-green group-hover:underline">
          Bekijk het idee en de bijdragen
          <ArrowRight className="size-4" aria-hidden />
        </span>
        <span className="inline-flex items-center gap-1 text-km-muted">
          <MessageSquare className="size-4" aria-hidden />
          {contributionCount}
          <span className="sr-only">bijdragen</span>
        </span>
      </div>
    </article>
  );
}
