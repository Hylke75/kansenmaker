"use client";

import * as React from "react";
import { LayoutGrid, Lightbulb, List, Plus, StickyNote, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { PrimaryButton } from "@/components/km/primary-button";
import { FilterBar } from "@/components/km/filter-bar";
import { IdeaCard } from "@/components/km/idea-card";
import { EmptyState } from "@/components/km/empty-state";
import { RequireProject } from "@/components/km/guards";
import { STATUS_META, STATUSES, StatusBadge } from "@/components/km/status-badge";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import type { Idea } from "@/lib/types";

const PAGE_SIZE = 6;
type View = "kaarten" | "lijst" | "muur";

export function IdeasScreen() {
  return (
    <RequireProject>
      <IdeasInner />
    </RequireProject>
  );
}

function IdeasInner() {
  const { state, currentUser, allowed } = useStore();
  const { ideas, audiences } = useProjectData();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("alles");
  const [audience, setAudience] = React.useState("alle");
  const [sort, setSort] = React.useState("nieuw");
  const [view, setView] = React.useState<View>("kaarten");
  const [page, setPage] = React.useState(1);
  const listTop = React.useRef<HTMLHeadingElement>(null);

  const canModerate = allowed("bijdragen.modereren");
  const contribCount = (id: string) => state.contributions.filter((c) => c.ideaId === id && !c.hidden).length;
  const audienceNames = (idea: Idea) => audiences.filter((a) => idea.audienceIds.includes(a.id)).map((a) => a.name);

  // Ideeën die op goedkeuring wachten zijn alleen zichtbaar voor de auteur en moderatoren.
  const visible = ideas.filter((i) => !i.pending || canModerate || i.authorId === currentUser.id);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = visible.filter((i) => {
      if (status === "gearchiveerd") {
        if (!i.archived) return false;
      } else {
        if (i.archived) return false;
        if (status !== "alles" && i.status !== status) return false;
      }
      if (audience !== "alle" && !i.audienceIds.includes(audience)) return false;
      if (q && !`${i.title} ${i.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "oud") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "az") return a.title.localeCompare(b.title, "nl");
      if (sort === "bijdragen") return contribCount(b.id) - contribCount(a.id);
      return b.createdAt.localeCompare(a.createdAt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, status, audience, sort, state.contributions]);

  const filtersActive = query !== "" || status !== "alles" || audience !== "alle";
  const reset = () => {
    setQuery("");
    setStatus("alles");
    setAudience("alle");
    setPage(1);
  };
  const withReset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const paged = view === "muur" ? filtered : filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const goTo = (p: number) => {
    setPage(p);
    listTop.current?.focus();
  };

  const activeCount = visible.filter((i) => !i.archived).length;

  return (
    <>
      <PageHeader
        title="Ideeën"
        description="Ideeën verzamelen, aanvullen en combineren. Ieder idee mag nog onaf zijn."
        actions={
          <PrimaryButton href="/ideeen/nieuw" icon={<Plus aria-hidden />}>
            Deel een idee
          </PrimaryButton>
        }
      />

      {activeCount === 0 && !filtersActive ? (
        <EmptyState
          icon={Lightbulb}
          title="Nog geen ideeën in dit project"
          description="Deel het eerste idee. Een titel en een korte beschrijving zijn genoeg."
          action={<PrimaryButton href="/ideeen/nieuw">Deel een idee</PrimaryButton>}
        />
      ) : (
        <>
          <FilterBar
            search={{ value: query, onChange: withReset(setQuery), label: "Zoek in ideeën", placeholder: "Bijvoorbeeld ‘wandeling’" }}
            selects={[
              {
                id: "doelgroep",
                label: "Doelgroep",
                value: audience,
                onChange: withReset(setAudience),
                options: [{ value: "alle", label: "Alle doelgroepen" }, ...audiences.map((a) => ({ value: a.id, label: a.name }))],
              },
              {
                id: "sorteer",
                label: "Sorteren",
                value: sort,
                onChange: setSort,
                options: [
                  { value: "nieuw", label: "Nieuwste eerst" },
                  { value: "oud", label: "Oudste eerst" },
                  { value: "bijdragen", label: "Meeste bijdragen" },
                  { value: "az", label: "Titel A–Z" },
                ],
              },
            ]}
            chips={{
              label: "Filter op status",
              value: status,
              onChange: withReset(setStatus),
              options: [
                { value: "alles", label: "Alles" },
                ...STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
                { value: "gearchiveerd", label: "Gearchiveerd" },
              ],
            }}
            views={{
              label: "Weergave",
              value: view,
              onChange: (v) => setView(v as View),
              options: [
                { value: "kaarten", label: "Kaarten", icon: <LayoutGrid className="size-4" aria-hidden /> },
                { value: "lijst", label: "Lijst", icon: <List className="size-4" aria-hidden /> },
                { value: "muur", label: "Kansenmuur", icon: <StickyNote className="size-4" aria-hidden /> },
              ],
            }}
            resultText={`${pluralize(filtered.length, "idee", "ideeën")} gevonden`}
            onReset={filtersActive ? reset : undefined}
          />

          <h2 ref={listTop} tabIndex={-1} className="sr-only">
            Resultaten
          </h2>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="Geen ideeën gevonden"
              description="Probeer een andere zoekterm of wis de filters."
              action={
                <Button variant="outline" onClick={reset}>
                  Filters wissen
                </Button>
              }
            />
          ) : view === "kaarten" ? (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paged.map((idea) => (
                <li key={idea.id}>
                  <IdeaCard idea={idea} audienceNames={audienceNames(idea)} contributionCount={contribCount(idea.id)} />
                </li>
              ))}
            </ul>
          ) : view === "lijst" ? (
            <ul className="overflow-hidden rounded-2xl border border-km-line">
              {paged.map((idea) => (
                <li key={idea.id}>
                  <IdeaCard variant="row" idea={idea} audienceNames={audienceNames(idea)} contributionCount={contribCount(idea.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <OpportunityWall ideas={filtered} />
          )}

          {view !== "muur" && pages > 1 && (
            <nav aria-label="Paginering" className="mt-8 flex items-center justify-between gap-4">
              <Button variant="outline" onClick={() => goTo(current - 1)} disabled={current === 1}>
                <ChevronLeft aria-hidden />
                Vorige
              </Button>
              <p className="text-km-muted">
                Pagina {current} van {pages}
              </p>
              <Button variant="outline" onClick={() => goTo(current + 1)} disabled={current === pages}>
                Volgende
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

/** Kansenmuur — ideeën als briefjes, gegroepeerd per status. */
function OpportunityWall({ ideas }: { ideas: Idea[] }) {
  const groups = STATUSES.map((s) => ({ status: s, items: ideas.filter((i) => i.status === s && !i.archived) })).filter(
    (g) => g.items.length > 0,
  );
  const archived = ideas.filter((i) => i.archived);
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <section key={g.status} aria-label={STATUS_META[g.status].label} className="rounded-2xl bg-km-softgreen/60 p-4">
          <div className="mb-3">
            <StatusBadge status={g.status} />
          </div>
          <ul className="flex flex-col gap-3">
            {g.items.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/ideeen/${i.id}`}
                  className="block rounded-xl border border-[#ecd3a3] bg-[#fffaf0] p-4 shadow-sm transition-transform hover:-rotate-1"
                >
                  <span className="font-heading text-lg font-bold text-km-green">{i.title}</span>
                  <span className="mt-1 line-clamp-2 block text-sm">{i.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {archived.length > 0 && (
        <section aria-label="Gearchiveerd" className="rounded-2xl bg-white p-4 ring-1 ring-km-line">
          <div className="mb-3">
            <StatusBadge status="gearchiveerd" />
          </div>
          <ul className="flex flex-col gap-3">
            {archived.map((i) => (
              <li key={i.id}>
                <Link href={`/ideeen/${i.id}`} className="block rounded-xl border border-km-line p-4">
                  <span className="font-heading text-lg font-bold text-km-green">{i.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
