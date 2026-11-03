"use client";

import * as React from "react";
import { Layers, Plus } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { FilterBar } from "@/components/km/filter-bar";
import { ConceptCard } from "@/components/km/concept-card";
import { EmptyState } from "@/components/km/empty-state";
import { RequireProject } from "@/components/km/guards";
import { ConceptCreateDialog } from "@/components/km/concept-create-dialog";
import { STATUS_META, STATUSES } from "@/components/km/status-badge";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import { assessmentOutcome } from "@/components/km/assessment-outcome";

export function ConceptsScreen() {
  return (
    <RequireProject>
      <Inner />
    </RequireProject>
  );
}

function Inner() {
  const { state, allowed, userName } = useStore();
  const { concepts, audiences } = useProjectData();
  const [status, setStatus] = React.useState("alles");
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [sort, setSort] = React.useState("kansrijk");
  const canManage = allowed("concepten.beheren");

  /** Hoe kansrijk volgens de realiteitstoets: aannemelijk telt mee, obstakels zwaar tegen, onbekend licht tegen. */
  const score = (c: (typeof concepts)[number]) => {
    const n = assessmentOutcome(c.assessment).counts;
    return n.aannemelijk * 2 - n.obstakel * 3 - n.onbekend - n.open * 0.5;
  };
  const filtered = concepts
    .filter(
      (c) =>
        (status === "alles" || c.status === status) &&
        `${c.name} ${c.description}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name, "nl") : sort === "kansrijk" ? score(b) - score(a) : 0));
  const active = status !== "alles" || query !== "";

  return (
    <>
      <PageHeader
        title="Concepten"
        description="Kansrijke ideeën uitwerken: kansen en risico’s, haalbaarheid, onderzoek en acties."
        actions={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Plus aria-hidden />
              Nieuw concept
            </Button>
          )
        }
      />
      {concepts.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nog geen concepten"
          description={
            canManage
              ? "Combineer één of meer ideeën tot een eerste concept."
              : "Zodra een redacteur of begeleider ideeën uitwerkt, verschijnen de concepten hier."
          }
          action={canManage && <Button onClick={() => setOpen(true)}>Nieuw concept</Button>}
        />
      ) : (
        <>
          <FilterBar
            search={{ value: query, onChange: setQuery, label: "Zoek in concepten" }}
            selects={[
              {
                id: "sorteer",
                label: "Sorteren",
                value: sort,
                onChange: setSort,
                options: [
                  { value: "kansrijk", label: "Meest kansrijk (realiteitstoets)" },
                  { value: "nieuw", label: "Nieuwste eerst" },
                  { value: "az", label: "Naam A–Z" },
                ],
              },
            ]}
            chips={{
              label: "Filter op status",
              value: status,
              onChange: setStatus,
              options: [
                { value: "alles", label: "Alles" },
                ...STATUSES.map((s) => ({ value: s, label: `${STATUS_META[s].label} (${concepts.filter((c) => c.status === s).length})` })),
              ],
            }}
            resultText={`${pluralize(filtered.length, "concept", "concepten")} gevonden`}
            onReset={active ? () => { setStatus("alles"); setQuery(""); } : undefined}
          />
          {filtered.length === 0 ? (
            <EmptyState icon={Layers} title="Geen concepten gevonden" description="Kies een andere status of wis de filters." />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <li key={c.id}>
                  <ConceptCard
                    headingLevel="h2"
                    concept={c}
                    ownerName={userName(c.ownerId)}
                    audienceNames={audiences.filter((a) => c.audienceIds.includes(a.id)).map((a) => a.name)}
                    openActions={state.actions.filter((a) => a.conceptId === c.id && a.status !== "klaar").length}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ConceptCreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
